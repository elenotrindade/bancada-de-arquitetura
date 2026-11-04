'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, ConnectionLineType, ConnectionMode, MarkerType, MiniMap, ReactFlow, SelectionMode,
  useReactFlow, type OnConnectEnd, type OnNodeDrag, type OnSelectionChangeParams
} from '@xyflow/react';
import { CATALOG, groupOf, type ComponentKind } from '@/lib/catalog';
import { uid } from '@/lib/boards';
import { fileToImage } from '@/lib/image';
import type { Prefs } from '@/lib/prefs';
import { sizeOf, useBoard } from '@/lib/store';
import type { AppEdge, AppNode, Tool } from '@/lib/types';
import ArchEdge, { CommOptions } from './edges/ArchEdge';
import ComponentNode from './nodes/ComponentNode';
import FrameNode from './nodes/FrameNode';
import ImageNode from './nodes/ImageNode';
import NoteNode from './nodes/NoteNode';
import TextNode from './nodes/TextNode';
import Toolbar from './Toolbar';
import ZoomBar from './ZoomBar';

const nodeTypes = { component: ComponentNode, note: NoteNode, text: TextNode, frame: FrameNode, image: ImageNode };
const edgeTypes = { arch: ArchEdge };
const MARKER = { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#7E8D94' };
const DRAG_MIME = 'application/x-bancada-component';

const isTyping = (el: Element | null) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable);

const PLACE_HINT: Partial<Record<Tool, string>> = {
  note: 'Clique no quadro para colocar a nota',
  text: 'Clique no quadro para colocar o texto',
  frame: 'Clique no quadro para colocar a área'
};

type Props = { prefs: Prefs; setPrefs: (p: Prefs) => void; notify: (m: string) => void };

