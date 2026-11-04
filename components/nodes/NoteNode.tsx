'use client';
import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useIsEditing } from '@/lib/editing';
import { useBoard } from '@/lib/store';
import type { NoteNodeT } from '@/lib/types';
import EditableText from './EditableText';
import Handles from './Handles';
import NodeActions from './NodeActions';
import { sameNodeView } from './memo';

const snapshotNow = () => useBoard.getState().snapshot();

function NoteNode({ id, data, selected }: NodeProps<NoteNodeT>) {
  const editing = useIsEditing(id);
  return (
    <>
      {selected && <NodeActions id={id} colors="note" color={data.color} />}
      <NodeResizer isVisible={!!selected && !editing} minWidth={120} minHeight={80} onResizeStart={snapshotNow} />
      <div className={`n-note${data.text ? '' : ' placeholder'}`} style={{ ['--nc' as string]: `var(--note-${data.color})` }}>
        <EditableText id={id} text={data.text} placeholder="Duplo clique para escrever" />
      </div>
      <Handles />
    </>
  );
}
export default memo(NoteNode, sameNodeView);
