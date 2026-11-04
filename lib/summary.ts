import { CATALOG } from './catalog';
import { QUESTIONS, scenarioById } from './scenarios';
import { sizeOf } from './store';
import type { AppEdge, AppNode, Board } from './types';

const lines = (t: string) => (t || '').split('\n').map(x => x.trim()).filter(Boolean);

function labelOf(n: AppNode): string {
  switch (n.type) {
    case 'component': return n.data.name || CATALOG[n.data.kind].label;
    case 'note': return `nota "${trim(n.data.text, 60)}"`;
    case 'text': return `texto "${trim(n.data.text, 60)}"`;
    case 'frame': return `área "${n.data.title}"`;
    case 'image': return `imagem${n.data.caption ? ` "${trim(n.data.caption, 60)}"` : ''}`;
    default: return 'elemento';
  }
}
const trim = (s: string, max: number) => {
  const one = (s || '').replace(/\s+/g, ' ').trim();
  return one.length > max ? one.slice(0, max - 1) + '…' : one;
};

function frameOf(n: AppNode, frames: AppNode[]): AppNode | undefined {
  const { w, h } = sizeOf(n);
  const cx = n.position.x + w / 2, cy = n.position.y + h / 2;
  return frames.find(f => {
    const s = sizeOf(f);
    return f.id !== n.id && cx >= f.position.x && cx <= f.position.x + s.w && cy >= f.position.y && cy <= f.position.y + s.h;
  });
}

type BoardLike = Pick<Board, 'id' | 'nodes' | 'edges' | 'adrs' | 'checks' | 'twist' | 'custom'>;

/** Descrição em markdown do quadro. Serve para o chat integrado e para colar em qualquer IA. */
export function buildSummary(b: BoardLike, opts: { withPrompt?: boolean } = {}): string {
  const s = scenarioById(b.id);
  const L: string[] = [];
  if (s.custom) {
    const c = b.custom;
    L.push(`# Exercício de arquitetura: ${c.name || 'cenário livre'}`, '');
    if (c.context) L.push(`**Contexto:** ${c.context}`, '');
    if (lines(c.functional).length) L.push('**Precisa fazer:**', ...lines(c.functional).map(x => `- ${x}`), '');
    if (lines(c.quality).length) L.push('**Atributos de qualidade:**', ...lines(c.quality).map(x => `- ${x}`), '');
    if (lines(c.constraints).length) L.push('**Restrições:**', ...lines(c.constraints).map(x => `- ${x}`), '');
  } else {
    L.push(`# Exercício de arquitetura: ${s.name}`, '', `**Contexto:** ${s.context}`, '');
    L.push('**Precisa fazer:**', ...(s.functional ?? []).map(x => `- ${x}`), '');
    L.push('**Atributos de qualidade:**', ...(s.quality ?? []).map(([m, t]) => `- ${m} ${t}`), '');
    L.push('**Restrições:**', ...(s.constraints ?? []).map(x => `- ${x}`), '');
    if (b.twist && s.twist) L.push(`**Mudança de requisito (já revelada):** ${s.twist}`, '');
  }

  const frames = b.nodes.filter(n => n.type === 'frame');
  const comps = b.nodes.filter(n => n.type === 'component');
  const byId = new Map(b.nodes.map(n => [n.id, n]));

  L.push('## Componentes');
  if (!comps.length) L.push('- (nenhum ainda)');
  comps.forEach(n => {
    if (n.type !== 'component') return;
    const c = CATALOG[n.data.kind];
    const f = frameOf(n, frames);
    const extra = [c.label, n.data.tech].filter(Boolean).join(', ');
    L.push(`- **${n.data.name || c.label}** (${extra})${n.data.resp ? `: ${n.data.resp}` : ''}${f && f.type === 'frame' ? ` [dentro da área "${f.data.title}"]` : ''}`);
  });

  if (frames.length) {
    L.push('', '## Áreas (agrupamentos)');
    frames.forEach(f => {
      if (f.type !== 'frame') return;
      const inside = b.nodes.filter(n => n.type !== 'frame' && frameOf(n, frames)?.id === f.id).map(labelOf);
      L.push(`- **${f.data.title || 'Sem título'}**: ${inside.length ? inside.join(', ') : 'vazia'}`);
    });
  }

  L.push('', '## Conexões');
  const edges = b.edges as AppEdge[];
  if (!edges.length) L.push('- (nenhuma ainda)');
  edges.forEach(e => {
    const a = byId.get(e.source), z = byId.get(e.target);
    if (!a || !z) return;
    const d = e.data;
    const how = d?.label ? d.label : 'sem descrição';
    L.push(`- ${labelOf(a)} → ${labelOf(z)}: ${how} (${d?.async ? 'assíncrona' : 'síncrona'})`);
  });

  const notes = b.nodes.filter(n => n.type === 'note' || n.type === 'text');
  if (notes.length) {
    L.push('', '## Anotações no quadro');
    notes.forEach(n => {
      if (n.type !== 'note' && n.type !== 'text') return;
      const linked = edges.filter(e => e.source === n.id || e.target === n.id)
        .map(e => byId.get(e.source === n.id ? e.target : e.source)).filter(Boolean).map(x => labelOf(x!));
      L.push(`- ${trim(n.data.text, 400) || '(vazia)'}${linked.length ? ` (ligada a: ${linked.join(', ')})` : ''}`);
    });
  }

  const images = b.nodes.filter(n => n.type === 'image');
  if (images.length) {
    L.push('', '## Imagens no quadro');
    images.forEach(n => { if (n.type === 'image') L.push(`- ${n.data.caption || 'imagem sem legenda'}`); });
  }

  if (b.adrs.length) {
    L.push('', '## Decisões registradas (ADRs)');
    b.adrs.forEach((a, i) => {
      L.push(`### ADR ${String(i + 1).padStart(3, '0')}: ${a.title || 'Sem título'}`);
      if (a.context) L.push(`- Contexto: ${a.context}`);
      if (a.decision) L.push(`- Decisão: ${a.decision}`);
      if (a.consequences) L.push(`- Consequências: ${a.consequences}`);
    });
  }

  const done = QUESTIONS.filter(q => b.checks[q.id]), open = QUESTIONS.filter(q => !b.checks[q.id]);
  L.push('', '## Autoavaliação');
  if (done.length) L.push('Acho que o desenho já responde:', ...done.map(q => `- ${q.q}`));
  if (open.length) L.push('Ainda não respondi:', ...open.map(q => `- ${q.q}`));

  if (opts.withPrompt) {
    L.push('', '## O que eu quero de você',
      'Estou estudando arquitetura de software e este é um exercício simulado. Revise o desenho como um arquiteto sênior: aponte pontos únicos de falha, gargalos nos picos descritos, acoplamentos desnecessários e o que falta para cumprir os atributos de qualidade. Questione as decisões que parecerem fracas e me faça perguntas em vez de supor. Termine com as três mudanças que mais melhorariam o desenho e o motivo de cada uma.');
  }
  return L.join('\n');
}
