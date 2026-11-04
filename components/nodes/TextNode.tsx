'use client';
import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useBoard } from '@/lib/store';
import type { TextNodeT } from '@/lib/types';
import EditableText from './EditableText';
import Handles from './Handles';
import NodeActions from './NodeActions';

function TextNode({ id, data, selected }: NodeProps<TextNodeT>) {
  const snapshot = useBoard(s => s.snapshot);
  const editing = useBoard(s => s.editingId === id);
  return (
    <>
      <NodeActions id={id} selected={!!selected} size={data.size} />
      <NodeResizer isVisible={!!selected && !editing} minWidth={80} minHeight={30} onResizeStart={snapshot} />
      <div className={`n-text ${data.size}${data.text ? '' : ' placeholder'}`}>
        <EditableText id={id} text={data.text} placeholder="Duplo clique para escrever" />
      </div>
      <Handles />
    </>
  );
}
export default memo(TextNode);
