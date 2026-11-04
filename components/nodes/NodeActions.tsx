'use client';
import { NodeToolbar, Position, useReactFlow } from '@xyflow/react';
import { NOTE_COLORS } from '@/lib/catalog';
import { useBoard } from '@/lib/store';
import { IconCopy, IconFront, IconTrash } from '../Icons';

type Props = {
  id: string;
  selected: boolean;
  colors?: 'note' | 'frame';
  color?: string;
  size?: 's' | 'm' | 'l';
};

/** Barra flutuante sobre o elemento selecionado, como no Miro. Só aparece quando um único nó está selecionado. */
export default function NodeActions({ id, selected, colors, color, size }: Props) {
  const { deleteElements } = useReactFlow();
  const single = useBoard(s => s.nodes.filter(n => n.selected).length === 1);
  const updateNodeData = useBoard(s => s.updateNodeData);
  const snapshot = useBoard(s => s.snapshot);
  const duplicate = useBoard(s => s.duplicate);
  const setNodes = useBoard(s => s.setNodes);

  const bringFront = () => {
    snapshot();
    setNodes(ns => {
      const me = ns.find(n => n.id === id);
      if (!me) return ns;
      return [...ns.filter(n => n.id !== id), me];
    });
  };

  return (
    <NodeToolbar isVisible={selected && single} position={Position.Top} offset={12}>
      <div className="node-actions nodrag nopan" role="toolbar" aria-label="Ações do elemento">
        {colors && NOTE_COLORS.map(c => (
          <button
            key={c.id} type="button" className="swatch" aria-label={`Cor ${c.label}`} aria-pressed={color === c.id}
            style={{ ['--sw' as string]: colors === 'note' ? `var(--note-${c.id})` : `var(--frame-line-${c.id})` }}
            onClick={() => { snapshot(); updateNodeData(id, { color: c.id }); }}
          />
        ))}
        {size && (['s', 'm', 'l'] as const).map(s => (
          <button key={s} type="button" className="size-btn" aria-pressed={size === s} aria-label={`Tamanho ${s.toUpperCase()}`}
            onClick={() => { snapshot(); updateNodeData(id, { size: s }); }}>{s.toUpperCase()}</button>
        ))}
        {(colors || size) && <span className="sep" />}
        <button type="button" className="tool" aria-label="Duplicar" title="Duplicar (Ctrl+D)" onClick={() => duplicate([id])}><IconCopy /></button>
        {colors !== 'frame' && <button type="button" className="tool" aria-label="Trazer para frente" title="Trazer para frente" onClick={bringFront}><IconFront /></button>}
        <button type="button" className="tool" aria-label="Remover" title="Remover (Delete)" onClick={() => deleteElements({ nodes: [{ id }] })}><IconTrash /></button>
      </div>
    </NodeToolbar>
  );
}
