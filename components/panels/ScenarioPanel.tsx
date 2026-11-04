'use client';
import { QUESTIONS, scenarioById } from '@/lib/scenarios';
import { useBoard } from '@/lib/store';

export default function ScenarioPanel() {
  const id = useBoard(s => s.id);
  const custom = useBoard(s => s.custom);
  const twist = useBoard(s => s.twist);
  const checks = useBoard(s => s.checks);
  const setCustom = useBoard(s => s.setCustom);
  const setTwist = useBoard(s => s.setTwist);
  const setChecks = useBoard(s => s.setChecks);
  const s = scenarioById(id);
  const done = QUESTIONS.filter(q => checks[q.id]).length;

  return (
    <>
      {s.custom ? (
        <section className="section">
          <div className="eyebrow">Cenário livre</div>
          <p className="muted" style={{ margin: 0 }}>Invente um sistema, ou descreva um app que você conhece como usuário. Escreva números concretos nos atributos de qualidade: são eles que mudam o desenho.</p>
          <label className="field"><span>Nome do sistema</span><input type="text" id="c-name" value={custom.name} onChange={e => setCustom({ name: e.target.value })} placeholder="Ex.: Plataforma de cursos" /></label>
          <label className="field"><span>Contexto</span><textarea id="c-context" value={custom.context} onChange={e => setCustom({ context: e.target.value })} placeholder="O que é, para quem, que problema resolve" /></label>
          <label className="field"><span>Requisitos funcionais (um por linha)</span><textarea id="c-functional" value={custom.functional} onChange={e => setCustom({ functional: e.target.value })} /></label>
          <label className="field"><span>Atributos de qualidade (um por linha)</span><textarea id="c-quality" value={custom.quality} onChange={e => setCustom({ quality: e.target.value })} placeholder="Ex.: 5 mil alunos simultâneos em dia de prova" /></label>
          <label className="field"><span>Restrições (uma por linha)</span><textarea id="c-constraints" value={custom.constraints} onChange={e => setCustom({ constraints: e.target.value })} /></label>
        </section>
      ) : (
        <section className="section">
          <div className="eyebrow">Cenário</div>
          <h2>{s.name}</h2>
          <p style={{ margin: 0 }}>{s.context}</p>
          <div><h3>Precisa fazer</h3><ul>{s.functional?.map(f => <li key={f}>{f}</li>)}</ul></div>
          <div><h3>Atributos de qualidade</h3><ul>{s.quality?.map(([m, t]) => <li key={m}><span className="metric">{m}</span> {t}</li>)}</ul></div>
          <div><h3>Restrições</h3><ul>{s.constraints?.map(f => <li key={f}>{f}</li>)}</ul></div>
          {twist ? (
            <div className="twist"><strong>Mudança de requisito.</strong> {s.twist}</div>
          ) : (
            <>
              <button type="button" className="btn" onClick={() => setTwist(true)}>Revelar mudança de requisito</button>
              <p className="muted small" style={{ margin: 0 }}>Revele só depois de terminar o primeiro desenho. É assim que se descobre quanto ele aguenta mudar.</p>
            </>
          )}
        </section>
      )}

      <section className="section">
        <div className="row"><h2>Perguntas de arquiteto</h2><span className="spacer" /><span className="eyebrow">{done}/{QUESTIONS.length}</span></div>
        <p className="muted small" style={{ margin: 0 }}>Marque só quando o desenho responder à pergunta, não quando você souber a resposta de cabeça.</p>
        <div className="checks">
          {QUESTIONS.map(q => (
            <label key={q.id}><input type="checkbox" id={`q-${q.id}`} checked={!!checks[q.id]} onChange={e => setChecks(q.id, e.target.checked)} /><span>{q.q}</span></label>
          ))}
        </div>
      </section>
    </>
  );
}
