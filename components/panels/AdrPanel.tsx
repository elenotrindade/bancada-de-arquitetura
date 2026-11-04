'use client';
import { useState } from 'react';
import { useBoard } from '@/lib/store';

export default function AdrPanel() {
  const adrs = useBoard(s => s.adrs);
  const addAdr = useBoard(s => s.addAdr);
  const updateAdr = useBoard(s => s.updateAdr);
  const removeAdr = useBoard(s => s.removeAdr);
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <section className="section">
      <div className="row"><h2>Decisões (ADRs)</h2><span className="spacer" /><button type="button" className="btn small primary" onClick={() => setOpen(addAdr())}>Nova decisão</button></div>
      <p className="muted small" style={{ margin: 0 }}>Registre cada escolha que teria custo para desfazer: o contexto, o que você decidiu e o que aceita perder.</p>
      {!adrs.length && <p className="muted" style={{ margin: 0 }}>Nenhuma decisão ainda. Uma boa primeira: qual banco guarda a fonte da verdade, e por quê.</p>}
      {adrs.map((a, i) => (
        <details key={a.id} className="adr" open={open === a.id} onToggle={e => { if ((e.target as HTMLDetailsElement).open) setOpen(a.id); else if (open === a.id) setOpen(null); }}>
          <summary><span className="eyebrow">ADR {String(i + 1).padStart(3, '0')}</span><span>{a.title || 'Sem título'}</span></summary>
          <div className="adr-body">
            <label className="field"><span>Título</span><input type="text" id={`adr-title-${a.id}`} value={a.title} onChange={e => updateAdr(a.id, { title: e.target.value })} autoFocus={open === a.id && !a.title} /></label>
            <label className="field"><span>Contexto</span><textarea id={`adr-context-${a.id}`} value={a.context} onChange={e => updateAdr(a.id, { context: e.target.value })} placeholder="Que problema ou força levou a essa decisão?" /></label>
            <label className="field"><span>Decisão</span><textarea id={`adr-decision-${a.id}`} value={a.decision} onChange={e => updateAdr(a.id, { decision: e.target.value })} placeholder="O que foi escolhido e quais opções foram descartadas" /></label>
            <label className="field"><span>Consequências</span><textarea id={`adr-cons-${a.id}`} value={a.consequences} onChange={e => updateAdr(a.id, { consequences: e.target.value })} placeholder="O que fica mais fácil, o que fica mais difícil" /></label>
            <div className="row">
              {confirm === a.id ? (
                <>
                  <button type="button" className="btn small danger" onClick={() => { removeAdr(a.id); setConfirm(null); }}>Confirmar remoção</button>
                  <button type="button" className="btn small" onClick={() => setConfirm(null)}>Cancelar</button>
                </>
              ) : <button type="button" className="btn small danger" onClick={() => setConfirm(a.id)}>Remover decisão</button>}
            </div>
          </div>
        </details>
      ))}
    </section>
  );
}
