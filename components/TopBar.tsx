'use client';
import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { boardImage, download, downloadText } from '@/lib/exportImage';
import { SCENARIOS, scenarioById } from '@/lib/scenarios';
import { useBoard } from '@/lib/store';
import { measure, measureAsync } from '@/lib/perf';
import { buildSummary } from '@/lib/summary';
import { IconPanel } from './Icons';

type Props = { scenario: string; onScenario: (id: string) => void; notify: (m: string) => void };

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function TopBar({ scenario, onScenario, notify }: Props) {
  const counts = useBoard(s => `${s.nodes.filter(n => n.type === 'component').length} componentes · ${s.edges.length} conexões`);
  const saveError = useBoard(s => s.saveError);
  const sidebarOpen = useBoard(s => s.sidebarOpen);
  const setSidebarOpen = useBoard(s => s.setSidebarOpen);
  const rf = useReactFlow();
  const [menu, setMenu] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menu]);

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  const name = () => slug(scenarioById(scenario).custom ? useBoard.getState().custom.name || 'cenario-livre' : scenarioById(scenario).name) || 'quadro';

  const openSummary = async () => {
    setMenu(false);
    const text = measure('resumo', () => buildSummary(useBoard.getState(), { withPrompt: true }));
    setSummary(text);
    try { await navigator.clipboard.writeText(text); setCopyStatus('Copiado. Cole em qualquer chat de IA.'); }
    catch { setCopyStatus('Selecione o texto e copie manualmente.'); }
  };

  const exportPng = async () => {
    setMenu(false);
    try { download(await measureAsync('exportar-png', () => boardImage(rf.getNodes(), { format: 'png' })), `${name()}.png`); notify('Imagem exportada'); }
    catch (e) { notify((e as Error).message); }
  };

  const exportMd = () => {
    setMenu(false);
    downloadText(buildSummary(useBoard.getState(), { withPrompt: true }), `${name()}.md`, 'text/markdown');
  };

  return (
    <header className="topbar">
      <div className="brand"><h1>Bancada de Arquitetura</h1><span>Nível de containers · C4</span></div>
      <label className="inline" htmlFor="scenario">Cenário
        <select id="scenario" value={scenario} onChange={e => onScenario(e.target.value)}>
          {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <span className="stats">{counts}</span>
      {saveError && <span className="save-warn" role="status">Não foi possível salvar neste navegador. Exporte o quadro.</span>}
      <div className="top-actions">
        <button type="button" className="btn primary" onClick={openSummary}>Resumo para IA</button>
        <div className="anchor" ref={menuRef}>
          <button type="button" className="btn" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu(m => !m)}>Arquivo</button>
          {menu && (
            <div className="menu" role="menu">
              <button type="button" role="menuitem" onClick={exportPng}>Exportar imagem (PNG)<small>O quadro inteiro, não só a parte visível</small></button>
              <button type="button" role="menuitem" onClick={exportMd}>Exportar resumo (Markdown)<small>O mesmo texto do Resumo para IA, em arquivo</small></button>
              <div className="sep" />
              {confirmClear
                ? <button type="button" role="menuitem" className="btn danger" onClick={() => { useBoard.getState().clearBoard(); setConfirmClear(false); setMenu(false); notify('Quadro limpo. Ctrl+Z desfaz.'); }}>Confirmar: limpar o quadro</button>
                : <button type="button" role="menuitem" onClick={() => setConfirmClear(true)}>Limpar quadro<small>Remove componentes, conexões e anotações</small></button>}
            </div>
          )}
        </div>
        {!sidebarOpen && <button type="button" className="btn" onClick={() => setSidebarOpen(true)}><IconPanel width={16} height={16} />Painel</button>}
      </div>

      {summary !== null && (
        <div className="modal-back" onClick={e => { if (e.target === e.currentTarget) setSummary(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="sum-title">
            <div className="row"><h2 id="sum-title">Resumo para qualquer IA</h2><span className="spacer" /><button type="button" className="btn small" onClick={() => setSummary(null)}>Fechar</button></div>
            <p className="muted" style={{ margin: 0 }}>{copyStatus} Funciona no Claude, ChatGPT, Gemini ou outro chat. O texto descreve o cenário, o desenho, as decisões e pede uma revisão.</p>
            <textarea readOnly value={summary} aria-label="Resumo do quadro" onFocus={e => e.currentTarget.select()} />
            <div className="row">
              <button type="button" className="btn primary" onClick={async () => {
                try { await navigator.clipboard.writeText(summary); setCopyStatus('Copiado.'); } catch { setCopyStatus('Selecione o texto e copie manualmente.'); }
              }}>Copiar texto</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
