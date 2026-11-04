'use client';
import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useBoard } from '@/lib/store';
import type { NoteNodeT } from '@/lib/types';
import EditableText from './EditableText';
import Handles from './Handles';
import NodeActions from './NodeActions';

function NoteNode({ id, data, selected }: NodeProps<NoteNodeT>) {
  const snapshot = useBoard(s => s.snapshot);
  const editing = useBoard(s => s.editingId === id);
  return (
    <>
      <NodeActions id={id} selected={!!selected} colors="note" color={data.color} />
      <NodeResizer isVisible={!!selected && !editing} minWidth={120} minHeight={80} onResizeStart={snapshot} />
      <div className={`n-note${data.text ? '' : ' placeholder'}`} style={{ ['--nc' as string]: `var(--note-${data.color})` }}>
        <EditableText id={id} text={data.text} placeholder="Duplo clique para escrever" />
      </div>
      <Handles />
    </>
  );
}
export default memo(NoteNode);
