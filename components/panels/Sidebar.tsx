'use client';
import { useBoard } from '@/lib/store';
import type { SideTab } from '@/lib/types';
import { IconClose } from '../Icons';
import AdrPanel from './AdrPanel';
import ChatPanel from './ChatPanel';
import Inspector from './Inspector';
import ScenarioPanel from './ScenarioPanel';

const TABS: [SideTab, string][] = [['cenario', 'Cenário'], ['detalhes', 'Detalhes'], ['decisoes', 'Decisões'], ['ia', 'IA']];

export default function Sidebar({ notify }: { notify: (m: string) => void }) {
  const tab = useBoard(s => s.tab);
  const open = useBoard(s => s.sidebarOpen);
  const setTab = useBoard(s => s.setTab);
  const setOpen = useBoard(s => s.setSidebarOpen);
  const adrCount = useBoard(s => s.adrs.length);

  return (
    <aside className="sidebar" hidden={!open} aria-label="Painel lateral">
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" id={`tab-${id}`} className="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}{id === 'decisoes' && adrCount ? <span className="count">{adrCount}</span> : null}
          </button>
        ))}
        <button type="button" className="tool close-side" style={{ width: 32, height: 32 }} aria-label="Fechar painel" onClick={() => setOpen(false)}><IconClose /></button>
      </div>
      <div className={`side-body${tab === 'ia' ? ' chat-body' : ''}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'cenario' && <ScenarioPanel />}
        {tab === 'detalhes' && <Inspector />}
        {tab === 'decisoes' && <AdrPanel />}
        <div style={{ display: tab === 'ia' ? 'contents' : 'none' }}><ChatPanel notify={notify} /></div>
      </div>
    </aside>
  );
}
