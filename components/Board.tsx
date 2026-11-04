'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { loadPrefs, savePrefs, type Prefs } from '@/lib/prefs';
import { SCENARIOS } from '@/lib/scenarios';
import { useBoard } from '@/lib/store';
import Canvas from './Canvas';
import Sidebar from './panels/Sidebar';
import TopBar from './TopBar';

export default function Board() {
  const [prefs, setPrefsState] = useState<Prefs>({ snap: true, minimap: true, wheel: 'zoom', scenario: 'encurtador' });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((m: string) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const setPrefs = useCallback((p: Prefs) => { setPrefsState(p); savePrefs(p); }, []);

  /* carrega preferências e o último cenário usado */
  useEffect(() => {
    const p = loadPrefs();
    const scenario = SCENARIOS.some(s => s.id === p.scenario) ? p.scenario : 'encurtador';
    setPrefsState({ ...p, scenario });
    if (window.matchMedia('(max-width: 960px)').matches) useBoard.getState().setSidebarOpen(false);
    useBoard.getState().load(scenario);
  }, []);

  /* salva no IndexedDB com atraso, a cada mudança do quadro */
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const unsub = useBoard.subscribe((s, prev) => {
      if (!s.loaded) return;
      if (s.nodes === prev.nodes && s.edges === prev.edges && s.adrs === prev.adrs && s.checks === prev.checks &&
        s.twist === prev.twist && s.custom === prev.custom && s.chat === prev.chat && s.viewport === prev.viewport) return;
      clearTimeout(t);
      t = setTimeout(() => { useBoard.getState().persist(); }, 400);
    });
    const flush = () => { useBoard.getState().persist(); };
    window.addEventListener('pagehide', flush);
    return () => { unsub(); clearTimeout(t); window.removeEventListener('pagehide', flush); };
  }, []);

  const changeScenario = useCallback(async (id: string) => {
    await useBoard.getState().persist();
    setPrefs({ ...prefs, scenario: id });
    await useBoard.getState().load(id);
  }, [prefs, setPrefs]);

  return (
    <ReactFlowProvider>
      <div className="app">
        <TopBar scenario={prefs.scenario} onScenario={changeScenario} notify={notify} />
        <div className="main">
          <Canvas prefs={prefs} setPrefs={setPrefs} notify={notify} />
          <Sidebar notify={notify} />
        </div>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </ReactFlowProvider>
  );
}
