'use client';
import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { useBoard } from '@/lib/store';
import type { ImageNodeT } from '@/lib/types';
import Handles from './Handles';
import NodeActions from './NodeActions';

function ImageNode({ id, data, selected }: NodeProps<ImageNodeT>) {
  const snapshot = useBoard(s => s.snapshot);
  return (
    <>
      <NodeActions id={id} selected={!!selected} />
      <NodeResizer isVisible={!!selected} minWidth={80} minHeight={60} keepAspectRatio onResizeStart={snapshot} />
      <figure className="n-image" style={{ margin: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={data.src} alt={data.caption || 'Imagem adicionada ao quadro'} draggable={false} />
        {data.caption ? <figcaption>{data.caption}</figcaption> : null}
      </figure>
      <Handles />
    </>
  );
}
export default memo(ImageNode);
