import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...p
});

export const IconSelect = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M5 3.5l13 7.2-5.6 1.6-2.3 5.6z" /><path d="M12.6 12.4l4.6 4.6" /></svg>;
export const IconHand = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" /><path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0V11" /><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5" /><path d="M8 11.5 6.6 10a1.6 1.6 0 0 0-2.3 2.2l3.6 4.6A6 6 0 0 0 12.6 19H14a3 3 0 0 0 3-3v-2" /></svg>;
export const IconBlocks = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><path d="M17 13.5v7M13.5 17h7" /></svg>;
export const IconNote = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4.5 4.5h15v10l-5 5h-10z" /><path d="M19.5 14.5h-5v5" /></svg>;
export const IconText = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M5 6V4.5h14V6" /><path d="M12 4.5v15" /><path d="M9 19.5h6" /></svg>;
export const IconFrame = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M7 3v18M17 3v18M3 7h18M3 17h18" /></svg>;
export const IconImage = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m20.5 16-4.5-4.5-8 8" /></svg>;
export const IconUndo = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M9 7 4.5 11.5 9 16" /><path d="M5 11.5h9.5a5 5 0 0 1 0 10H12" /></svg>;
export const IconRedo = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m15 7 4.5 4.5L15 16" /><path d="M19 11.5H9.5a5 5 0 0 0 0 10H12" /></svg>;
export const IconPlus = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const IconMinus = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M5 12h14" /></svg>;
export const IconFit = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>;
export const IconMap = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3.5" y="5" width="17" height="14" rx="2" /><rect x="12" y="11" width="6" height="5" rx="1" /></svg>;
export const IconMagnet = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M5 4.5h4v7a3 3 0 0 0 6 0v-7h4v7a7 7 0 0 1-14 0z" /><path d="M5 8.5h4M15 8.5h4" /></svg>;
export const IconMouse = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="6.5" y="3.5" width="11" height="17" rx="5.5" /><path d="M12 7v3" /></svg>;
export const IconCopy = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="8.5" y="8.5" width="11" height="11" rx="2" /><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></svg>;
export const IconTrash = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4.5 7h15M10 11v6M14 11v6M6.5 7l1 12.5h9l1-12.5M9.5 7V4.5h5V7" /></svg>;
export const IconPanel = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M14.5 4.5v15" /></svg>;
export const IconFront = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="1.5" /><path d="M15 9V5.5A1.5 1.5 0 0 0 13.5 4h-8A1.5 1.5 0 0 0 4 5.5v8A1.5 1.5 0 0 0 5.5 15H9" strokeDasharray="2 2" /></svg>;
export const IconClose = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconSend = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 12 20 4l-5 16-3-7z" /><path d="m12 13 8-9" /></svg>;
