'use client';
import { create } from 'zustand';
import { applyEdgeChanges, applyNodeChanges, type Connection, type EdgeChange, type NodeChange, type XYPosition } from '@xyflow/react';
import { guessLabel, isAsyncLabel, type ComponentKind, CATALOG } from './catalog';
import { cleanEdges, cleanNodes, emptyBoard, loadBoard, saveBoard, uid } from './boards';
import { measureAsync } from './perf';
import type { Adr, AppEdge, AppNode, ArchEdgeData, Board, ChatMsg, CustomScenario, SideTab, Tool } from './types';

type Snap = { nodes: AppNode[]; edges: AppEdge[] };

type State = Board & {
  loaded: boolean;
  tool: Tool;
  tab: SideTab;
  sidebarOpen: boolean;
  editingId: string | null;
  /** Desliga a virtualização para capturar o quadro inteiro numa imagem. */
  renderAll: boolean;
  saveError: boolean;
  past: Snap[];
  future: Snap[];

  load: (id: string) => Promise<void>;
  persist: () => Promise<void>;
  snapshot: () => void;
  undo: () => void;
  redo: () => void;

  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (c: Connection) => void;
  setNodes: (fn: (n: AppNode[]) => AppNode[]) => void;
  setEdges: (fn: (e: AppEdge[]) => AppEdge[]) => void;

  addNode: (n: AppNode, opts?: { edit?: boolean }) => void;
  addComponent: (kind: ComponentKind, pos: XYPosition) => void;
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  updateEdgeData: (id: string, patch: Partial<ArchEdgeData>) => void;
  flipEdge: (id: string) => void;
  duplicate: (ids: string[]) => void;
  pasteElements: (nodes: AppNode[], edges: AppEdge[], at?: XYPosition) => void;
  clearBoard: () => void;
  replaceBoard: (b: Partial<Board>) => void;

  setTool: (t: Tool) => void;
  setTab: (t: SideTab) => void;
  setSidebarOpen: (v: boolean) => void;
  setEditing: (id: string | null) => void;
  setRenderAll: (v: boolean) => void;

  setChecks: (id: string, v: boolean) => void;
  setTwist: (v: boolean) => void;
  setCustom: (patch: Partial<CustomScenario>) => void;
  addAdr: () => string;
  updateAdr: (id: string, patch: Partial<Adr>) => void;
  removeAdr: (id: string) => void;
  setChat: (fn: (m: ChatMsg[]) => ChatMsg[]) => void;
  setViewport: (v: { x: number; y: number; zoom: number }) => void;
};

let snapLock = false;

/** Tira a seleção sem recriar o array (nem os objetos) quando nada estava selecionado. */
function deselect<T extends { selected?: boolean }>(arr: T[]): T[] {
  return arr.some(x => x.selected) ? arr.map(x => (x.selected ? { ...x, selected: false } : x)) : arr;
}
const HISTORY = 80;

