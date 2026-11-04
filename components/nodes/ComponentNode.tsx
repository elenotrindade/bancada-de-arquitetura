'use client';
import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { CATALOG, groupOf } from '@/lib/catalog';
import type { ComponentNodeT } from '@/lib/types';
import Handles from './Handles';
import NodeActions from './NodeActions';
import { sameNodeView } from './memo';

function ComponentNode({ id, data, selected }: NodeProps<ComponentNodeT>) {
  const c = CATALOG[data.kind];
  const g = groupOf(data.kind);
  return (
    <>
      {selected && <NodeActions id={id} />}
      <div className="n-comp" style={{ ['--gc' as string]: g.color }}>
        <div className="n-head"><span className="chip">{c.abbr}</span><span className="n-type">{c.label}</span></div>
        <div className="n-name">{data.name || c.label}</div>
        {data.tech ? <div className="n-tech">{data.tech}</div> : null}
      </div>
      <Handles />
    </>
  );
}
export default memo(ComponentNode, sameNodeView);
