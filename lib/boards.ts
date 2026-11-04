import { get, set } from 'idb-keyval';
import { CATALOG } from './catalog';
import { SAFE_IMAGE } from './image';
import type { Adr, AppEdge, AppNode, Board, ChatMsg, CustomScenario } from './types';

export const uid = () => Math.random().toString(36).slice(2, 10);

export const emptyCustom = (): CustomScenario => ({ name: '', context: '', functional: '', quality: '', constraints: '' });

export function emptyBoard(id: string): Board {
  return { id, nodes: [], edges: [], adrs: [], checks: {}, twist: false, custom: emptyCustom(), chat: [], updatedAt: Date.now() };
}

const edge = (id: string, source: string, target: string, label: string, async = false): AppEdge => ({
  id, source, target, type: 'arch', sourceHandle: 'r', targetHandle: 'l',
  data: { label, async, pathType: 'smoothstep' }
});

/** Quadro de exemplo do encurtador: parcial de propósito (falta a contagem de cliques). */
export function sampleBoard(): Board {
  const nodes: AppNode[] = [
    { id: 'f1', type: 'frame', position: { x: 300, y: 40 }, width: 860, height: 420, zIndex: -1, dragHandle: '.frame-drag', data: { title: 'Caminho do redirecionamento', color: 'verde' } },
    { id: 'a1', type: 'component', position: { x: 40, y: 120 }, data: { kind: 'web', name: 'Painel de links', resp: 'Tela onde o marketing cria links.', tech: '' } },
    { id: 'a2', type: 'component', position: { x: 340, y: 120 }, data: { kind: 'gateway', name: 'API Gateway', resp: '', tech: '' } },
    { id: 'a3', type: 'component', position: { x: 640, y: 120 }, data: { kind: 'servico', name: 'Serviço de links', resp: 'Cria links e resolve o redirecionamento.', tech: '' } },
    { id: 'a4', type: 'component', position: { x: 920, y: 120 }, data: { kind: 'sql', name: 'Banco de links', resp: 'Fonte da verdade dos links.', tech: 'PostgreSQL' } },
    { id: 'a5', type: 'component', position: { x: 640, y: 300 }, data: { kind: 'cache', name: 'Cache de redirecionamento', resp: 'Código curto para URL longa.', tech: 'Redis' } },
    { id: 'n1', type: 'note', position: { x: 40, y: 300 }, width: 220, height: 150, data: { color: 'amarelo', text: 'Exemplo inicial. Onde os cliques são contados? E o que acontece no pico de 5x?' } }
  ];
  const edges: AppEdge[] = [
    edge('e1', 'a1', 'a2', 'HTTP/REST'),
    edge('e2', 'a2', 'a3', 'HTTP/REST'),
    edge('e3', 'a3', 'a4', 'SQL'),
    { ...edge('e4', 'a3', 'a5', 'Leitura/escrita'), sourceHandle: 'b', targetHandle: 't' }
  ];
  return { ...emptyBoard('encurtador'), nodes, edges, sample: true };
}

/* ---------- validação ----------
   Tudo que é lido do armazenamento passa por aqui antes de chegar à tela: só tipos conhecidos,
   só campos esperados, textos com limite e imagens apenas como data URL de formatos seguros.
   Campos como style e className nunca são aceitos. */
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const NOTE_COLORS = new Set(['amarelo', 'verde', 'azul', 'rosa', 'lilas', 'cinza']);
const color = (v: unknown, fallback: string) => (typeof v === 'string' && NOTE_COLORS.has(v) ? v : fallback);

function cleanNode(raw: unknown): AppNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const n = raw as Record<string, any>;
  const id = str(n.id, 64);
  const x = num(n.position?.x), y = num(n.position?.y);
  const d = n.data && typeof n.data === 'object' ? n.data : {};
  if (!id || x === undefined || y === undefined) return null;
  const base = { id, position: { x, y }, width: num(n.width), height: num(n.height) };
  switch (n.type) {
    case 'component':
      if (typeof d.kind !== 'string' || !(d.kind in CATALOG)) return null;
      return { ...base, type: 'component', data: { kind: d.kind, name: str(d.name, 120), resp: str(d.resp, 1000), tech: str(d.tech, 120) } } as AppNode;
    case 'note':
      return { ...base, type: 'note', data: { text: str(d.text, 5000), color: color(d.color, 'amarelo') } };
    case 'text':
      return { ...base, type: 'text', data: { text: str(d.text, 2000), size: d.size === 's' || d.size === 'l' ? d.size : 'm' } };
    case 'frame':
      return { ...base, type: 'frame', zIndex: -1, dragHandle: '.frame-drag', data: { title: str(d.title, 120), color: color(d.color, 'cinza') } };
    case 'image':
      if (typeof d.src !== 'string' || d.src.length > 8_000_000 || !SAFE_IMAGE.test(d.src)) return null;
      return { ...base, type: 'image', data: { src: d.src, caption: str(d.caption, 300), ratio: num(d.ratio) ?? 0.75 } };
    default:
      return null;
  }
}

