'use client';
import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react';
import { toJpeg, toPng } from 'html-to-image';

const bg = () => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#ffffff';

/** Gera uma imagem do quadro inteiro (não só da parte visível). */
export async function boardImage(nodes: Node[], opts: { format: 'png' | 'jpeg'; maxSide?: number } = { format: 'png' }): Promise<string> {
  const el = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!el || !nodes.length) throw new Error('O quadro está vazio.');
  const b = getNodesBounds(nodes);
  const pad = 80;
  let w = Math.max(640, Math.round(b.width + pad * 2));
  let h = Math.max(400, Math.round(b.height + pad * 2 + 30));
  const max = opts.maxSide ?? 4000;
  const scale = Math.min(1, max / Math.max(w, h));
  w = Math.round(w * scale);
  h = Math.round(h * scale);
  const vp = getViewportForBounds(b, w, h, 0.05, 2, 0.08);
  const options = {
    backgroundColor: bg(),
    width: w,
    height: h,
    pixelRatio: opts.format === 'png' ? 2 : 1,
    style: { width: `${w}px`, height: `${h}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
    filter: (n: HTMLElement) => !(n.classList && (n.classList.contains('react-flow__handle') || n.classList.contains('react-flow__resize-control')))
  };
  return opts.format === 'png' ? toPng(el, options) : toJpeg(el, { ...options, quality: 0.85 });
}

export function download(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadText(text: string, filename: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  download(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
