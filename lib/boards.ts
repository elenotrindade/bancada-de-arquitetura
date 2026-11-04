import { get, set } from 'idb-keyval';
import type { AppEdge, AppNode, Board, CustomScenario } from './types';

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

export async function loadBoard(id: string): Promise<Board> {
  try {
    const b = await get<Board>(`board:${id}`);
    if (b && Array.isArray(b.nodes)) return { ...emptyBoard(id), ...b, custom: { ...emptyCustom(), ...(b.custom || {}) } };
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
