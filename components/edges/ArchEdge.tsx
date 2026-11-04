'use client';
import { memo, useEffect, useRef } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath, getStraightPath, type EdgeProps } from '@xyflow/react';
import { COMM_OPTIONS, isAsyncLabel } from '@/lib/catalog';
import { useBoard } from '@/lib/store';
import type { AppEdge } from '@/lib/types';

function ArchEdge(p: EdgeProps<AppEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected, data } = p;
  const pathType = data?.pathType ?? 'smoothstep';
  const args = { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition };
  const [path, labelX, labelY] =
    pathType === 'straight' ? getStraightPath(args)
      : pathType === 'bezier' ? getBezierPath(args)
        : getSmoothStepPath({ ...args, borderRadius: 10 });

  const editing = useBoard(s => s.editingId === id);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && ref.current) { useBoard.getState().snapshot(); ref.current.focus(); ref.current.select(); }
  }, [editing]);

  const label = data?.label ?? '';
  const text = label + (data?.async ? ' · assíncrona' : '');

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={22} style={data?.async ? { strokeDasharray: '6 5' } : undefined} />
      {(text || editing) && (
        <EdgeLabelRenderer>
          <div
            className={`edge-label nodrag nopan${selected ? ' selected' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onDoubleClick={() => useBoard.getState().setEditing(id)}
          >
            {editing ? (
              <input
                ref={ref} type="text" list="comm-options" defaultValue={label} aria-label="Como se comunicam"
                onChange={e => {
                  const v = e.target.value;
                  useBoard.getState().updateEdgeData(id, isAsyncLabel(v) && !data?.async ? { label: v, async: true } : { label: v });
                }}
                onBlur={() => useBoard.getState().setEditing(null)}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') useBoard.getState().setEditing(null); }}
              />
            ) : text}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
export default memo(ArchEdge);

export function CommOptions() {
  return <datalist id="comm-options">{COMM_OPTIONS.map(o => <option key={o} value={o} />)}</datalist>;
}
