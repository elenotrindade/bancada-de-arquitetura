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

/** Rótulo único por elemento: nomes repetidos ganham número (Cache 1, Cache 2), para as conexões não ficarem ambíguas. */
function uniqueLabels(nodes: AppNode[]): Map<string, string> {
  const base = new Map(nodes.map(n => [n.id, labelOf(n)]));
  const total = new Map<string, number>();
  base.forEach(v => total.set(v, (total.get(v) || 0) + 1));
  const visto = new Map<string, number>();
  const out = new Map<string, string>();
  nodes.forEach(n => {
    const b = base.get(n.id)!;
    if ((total.get(b) || 0) > 1) { const k = (visto.get(b) || 0) + 1; visto.set(b, k); out.set(n.id, `${b} ${k}`); }
    else out.set(n.id, b);
  });
  return out;
}

const mmText = (s: string) => s.replace(/["|<>{}[\]]/g, ' ').replace(/\s+/g, ' ').trim();

function mermaid(nodes: AppNode[], edges: AppEdge[], frames: AppNode[], nome: Map<string, string>): string[] {
  const ids = new Map<string, string>();
  nodes.forEach((n, i) => ids.set(n.id, `n${i + 1}`));
  const ligados = new Set(edges.flatMap(e => [e.source, e.target]));
  const visiveis = nodes.filter(n => n.type === 'component' || ((n.type === 'note' || n.type === 'text' || n.type === 'image') && ligados.has(n.id)));
  const def = (n: AppNode) => {
    const id = ids.get(n.id)!;
    if (n.type === 'component') {
      const tipo = CATALOG[n.data.kind].label;
      const rotulo = mmText(nome.get(n.id)!);
      const sub = [tipo !== rotulo.replace(/ \d+$/, '') ? tipo : '', n.data.tech].filter(Boolean).map(mmText).join(' · ');
      return `${id}["${rotulo}${sub ? `<br/><small>${sub}</small>` : ''}"]`;
    }
    return `${id}>"${mmText(nome.get(n.id)!)}"]`;
  };
  const out = ['flowchart LR'];
  const dentro = new Set<string>();
  frames.forEach(f => {
    if (f.type !== 'frame') return;
    const membros = visiveis.filter(n => frameOf(n, frames)?.id === f.id);
    if (!membros.length) return;
    out.push(`  subgraph ${ids.get(f.id)}["${mmText(f.data.title || 'Área')}"]`);
    membros.forEach(n => { out.push(`    ${def(n)}`); dentro.add(n.id); });
    out.push('  end');
  });
  visiveis.filter(n => !dentro.has(n.id)).forEach(n => out.push(`  ${def(n)}`));
  edges.forEach(e => {
    const a = ids.get(e.source), z = ids.get(e.target);
    if (!a || !z) return;
    const t = mmText(e.data?.label || '');
    const seta = e.data?.async ? '-.->' : '-->';
    out.push(`  ${a} ${seta}${t ? `|${t}|` : ''} ${z}`);
  });
  return out;
}

/** Fatos objetivos sobre o que ainda falta no desenho (sem julgar a arquitetura). */
function gaps(nodes: AppNode[], edges: AppEdge[], nome: Map<string, string>): string[] {
  const comps = nodes.filter(n => n.type === 'component');
  const out: string[] = [];
  const padrao = comps.filter(n => n.type === 'component' && (!n.data.name || n.data.name === CATALOG[n.data.kind].label));
  if (padrao.length) out.push(`${padrao.length} de ${comps.length} componentes estão com o nome padrão do tipo: ${padrao.map(n => nome.get(n.id)).join(', ')}.`);
  const semResp = comps.filter(n => n.type === 'component' && !n.data.resp.trim());
  if (semResp.length) out.push(`${semResp.length} de ${comps.length} componentes estão sem responsabilidade escrita.`);
  const soltos = comps.filter(n => !edges.some(e => e.source === n.id || e.target === n.id));
  if (soltos.length) out.push(`Sem nenhuma conexão: ${soltos.map(n => nome.get(n.id)).join(', ')}.`);
  const semRotulo = edges.filter(e => !e.data?.label);
  if (semRotulo.length) out.push(`${semRotulo.length} conexões sem descrição de como os componentes conversam.`);
  return out;
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
  const edges = (b.edges as AppEdge[]).filter(e => b.nodes.some(n => n.id === e.source) && b.nodes.some(n => n.id === e.target));
  const nome = uniqueLabels(b.nodes);
  const como = (e: AppEdge) => `${e.data?.label || 'sem descrição'}, ${e.data?.async ? 'assíncrona' : 'síncrona'}`;

  L.push('## Componentes', '', 'Cada linha traz o tipo, a responsabilidade e com quem o componente conversa. Uma seta A → B significa que A chama ou envia algo para B.', '');
  if (!comps.length) L.push('- (nenhum ainda)');
  comps.forEach(n => {
    if (n.type !== 'component') return;
    const c = CATALOG[n.data.kind];
    const f = frameOf(n, frames);
    const extra = [c.label, n.data.tech].filter(Boolean).join(', ');
    L.push(`- **${nome.get(n.id)}** (${extra})${f && f.type === 'frame' ? ` [área "${f.data.title}"]` : ''}`);
    L.push(`  - Responsabilidade: ${n.data.resp ? n.data.resp : '(não escrita)'}`);
    const sai = edges.filter(e => e.source === n.id).map(e => `${nome.get(e.target)} (${como(e)})`);
    const entra = edges.filter(e => e.target === n.id).map(e => `${nome.get(e.source)} (${como(e)})`);
    L.push(`  - Envia para: ${sai.length ? sai.join('; ') : 'ninguém'}`);
    L.push(`  - Recebe de: ${entra.length ? entra.join('; ') : 'ninguém'}`);
  });

  if (frames.length) {
    L.push('', '## Áreas (agrupamentos)');
    frames.forEach(f => {
      if (f.type !== 'frame') return;
      const inside = b.nodes.filter(n => n.type !== 'frame' && frameOf(n, frames)?.id === f.id).map(n => nome.get(n.id));
      L.push(`- **${f.data.title || 'Sem título'}**: ${inside.length ? inside.join(', ') : 'vazia'}`);
    });
  }

  L.push('', '## Conexões');
  if (!edges.length) L.push('- (nenhuma ainda)');
  edges.forEach(e => L.push(`- ${nome.get(e.source)} → ${nome.get(e.target)}: ${como(e)}`));

  if (comps.length) L.push('', '## Diagrama', '', 'O mesmo desenho em Mermaid, para a IA (ou qualquer visualizador de Mermaid) reconstruir a estrutura. Linha tracejada = assíncrona.', '', '```mermaid', ...mermaid(b.nodes, edges, frames, nome), '```');

  const lacunas = gaps(b.nodes, edges, nome);
  if (lacunas.length) L.push('', '## Lacunas detectadas no quadro', ...lacunas.map(x => `- ${x}`));

  const notes = b.nodes.filter(n => n.type === 'note' || n.type === 'text');
  if (notes.length) {
    L.push('', '## Anotações no quadro');
    notes.forEach(n => {
      if (n.type !== 'note' && n.type !== 'text') return;
      const linked = edges.filter(e => e.source === n.id || e.target === n.id).map(e => nome.get(e.source === n.id ? e.target : e.source));
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
