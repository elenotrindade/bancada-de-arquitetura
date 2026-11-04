'use client';
import { Fragment } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import { CATALOG, GROUPS, groupOf, isAsyncLabel } from '@/lib/catalog';
import { useBoard } from '@/lib/store';
import type { PathType } from '@/lib/types';

const SHORTCUTS: [string, string][] = [
  ['V / H', 'Selecionar / mover o quadro'],
  ['C', 'Abrir componentes'],
  ['N / T / F / I', 'Nota, texto, área, imagem'],
  ['Espaço + arrastar', 'Mover o quadro'],
  ['Shift + clique', 'Selecionar vários'],
  ['Ctrl C / V / D', 'Copiar, colar, duplicar'],
  ['Ctrl Z / Shift Z', 'Desfazer / refazer'],
  ['Enter / duplo clique', 'Editar texto ou rótulo'],
  ['Delete', 'Remover seleção'],
  ['Shift 1', 'Enquadrar tudo']
];

export default function Inspector() {
  const selNodes = useBoard(useShallow(s => s.nodes.filter(n => n.selected)));
  const selEdges = useBoard(useShallow(s => s.edges.filter(e => e.selected)));
  const nodes = useBoard(s => s.nodes);
  const updateNodeData = useBoard(s => s.updateNodeData);
  const updateEdgeData = useBoard(s => s.updateEdgeData);
  const flipEdge = useBoard(s => s.flipEdge);
  const snapshot = useBoard(s => s.snapshot);
  const setEditing = useBoard(s => s.setEditing);
  const { deleteElements } = useReactFlow();

  if (selNodes.length + selEdges.length > 1) {
    return (
      <section className="section">
        <h2>{selNodes.length + selEdges.length} elementos selecionados</h2>
        <p className="muted" style={{ margin: 0 }}>Arraste para mover juntos, <span className="kbd">Ctrl</span>+<span className="kbd">D</span> para duplicar ou <span className="kbd">Delete</span> para remover.</p>
        <div className="row">
          <button type="button" className="btn small danger" onClick={() => deleteElements({ nodes: selNodes.map(n => ({ id: n.id })), edges: selEdges.map(e => ({ id: e.id })) })}>Remover seleção</button>
        </div>
      </section>
    );
  }

  const n = selNodes[0];
  if (n?.type === 'component') {
    const c = CATALOG[n.data.kind], g = groupOf(n.data.kind);
    return (
      <section className="section" key={n.id}>
        <div className="row" style={{ ['--gc' as string]: g.color }}><span className="chip">{c.abbr}</span><span className="eyebrow" style={{ color: 'var(--gc)' }}>{g.label} · {c.label}</span></div>
        <label className="field"><span>Nome</span><input type="text" id="i-name" value={n.data.name} onFocus={snapshot} onChange={e => updateNodeData(n.id, { name: e.target.value })} /></label>
        <label className="field"><span>Responsabilidade (uma frase)</span><textarea id="i-resp" value={n.data.resp} onFocus={snapshot} onChange={e => updateNodeData(n.id, { resp: e.target.value })} placeholder="O que só ele faz e quais dados ele guarda" /></label>
        <label className="field"><span>Tecnologia (opcional)</span><input type="text" id="i-tech" value={n.data.tech} onFocus={snapshot} onChange={e => updateNodeData(n.id, { tech: e.target.value })} placeholder="Ex.: PostgreSQL, Node.js, SQS" /></label>
        <div className="teach">
          <p><b>O que é</b>{c.what}</p>
          <p><b>Quando usar</b>{c.when}</p>
          <p><b>Cuidado</b>{c.care}</p>
        </div>
      </section>
    );
  }
  if (n?.type === 'image') {
    return (
      <section className="section" key={n.id}>
        <div className="eyebrow">Imagem</div>
        <label className="field"><span>Legenda</span><input type="text" id="i-caption" value={n.data.caption} onFocus={snapshot} onChange={e => updateNodeData(n.id, { caption: e.target.value })} placeholder="O que a imagem mostra" /></label>
        <p className="muted small" style={{ margin: 0 }}>A IA lê a legenda no resumo do quadro. Para ela ver a imagem, marque &quot;Anexar imagem do quadro&quot; no chat.</p>
      </section>
    );
  }
  if (n?.type === 'note' || n?.type === 'text') {
    return (
      <section className="section" key={n.id}>
        <div className="eyebrow">{n.type === 'note' ? 'Nota adesiva' : 'Texto'}</div>
        <label className="field"><span>Conteúdo</span><textarea id="i-text" rows={5} value={n.data.text} onFocus={snapshot} onChange={e => updateNodeData(n.id, { text: e.target.value })} /></label>
        <p className="muted small" style={{ margin: 0 }}>Ligue a anotação a um componente pelas alças para a IA saber a que ela se refere.</p>
      </section>
    );
  }
  if (n?.type === 'frame') {
    return (
      <section className="section" key={n.id}>
        <div className="eyebrow">Área</div>
        <label className="field"><span>Título</span><input type="text" id="i-title" value={n.data.title} onFocus={snapshot} onChange={e => updateNodeData(n.id, { title: e.target.value })} /></label>
        <p className="muted small" style={{ margin: 0 }}>Use áreas para fronteiras: um domínio de negócio, uma rede privada, uma região de nuvem, o que é seu e o que é de terceiros. Ao arrastar pelo título, tudo que está dentro vai junto.</p>
      </section>
    );
  }

  const e = !n ? selEdges[0] : undefined;
  if (e) {
    const a = nodes.find(x => x.id === e.source), b = nodes.find(x => x.id === e.target);
    const name = (x?: typeof a) => (x?.type === 'component' ? x.data.name : x?.type === 'frame' ? x.data.title : x?.type === 'image' ? 'Imagem' : 'Anotação');
    const d = e.data ?? { label: '', async: false, pathType: 'smoothstep' as PathType };
    return (
      <section className="section" key={e.id}>
        <div className="eyebrow">Conexão</div>
        <h2>{name(a)} → {name(b)}</h2>
        <label className="field"><span>Como se comunicam</span>
          <input type="text" id="i-label" list="comm-options" value={d.label} onFocus={snapshot}
            onChange={ev => { const v = ev.target.value; updateEdgeData(e.id, isAsyncLabel(v) && !d.async ? { label: v, async: true } : { label: v }); }} />
        </label>
        <div className="checks"><label><input type="checkbox" id="i-async" checked={d.async} onChange={ev => { snapshot(); updateEdgeData(e.id, { async: ev.target.checked }); }} /><span>Assíncrona (quem envia não espera a resposta)</span></label></div>
        <div className="field"><span>Traçado</span>
          <div className="radio-row">
            {([['smoothstep', 'Ortogonal'], ['bezier', 'Curva'], ['straight', 'Reta']] as [PathType, string][]).map(([v, l]) => (
              <label key={v}><input type="radio" name="path" checked={d.pathType === v} onChange={() => { snapshot(); updateEdgeData(e.id, { pathType: v }); }} />{l}</label>
            ))}
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn small" onClick={() => flipEdge(e.id)}>Inverter direção</button>
          <button type="button" className="btn small" onClick={() => setEditing(e.id)}>Editar no quadro</button>
          <button type="button" className="btn small danger" onClick={() => deleteElements({ edges: [{ id: e.id }] })}>Remover</button>
        </div>
        {a?.type === 'component' && b?.type === 'component' && (
          <div className="teach"><p><b>Pergunte</b>Se {b.data.name} ficar lento ou fora do ar, o que {a.data.name} faz? Se a resposta for &quot;trava também&quot;, talvez essa conexão precise ser assíncrona, ter timeout ou um plano B.</p></div>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="section">
        <h2>Como praticar</h2>
        <ol className="steps">
          <li>Leia o cenário e sublinhe os números: eles decidem a arquitetura.</li>
          <li>Coloque quem usa o sistema e os sistemas externos primeiro.</li>
          <li>Adicione os componentes e escreva a responsabilidade de cada um em uma frase.</li>
          <li>Conecte arrastando de uma alça para outro elemento e diga como conversam.</li>
          <li>Use áreas para fronteiras e notas para dúvidas e riscos.</li>
          <li>Registre as decisões caras de desfazer na aba Decisões.</li>
          <li>Peça feedback na aba IA, ou copie o resumo para qualquer chat.</li>
          <li>Revele a mudança de requisito e veja quanto o desenho precisa mudar.</li>
        </ol>
      </section>
      <section className="section">
        <div className="eyebrow">Legenda</div>
        <div className="legend">{GROUPS.map(g => <div key={g.id} style={{ ['--gc' as string]: g.color }}><span className="dot" />{g.label}</div>)}</div>
        <p className="muted small" style={{ margin: 0 }}>Linha cheia: síncrona. Tracejada: assíncrona. Selecione um componente para ver o que ele é e os cuidados.</p>
      </section>
      <section className="section">
        <div className="eyebrow">Atalhos</div>
        <div className="shortcuts">{SHORTCUTS.map(([k, v]) => <Fragment key={k}><span className="kbd">{k}</span><span>{v}</span></Fragment>)}</div>
      </section>
    </>
  );
}