export const useBoard = create<State>()((set, get) => ({
  ...emptyBoard('encurtador'),
  loaded: false,
  tool: 'select',
  tab: 'cenario',
  sidebarOpen: true,
  editingId: null,
  renderAll: false,
  saveError: false,
  past: [],
  future: [],

  load: async (id) => {
    const b = await measureAsync('carregar', () => loadBoard(id));
    set({ ...b, viewport: b.viewport, sample: b.sample, loaded: true, past: [], future: [], editingId: null, tool: 'select' });
  },

  persist: async () => {
    const s = get();
    if (!s.loaded) return;
    const b: Board = {
      id: s.id, nodes: cleanNodes(s.nodes), edges: cleanEdges(s.edges), adrs: s.adrs, checks: s.checks,
      twist: s.twist, custom: s.custom, chat: s.chat.slice(-60), viewport: s.viewport, sample: s.sample, updatedAt: Date.now()
    };
    const ok = await measureAsync('salvar', () => saveBoard(b));
    if (ok !== !s.saveError) set({ saveError: !ok });
  },

  snapshot: () => {
    if (snapLock) return;
    snapLock = true;
    queueMicrotask(() => { snapLock = false; });
    const { nodes, edges, past } = get();
    set({ past: [...past.slice(-HISTORY), { nodes, edges }], future: [] });
  },
  undo: () => {
    const { past, future, nodes, edges } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({ nodes: prev.nodes, edges: prev.edges, past: past.slice(0, -1), future: [{ nodes, edges }, ...future].slice(0, HISTORY), editingId: null });
  },
  redo: () => {
    const { past, future, nodes, edges } = get();
    const next = future[0];
    if (!next) return;
    set({ nodes: next.nodes, edges: next.edges, future: future.slice(1), past: [...past, { nodes, edges }].slice(-HISTORY), editingId: null });
  },

  onNodesChange: (changes) => {
    if (changes.some(c => c.type === 'remove')) get().snapshot();
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    if (changes.some(c => c.type === 'remove')) get().snapshot();
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  onConnect: (c) => {
    if (!c.source || !c.target || c.source === c.target) return;
    get().snapshot();
    const nodes = get().nodes;
    const kindOf = (id: string) => {
      const n = nodes.find(n => n.id === id);
      return n?.type === 'component' ? n.data.kind : undefined;
    };
    const a = nodes.find(n => n.id === c.source), b = nodes.find(n => n.id === c.target);
    const annotation = a?.type !== 'component' || b?.type !== 'component';
    const label = annotation ? '' : guessLabel(kindOf(c.source), kindOf(c.target));
    const e: AppEdge = {
      id: 'e' + uid(), source: c.source, target: c.target, sourceHandle: c.sourceHandle, targetHandle: c.targetHandle,
      type: 'arch', data: { label, async: isAsyncLabel(label), pathType: annotation ? 'bezier' : 'smoothstep' }
    };
    set({ edges: [...deselect(get().edges), { ...e, selected: true }], nodes: deselect(nodes), sample: false });
  },
  setNodes: (fn) => set({ nodes: fn(get().nodes) }),
  setEdges: (fn) => set({ edges: fn(get().edges) }),

  addNode: (n, opts) => {
    get().snapshot();
    const { nodes, edges } = get();
    set({
      nodes: [...deselect(nodes), { ...n, selected: true } as AppNode],
      edges: deselect(edges),
      editingId: opts?.edit ? n.id : null,
      sample: false
    });
  },
  addComponent: (kind, pos) => {
    get().addNode({ id: 'c' + uid(), type: 'component', position: pos, data: { kind, name: CATALOG[kind].label, resp: '', tech: '' } });
  },
  updateNodeData: (id, patch) => {
    set({ nodes: get().nodes.map(n => (n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as AppNode) : n)), sample: false });
  },
  updateEdgeData: (id, patch) => {
    set({ edges: get().edges.map(e => (e.id === id ? { ...e, data: { label: '', async: false, pathType: 'smoothstep', ...e.data, ...patch } } : e)), sample: false });
  },
  flipEdge: (id) => {
    get().snapshot();
    set({
      edges: get().edges.map(e => (e.id === id ? { ...e, source: e.target, target: e.source, sourceHandle: e.targetHandle, targetHandle: e.sourceHandle } : e))
    });
  },
  duplicate: (ids) => {
    const { nodes, edges } = get();
    const picked = nodes.filter(n => ids.includes(n.id));
    if (!picked.length) return;
    const inner = edges.filter(e => ids.includes(e.source) && ids.includes(e.target));
    get().pasteElements(picked, inner);
  },
  pasteElements: (srcNodes, srcEdges, at) => {
    if (!srcNodes.length) return;
    get().snapshot();
    const map = new Map<string, string>();
    srcNodes.forEach(n => map.set(n.id, n.type!.slice(0, 1) + uid()));
    const minX = Math.min(...srcNodes.map(n => n.position.x));
    const minY = Math.min(...srcNodes.map(n => n.position.y));
    const dx = at ? at.x - minX : 32, dy = at ? at.y - minY : 32;
    const newNodes = srcNodes.map(n => ({
      ...n, id: map.get(n.id)!, selected: true, dragging: false,
      position: { x: n.position.x + dx, y: n.position.y + dy }, data: { ...n.data }
    })) as AppNode[];
    const newEdges = srcEdges
      .filter(e => map.has(e.source) && map.has(e.target))
      .map(e => ({ ...e, id: 'e' + uid(), source: map.get(e.source)!, target: map.get(e.target)!, selected: false, data: e.data ? { ...e.data } : undefined }));
    set({
      nodes: [...deselect(get().nodes), ...newNodes],
      edges: newEdges.length ? [...deselect(get().edges), ...newEdges] : deselect(get().edges),
      sample: false
    });
  },
  clearBoard: () => {
    get().snapshot();
    set({ nodes: [], edges: [], sample: false, editingId: null });
  },
  replaceBoard: (b) => {
    get().snapshot();
    set({ ...b, editingId: null });
  },

  setTool: (tool) => set({ tool, editingId: null }),
  setTab: (tab) => set({ tab, sidebarOpen: true }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setEditing: (editingId) => set({ editingId }),
  setRenderAll: (renderAll) => set({ renderAll }),

  setChecks: (id, v) => set({ checks: { ...get().checks, [id]: v } }),
  setTwist: (twist) => set({ twist }),
  setCustom: (patch) => set({ custom: { ...get().custom, ...patch } }),
  addAdr: () => {
    const id = uid();
    set({ adrs: [...get().adrs, { id, title: '', context: '', decision: '', consequences: '' }] });
    return id;
  },
  updateAdr: (id, patch) => set({ adrs: get().adrs.map(a => (a.id === id ? { ...a, ...patch } : a)) }),
  removeAdr: (id) => set({ adrs: get().adrs.filter(a => a.id !== id) }),
  setChat: (fn) => set({ chat: fn(get().chat) }),
  setViewport: (viewport) => set({ viewport })
}));

/** Tamanho efetivo de um nó (medido pelo React Flow, definido pelo usuário ou padrão). */
export function sizeOf(n: AppNode): { w: number; h: number } {
  const w = n.measured?.width ?? n.width ?? (n.type === 'component' ? 200 : 160);
  const h = n.measured?.height ?? n.height ?? (n.type === 'component' ? 70 : 100);
  return { w, h };
}
