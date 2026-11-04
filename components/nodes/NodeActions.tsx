'use client';
import { NodeToolbar, Position } from '@xyflow/react';
import { NOTE_COLORS } from '@/lib/catalog';
import { useBoard } from '@/lib/store';
import { IconCopy, IconFront, IconTrash } from '../Icons';

type Props = {
  id: string;
  colors?: 'note' | 'frame';
  color?: string;
  size?: 's' | 'm' | 'l';
};

const st = () => useBoard.getState();

/** Exatamente um elemento selecionado? Para no segundo, sem criar arrays. */
const singleSelected = (s: ReturnType<typeof useBoard.getState>) => {
  let c = 0;
  for (const n of s.nodes) if (n.selected && ++c > 1) return false;
  return c === 1;
};

/**
 * Barra flutuante sobre o elemento selecionado, como no Miro.
 * Os nós só montam este componente quando estão selecionados, então ele não
 * custa nada para os demais elementos do quadro.
 */
export default function NodeActions({ id, colors, color, size }: Props) {
  const single = useBoard(singleSelected);

  const remove = () => {
    const s = st();
    s.snapshot();
    s.setNodes(ns => ns.filter(n => n.id !== id));
    s.setEdges(es => es.filter(e => e.source !== id && e.target !== id));
  };

  const bringFront = () => {
    const s = st();
    s.snapshot();
    s.setNodes(ns => {
      const me = ns.find(n => n.id === id);
      return me ? [...ns.filter(n => n.id !== id), me] : ns;
    });
  };

  return (
    <NodeToolbar isVisible={single} position={Position.Top} offset={12} className="node-toolbar">
      <div className="node-actions nodrag nopan" role="toolbar" aria-label="Ações do elemento" onPointerDown={e => e.stopPropagation()}>
        {colors && NOTE_COLORS.map(c => (
          <button
            key={c.id} type="button" className="swatch" aria-label={`Cor ${c.label}`} aria-pressed={color === c.id}
            style={{ ['--sw' as string]: colors === 'note' ? `var(--note-${c.id})` : `var(--frame-line-${c.id})` }}
            onClick={() => { st().snapshot(); st().updateNodeData(id, { color: c.id }); }}
          />
        ))}
        {size && (['s', 'm', 'l'] as const).map(s => (
          <button key={s} type="button" className="size-btn" aria-pressed={size === s} aria-label={`Tamanho ${s.toUpperCase()}`}
            onClick={() => { st().snapshot(); st().updateNodeData(id, { size: s }); }}>{s.toUpperCase()}</button>
        ))}
        {(colors || size) && <span className="sep" />}
        <button type="button" className="tool" aria-label="Duplicar" title="Duplicar (Ctrl+D)" onClick={() => st().duplicate([id])}><IconCopy /></button>
        {colors !== 'frame' && <button type="button" className="tool" aria-label="Trazer para frente" title="Trazer para frente" onClick={bringFront}><IconFront /></button>}
        <button type="button" className="tool" aria-label="Remover" title="Remover (Delete)" onClick={remove}><IconTrash /></button>
      </div>
    </NodeToolbar>
  );
}