export default function Canvas({ prefs, setPrefs, notify }: Props) {
  const nodes = useBoard(s => s.nodes);
  const edges = useBoard(s => s.edges);
  const tool = useBoard(s => s.tool);
  const loaded = useBoard(s => s.loaded);
  const boardId = useBoard(s => s.id);
  const onNodesChange = useBoard(s => s.onNodesChange);
  const onEdgesChange = useBoard(s => s.onEdgesChange);
  const onConnect = useBoard(s => s.onConnect);
  const rf = useReactFlow<AppNode, AppEdge>();
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const frameDrag = useRef<{ start: Map<string, { x: number; y: number }>; children: Map<string, { x: number; y: number; frame: string }> } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const noteColor = useRef('amarelo');

  const rfEdges = useMemo(() => edges.map(e => ({ ...e, markerEnd: MARKER })), [edges]);

  /* posição de referência: ponteiro sobre o quadro ou centro da tela */
  const anchor = useCallback(() => {
    const r = wrapRef.current?.getBoundingClientRect();
    const p = pointer.current;
    if (p && r && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) return rf.screenToFlowPosition(p);
    if (!r) return { x: 0, y: 0 };
    return rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }, [rf]);

  /* ajusta a câmera ao trocar de quadro */
  useEffect(() => {
    if (!loaded) return;
    const vp = useBoard.getState().viewport;
    const t = setTimeout(() => {
      if (vp) rf.setViewport(vp);
      else rf.fitView({ padding: 0.2, maxZoom: 1 });
    }, 30);
    return () => clearTimeout(t);
  }, [boardId, loaded, rf]);

  const addComponentAt = useCallback((kind: ComponentKind, at?: { x: number; y: number }) => {
    const p = at ?? anchor();
    useBoard.getState().addComponent(kind, { x: p.x - 100, y: p.y - 35 });
  }, [anchor]);

  const addImages = useCallback(async (files: File[], at?: { x: number; y: number }) => {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;
    let p = at ?? anchor();
    for (const f of imgs) {
      try {
        const { src, ratio } = await fileToImage(f);
        let w = 320, h = Math.round(320 * ratio);
        if (h > 480) { h = 480; w = Math.round(480 / ratio); }
        useBoard.getState().addNode({ id: 'i' + uid(), type: 'image', position: { x: p.x - w / 2, y: p.y - h / 2 }, width: w, height: h, data: { src, caption: '', ratio } });
        p = { x: p.x + 32, y: p.y + 32 };
      } catch (e) {
        notify((e as Error).message);
      }
    }
  }, [anchor, notify]);

  const placeAt = useCallback((t: Tool, p: { x: number; y: number }) => {
    useBoard.getState().setTool('select');
    const add = useBoard.getState().addNode;
    if (t === 'note') add({ id: 'n' + uid(), type: 'note', position: { x: p.x - 100, y: p.y - 80 }, width: 200, height: 160, data: { text: '', color: noteColor.current } }, { edit: true });
    if (t === 'text') add({ id: 't' + uid(), type: 'text', position: { x: p.x - 120, y: p.y - 20 }, width: 240, height: 44, data: { text: '', size: 'm' } }, { edit: true });
    if (t === 'frame') add({ id: 'f' + uid(), type: 'frame', position: { x: p.x - 260, y: p.y - 170 }, width: 520, height: 340, zIndex: -1, dragHandle: '.frame-drag', data: { title: 'Nova área', color: 'cinza' } }, { edit: true });
  }, []);

  /* soltar a conexão em cima de um elemento (não só na alça) também conecta, como no Miro */
  const onConnectEnd = useCallback<OnConnectEnd>((event, state) => {
    if (state.isValid || !state.fromNode) return;
    const pt = 'changedTouches' in event ? event.changedTouches[0] : event;
    if (!pt) return;
    const el = document.elementFromPoint(pt.clientX, pt.clientY)?.closest('.react-flow__node');
    const targetId = el?.getAttribute('data-id');
    const from = state.fromNode;
    if (!targetId || targetId === from.id) return;
    const target = rf.getInternalNode(targetId);
    if (!target || target.type === 'frame') return;
    const center = (n: { internals: { positionAbsolute: { x: number; y: number } }; measured: { width?: number; height?: number } }) => ({
      x: n.internals.positionAbsolute.x + (n.measured.width ?? 0) / 2, y: n.internals.positionAbsolute.y + (n.measured.height ?? 0) / 2
    });
    const a = center(from), b = center(target);
    const dx = a.x - b.x, dy = a.y - b.y;
    const side = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'b' : 't');
    useBoard.getState().onConnect({ source: from.id, sourceHandle: state.fromHandle?.id ?? null, target: targetId, targetHandle: side });
  }, [rf]);

  /* ---------- teclado ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(document.activeElement)) return;
      if (document.querySelector('.modal-back')) return;
      const s = useBoard.getState();
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) { s.redo(); } else { s.undo(); } return; }
      if (mod && k === 'y') { e.preventDefault(); s.redo(); return; }
      if (mod && k === 'd') { e.preventDefault(); s.duplicate(s.nodes.filter(n => n.selected).map(n => n.id)); return; }
      if (mod && k === 'a') { e.preventDefault(); s.setNodes(ns => ns.map(n => ({ ...n, selected: true }))); return; }
      if (mod && (k === '=' || k === '+')) { e.preventDefault(); rf.zoomIn(); return; }
      if (mod && k === '-') { e.preventDefault(); rf.zoomOut(); return; }
      if (mod && k === '0') { e.preventDefault(); rf.zoomTo(1); return; }
      if (mod || e.altKey) return;
      if (e.shiftKey && (e.code === 'Digit1' || k === '!')) { e.preventDefault(); rf.fitView({ padding: 0.2, maxZoom: 1, duration: 250 }); return; }
      if (e.key === 'Escape') {
        setPickerOpen(false);
        if (s.tool !== 'select') s.setTool('select');
        else { s.setNodes(ns => ns.map(n => (n.selected ? { ...n, selected: false } : n))); s.setEdges(es => es.map(x => (x.selected ? { ...x, selected: false } : x))); }
        return;
      }
      if (e.key === 'Enter') {
        const selN = s.nodes.filter(n => n.selected), selE = s.edges.filter(x => x.selected);
        if (selN.length === 1 && ['note', 'text', 'frame'].includes(selN[0].type!)) { e.preventDefault(); s.setEditing(selN[0].id); }
        else if (!selN.length && selE.length === 1) { e.preventDefault(); s.setEditing(selE[0].id); }
        return;
      }
      const map: Record<string, () => void> = {
        v: () => s.setTool('select'), h: () => s.setTool('hand'), n: () => s.setTool('note'), t: () => s.setTool('text'),
        f: () => s.setTool('frame'), i: () => fileRef.current?.click(), c: () => setPickerOpen(o => !o)
      };
      if (map[k]) { e.preventDefault(); map[k](); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [rf]);

  /* ---------- copiar, recortar, colar (inclusive imagens) ---------- */
  useEffect(() => {
    const selected = () => {
      const s = useBoard.getState();
      const ns = s.nodes.filter(n => n.selected);
      const ids = new Set(ns.map(n => n.id));
      return { ns, es: s.edges.filter(e => ids.has(e.source) && ids.has(e.target)) };
    };
    const onCopy = (e: ClipboardEvent) => {
      if (isTyping(document.activeElement)) return;
      const { ns, es } = selected();
      if (!ns.length || !e.clipboardData) return;
      e.preventDefault();
      e.clipboardData.setData('text/plain', JSON.stringify({ bancada: 1, nodes: ns, edges: es }));
      notify(`${ns.length} ${ns.length === 1 ? 'elemento copiado' : 'elementos copiados'}`);
    };
    const onCut = (e: ClipboardEvent) => {
      if (isTyping(document.activeElement)) return;
      const { ns } = selected();
      onCopy(e);
      if (ns.length) rf.deleteElements({ nodes: ns.map(n => ({ id: n.id })) });
    };
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(document.activeElement) || !e.clipboardData) return;
      const files = Array.from(e.clipboardData.files || []).filter(f => f.type.startsWith('image/'));
      if (files.length) { e.preventDefault(); addImages(files); return; }
      const text = e.clipboardData.getData('text/plain');
      if (!text) return;
      e.preventDefault();
      try {
        const j = JSON.parse(text);
        if (j && j.bancada === 1 && Array.isArray(j.nodes)) { useBoard.getState().pasteElements(j.nodes, j.edges || [], anchor()); return; }
      } catch { /* texto comum */ }
      const p = anchor();
      useBoard.getState().addNode({ id: 'n' + uid(), type: 'note', position: { x: p.x - 100, y: p.y - 80 }, width: 220, height: 160, data: { text: text.slice(0, 2000), color: noteColor.current } });
    };
    document.addEventListener('copy', onCopy);
    document.addEventListener('cut', onCut);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('paste', onPaste);
    };
  }, [rf, addImages, anchor, notify]);

  /* ---------- áreas levam junto o que está dentro ---------- */
  const onNodeDragStart = useCallback<OnNodeDrag<AppNode>>((_e, _node, dragged) => {
    useBoard.getState().snapshot();
    const frames = dragged.filter(n => n.type === 'frame');
    if (!frames.length) { frameDrag.current = null; return; }
    const draggedIds = new Set(dragged.map(n => n.id));
    const all = useBoard.getState().nodes;
    const children = new Map<string, { x: number; y: number; frame: string }>();
    frames.forEach(f => {
      const fs = sizeOf(f);
      all.forEach(n => {
        if (n.type === 'frame' || draggedIds.has(n.id) || children.has(n.id)) return;
        const s = sizeOf(n);
        const cx = n.position.x + s.w / 2, cy = n.position.y + s.h / 2;
        if (cx >= f.position.x && cx <= f.position.x + fs.w && cy >= f.position.y && cy <= f.position.y + fs.h) {
          children.set(n.id, { x: n.position.x, y: n.position.y, frame: f.id });
        }
      });
    });
    frameDrag.current = { start: new Map(frames.map(f => [f.id, { ...f.position }])), children };
  }, []);

  const onNodeDrag = useCallback<OnNodeDrag<AppNode>>((_e, _node, dragged) => {
    const d = frameDrag.current;
    if (!d || !d.children.size) return;
    const cur = new Map(dragged.map(n => [n.id, n.position]));
    useBoard.getState().setNodes(ns => ns.map(n => {
      const c = d.children.get(n.id);
      if (!c) return n;
      const fp = cur.get(c.frame), s0 = d.start.get(c.frame);
      if (!fp || !s0) return n;
      return { ...n, position: { x: c.x + fp.x - s0.x, y: c.y + fp.y - s0.y } };
    }));
  }, []);

  const onNodeDragStop = useCallback(() => { frameDrag.current = null; }, []);

  const onSelectionChange = useCallback(({ nodes: ns, edges: es }: OnSelectionChangeParams) => {
    const s = useBoard.getState();
    if (ns.length + es.length === 1 && s.sidebarOpen && s.tab === 'cenario') s.setTab('detalhes');
  }, []);

  const onPaneClick = useCallback((e: React.MouseEvent) => {
    setPickerOpen(false);
    const t = useBoard.getState().tool;
    if (t === 'note' || t === 'text' || t === 'frame') placeAt(t, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  }, [placeAt, rf]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const at = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const kind = e.dataTransfer.getData(DRAG_MIME) as ComponentKind;
    if (kind && kind in CATALOG) { addComponentAt(kind, at); setPickerOpen(false); return; }
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) addImages(files, at);
  }, [rf, addComponentAt, addImages]);

  const hand = tool === 'hand';
  const placing = tool === 'note' || tool === 'text' || tool === 'frame';
  const empty = loaded && nodes.length === 0;

  return (
    <div
      ref={wrapRef}
      className={`canvas-area${placing ? ' tool-place' : ''}${hand ? ' tool-hand' : ''}`}
      onPointerMove={e => { pointer.current = { x: e.clientX, y: e.clientY }; }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={onDrop}
    >
      <ReactFlow<AppNode, AppEdge>
        nodes={nodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionRadius={30}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={(_, n) => {
          const s = useBoard.getState();
          if (n.type === 'note' || n.type === 'text' || n.type === 'frame') s.setEditing(n.id);
          else s.setTab('detalhes');
        }}
        onEdgeDoubleClick={(_, ed) => useBoard.getState().setEditing(ed.id)}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        onMoveEnd={(_, vp) => useBoard.getState().setViewport(vp)}
        panOnDrag={hand ? true : [1, 2]}
        selectionOnDrag={!hand && !placing}
        selectionMode={SelectionMode.Partial}
        nodesDraggable={!hand}
        nodesConnectable={!hand}
        elementsSelectable={!hand}
        panOnScroll={prefs.wheel === 'pan'}
        zoomOnScroll={prefs.wheel === 'zoom'}
        zoomOnDoubleClick={false}
        snapToGrid={prefs.snap}
        snapGrid={[16, 16]}
        minZoom={0.1}
        maxZoom={3}
        elevateNodesOnSelect={false}
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        colorMode="system"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.6} />
        {prefs.minimap && (
          <MiniMap
            pannable zoomable position="bottom-right" style={{ width: 168, height: 112 }}
            nodeColor={n => (n.type === 'component' ? groupOf((n as AppNode as { data: { kind: ComponentKind } }).data.kind).mini : n.type === 'frame' ? 'transparent' : '#C9B458')}
            nodeStrokeColor={n => (n.type === 'frame' ? '#7E8D94' : 'transparent')}
            nodeStrokeWidth={3}
            ariaLabel="Minimapa do quadro"
          />
        )}
      </ReactFlow>

      {empty && (
        <div className="empty-hint">
          <div>
            <h2>Quadro vazio</h2>
            Abra <b>Componentes</b> na barra à esquerda (atalho <span className="kbd">C</span>) e comece por quem usa o sistema.
            Notas, textos, áreas e imagens também ficam na barra. Dá para colar imagens com <span className="kbd">Ctrl</span>+<span className="kbd">V</span>.
          </div>
        </div>
      )}

      {placing && (
        <div className="hint-toast" role="status">
          {PLACE_HINT[tool]}
          <button type="button" onClick={() => useBoard.getState().setTool('select')}>Cancelar</button>
        </div>
      )}

      <Toolbar
        pickerOpen={pickerOpen}
        setPickerOpen={setPickerOpen}
        onPickImage={() => fileRef.current?.click()}
        onAddComponent={kind => { addComponentAt(kind); setPickerOpen(false); }}
        dragMime={DRAG_MIME}
      />
      <ZoomBar prefs={prefs} setPrefs={setPrefs} />
      <CommOptions />
      <input
        ref={fileRef} type="file" accept="image/*" multiple hidden id="image-input" aria-label="Adicionar imagem"
        onChange={e => { addImages(Array.from(e.target.files || [])); e.target.value = ''; }}
      />
    </div>
  );
}

