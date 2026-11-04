'use client';
import { Handle, Position } from '@xyflow/react';

/** Quatro alças por elemento. Com ConnectionMode.Loose, qualquer alça liga a qualquer outra. */
export default function Handles() {
  return (
    <>
      <Handle type="source" position={Position.Top} id="t" />
      <Handle type="source" position={Position.Right} id="r" />
      <Handle type="source" position={Position.Bottom} id="b" />
      <Handle type="source" position={Position.Left} id="l" />
    </>
  );
}
