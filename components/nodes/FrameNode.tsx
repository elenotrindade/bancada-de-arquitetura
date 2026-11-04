'use client';
import { memo, useEffect, useRef } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useBoard } from '@/lib/store';
import type { FrameNodeT } from '@/lib/types';
import NodeActions from './NodeActions';

/**
 * Área de agrupamento (frame do Miro). O interior não captura cliques, então dá para
 * selecionar em caixa e mexer nos componentes dentro dela. Arraste pelo título ou pela borda.
 */
function FrameNode({ id, data, selected }: NodeProps<FrameNodeT>) {
  const snapshot = useBoard(s => s.snapshot);
  const editing = useBoard(s => s.editingId === id);
  const setEditing = useBoard(s => s.setEditing);
  const updateNodeData = useBoard(s => s.updateNodeData);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && ref.current) { snapshot(); ref.current.focus(); ref.current.select(); }
  }, [editing, snapshot]);

  return (
    <>
      <NodeActions id={id} selected={!!selected} colors="frame" color={data.color} />
      <NodeResizer isVisible={!!selected} minWidth={200} minHeight={120} onResizeStart={snapshot} />
      <div className="n-frame" style={{ ['--fc' as string]: `var(--frame-${data.color})`, ['--fl' as string]: `var(--frame-line-${data.color})` }}>
        <div className="frame-title frame-drag" onDoubleClick={() => setEditing(id)}>
          {editing ? (
            <input
              ref={ref} type="text" className="nodrag" defaultValue={data.title} aria-label="Título da área"
              onChange={e => updateNodeData(id, { title: e.target.value })}
              onBlur={() => setEditing(null)}
              onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') setEditing(null); }}
            />
          ) : (data.title || 'Área sem título')}
        </div>
        <div className="frame-edge t frame-drag" /><div className="frame-edge r frame-drag" />
        <div className="frame-edge b frame-drag" /><div className="frame-edge l frame-drag" />
      </div>
    </>
  );
}
export default memo(FrameNode);