const HANDLES = new Set(['t', 'r', 'b', 'l']);
function cleanEdge(raw: unknown, ids: Set<string>): AppEdge | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, any>;
  if (!ids.has(e.source) || !ids.has(e.target) || e.source === e.target) return null;
  const d = e.data && typeof e.data === 'object' ? e.data : {};
  return {
    id: str(e.id, 64) || 'e' + uid(), source: e.source, target: e.target, type: 'arch',
    sourceHandle: HANDLES.has(e.sourceHandle) ? e.sourceHandle : null,
    targetHandle: HANDLES.has(e.targetHandle) ? e.targetHandle : null,
    data: { label: str(d.label, 200), async: d.async === true, pathType: d.pathType === 'bezier' || d.pathType === 'straight' ? d.pathType : 'smoothstep' }
  };
}

export function sanitizeBoard(id: string, raw: unknown): Board | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, any>;
  if (!Array.isArray(b.nodes)) return null;
  const nodes = b.nodes.slice(0, 2000).map(cleanNode).filter((n: AppNode | null): n is AppNode => !!n);
  const ids = new Set(nodes.map(n => n.id));
  const edges = (Array.isArray(b.edges) ? b.edges : []).slice(0, 4000).map((e: unknown) => cleanEdge(e, ids)).filter((e: AppEdge | null): e is AppEdge => !!e);
  const adrs: Adr[] = (Array.isArray(b.adrs) ? b.adrs : []).slice(0, 200).filter((a: unknown) => a && typeof a === 'object').map((a: any) => ({
    id: str(a.id, 64) || uid(), title: str(a.title, 200), context: str(a.context, 5000), decision: str(a.decision, 5000), consequences: str(a.consequences, 5000)
  }));
  const checks: Record<string, boolean> = {};
  if (b.checks && typeof b.checks === 'object') for (const [k, v] of Object.entries(b.checks)) if (typeof v === 'boolean') checks[k.slice(0, 32)] = v;
  const c = b.custom && typeof b.custom === 'object' ? b.custom : {};
  const chat: ChatMsg[] = (Array.isArray(b.chat) ? b.chat : []).slice(-60).filter((m: any) => m && (m.role === 'user' || m.role === 'assistant')).map((m: any) => ({
    id: str(m.id, 64) || uid(), role: m.role, content: str(m.content, 50_000), withImage: m.withImage === true, error: m.error === true
  }));
  const vp = b.viewport, vx = num(vp?.x), vy = num(vp?.y), vz = num(vp?.zoom);
  return {
    id, nodes, edges, adrs, checks, twist: b.twist === true, chat,
    custom: { name: str(c.name, 120), context: str(c.context, 3000), functional: str(c.functional, 3000), quality: str(c.quality, 3000), constraints: str(c.constraints, 3000) },
    viewport: vx !== undefined && vy !== undefined && vz !== undefined ? { x: vx, y: vy, zoom: Math.min(3, Math.max(0.1, vz)) } : undefined,
    sample: b.sample === true,
    updatedAt: num(b.updatedAt) ?? Date.now()
  };
}

export async function loadBoard(id: string): Promise<Board> {
  try {
    const b = sanitizeBoard(id, await get(`board:${id}`));
    if (b) return b;
  } catch { /* IndexedDB indisponível */ }
  return id === 'encurtador' ? sampleBoard() : emptyBoard(id);
}

export async function saveBoard(b: Board): Promise<boolean> {
  try { await set(`board:${b.id}`, b); return true; } catch { return false; }
}

/** Remove estado transitório do React Flow antes de salvar ou exportar. */
export function cleanNodes(nodes: AppNode[]): AppNode[] {
  return nodes.map(n => {
    const { selected, dragging, resizing, ...rest } = n as AppNode & { resizing?: boolean };
    void selected; void dragging; void resizing;
    return rest as AppNode;
  });
}
export function cleanEdges(edges: AppEdge[]): AppEdge[] {
  return edges.map(e => { const { selected, ...rest } = e; void selected; return rest as AppEdge; });
}
