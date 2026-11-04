'use client';
import type { ReactNode } from 'react';
import { CATALOG, GROUPS, type ComponentKind } from '@/lib/catalog';
import { useBoard } from '@/lib/store';
import type { Tool } from '@/lib/types';
import { IconBlocks, IconFrame, IconHand, IconImage, IconNote, IconRedo, IconSelect, IconText, IconUndo } from './Icons';

type Props = {
  pickerOpen: boolean;
  setPickerOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  onPickImage: () => void;
  onAddComponent: (k: ComponentKind) => void;
  dragMime: string;
};

function ToolBtn({ label, kbd, pressed, onClick, disabled, children }: { label: string; kbd?: string; pressed?: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="tool" aria-label={label} aria-pressed={pressed} onClick={onClick} disabled={disabled}>
      {children}
      <span className="tip">{label}{kbd ? <span className="kbd">{kbd}</span> : null}</span>
    </button>
  );
}

export default function Toolbar({ pickerOpen, setPickerOpen, onPickImage, onAddComponent, dragMime }: Props) {
  const tool = useBoard(s => s.tool);
  const setTool = useBoard(s => s.setTool);
  const undo = useBoard(s => s.undo);
  const redo = useBoard(s => s.redo);
  const canUndo = useBoard(s => s.past.length > 0);
  const canRedo = useBoard(s => s.future.length > 0);
  const pick = (t: Tool) => { setTool(t); setPickerOpen(false); };

  return (
    <>
      <div className="toolbar" role="toolbar" aria-label="Ferramentas">
        <ToolBtn label="Selecionar" kbd="V" pressed={tool === 'select' && !pickerOpen} onClick={() => pick('select')}><IconSelect /></ToolBtn>
        <ToolBtn label="Mover o quadro" kbd="H" pressed={tool === 'hand'} onClick={() => pick('hand')}><IconHand /></ToolBtn>
        <div className="sep" />
        <ToolBtn label="Componentes" kbd="C" pressed={pickerOpen} onClick={() => { setTool('select'); setPickerOpen(o => !o); }}><IconBlocks /></ToolBtn>
        <ToolBtn label="Nota adesiva" kbd="N" pressed={tool === 'note'} onClick={() => pick('note')}><IconNote /></ToolBtn>
        <ToolBtn label="Texto" kbd="T" pressed={tool === 'text'} onClick={() => pick('text')}><IconText /></ToolBtn>
        <ToolBtn label="Área" kbd="F" pressed={tool === 'frame'} onClick={() => pick('frame')}><IconFrame /></ToolBtn>
        <ToolBtn label="Imagem" kbd="I" onClick={() => { setPickerOpen(false); onPickImage(); }}><IconImage /></ToolBtn>
        <div className="sep" />
        <ToolBtn label="Desfazer" kbd="Ctrl Z" onClick={undo} disabled={!canUndo}><IconUndo /></ToolBtn>
        <ToolBtn label="Refazer" kbd="Ctrl Shift Z" onClick={redo} disabled={!canRedo}><IconRedo /></ToolBtn>
      </div>

      {pickerOpen && (
        <div className="picker" role="dialog" aria-label="Componentes">
          <div className="muted small">Clique para adicionar no centro ou arraste para o quadro.</div>
          {GROUPS.map(g => (
            <div key={g.id} className="picker-group" style={{ ['--gc' as string]: g.color }}>
              <div className="eyebrow">{g.label}</div>
              <div className="picker-items">
                {(Object.keys(CATALOG) as ComponentKind[]).filter(k => CATALOG[k].g === g.id).map(k => (
                  <button
                    key={k} type="button" className="pick" draggable title={CATALOG[k].what} aria-label={CATALOG[k].label}
                    onClick={() => onAddComponent(k)}
                    onDragStart={e => { e.dataTransfer.setData(dragMime, k); e.dataTransfer.effectAllowed = 'copy'; }}
                  >
                    <span className="chip">{CATALOG[k].abbr}</span><span>{CATALOG[k].label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
