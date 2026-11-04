'use client';
import { useReactFlow, useViewport } from '@xyflow/react';
import type { Prefs } from '@/lib/prefs';
import { IconFit, IconMagnet, IconMap, IconMinus, IconMouse, IconPlus } from './Icons';

export default function ZoomBar({ prefs, setPrefs }: { prefs: Prefs; setPrefs: (p: Prefs) => void }) {
  const { zoom } = useViewport();
  const rf = useReactFlow();
  return (
    <>
      <div className="viewbar" role="toolbar" aria-label="Exibição">
        <button type="button" className="tool" aria-pressed={prefs.snap} aria-label="Grade magnética" onClick={() => setPrefs({ ...prefs, snap: !prefs.snap })}>
          <IconMagnet /><span className="tip">Grade magnética {prefs.snap ? 'ligada' : 'desligada'}</span>
        </button>
        <button type="button" className="tool" aria-pressed={prefs.wheel === 'pan'} aria-label="Modo da roda do mouse" onClick={() => setPrefs({ ...prefs, wheel: prefs.wheel === 'zoom' ? 'pan' : 'zoom' })}>
          <IconMouse /><span className="tip">{prefs.wheel === 'zoom' ? 'Roda do mouse: zoom (troque para trackpad)' : 'Trackpad: dois dedos movem, pinça dá zoom'}</span>
        </button>
      </div>
      <div className="zoombar" role="toolbar" aria-label="Zoom">
        <button type="button" className="tool" aria-pressed={prefs.minimap} aria-label="Minimapa" onClick={() => setPrefs({ ...prefs, minimap: !prefs.minimap })}>
          <IconMap /><span className="tip">Minimapa</span>
        </button>
        <button type="button" className="tool" aria-label="Diminuir zoom" onClick={() => rf.zoomOut({ duration: 150 })}><IconMinus /><span className="tip">Diminuir <span className="kbd">Ctrl −</span></span></button>
        <button type="button" className="zoom-pct" onClick={() => rf.zoomTo(1, { duration: 150 })} title="Voltar a 100% (Ctrl 0)">{Math.round(zoom * 100)}%</button>
        <button type="button" className="tool" aria-label="Aumentar zoom" onClick={() => rf.zoomIn({ duration: 150 })}><IconPlus /><span className="tip">Aumentar <span className="kbd">Ctrl +</span></span></button>
        <button type="button" className="tool" aria-label="Enquadrar tudo" onClick={() => rf.fitView({ padding: 0.2, maxZoom: 1, duration: 250 })}><IconFit /><span className="tip">Enquadrar tudo <span className="kbd">Shift 1</span></span></button>
      </div>
    </>
  );
}
