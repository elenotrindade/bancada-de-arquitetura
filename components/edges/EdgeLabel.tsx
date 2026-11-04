'use client';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStore, type ReactFlowState } from '@xyflow/react';

const domNodeOf = (s: ReactFlowState) => s.domNode;
const layers = new WeakMap<Element, HTMLElement>();

/**
 * Igual ao EdgeLabelRenderer do React Flow, mas sem buscar a camada no DOM a cada
 * atualização: o original fazia um querySelector por conexão a cada quadro de animação.
 */
export default function EdgeLabel({ children }: { children: ReactNode }) {
  const dom = useStore(domNodeOf);
  if (!dom) return null;
  let layer = layers.get(dom);
  if (!layer) {
    const found = dom.querySelector<HTMLElement>('.react-flow__edgelabel-renderer');
    if (!found) return null;
    layers.set(dom, found);
    layer = found;
  }
  return createPortal(children, layer);
}
