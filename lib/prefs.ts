'use client';
import type { ProviderId } from './providers';

/** Preferências de interface. Nenhuma chave ou segredo passa por aqui. */
export type Prefs = { snap: boolean; minimap: boolean; wheel: 'zoom' | 'pan'; scenario: string };
export type AiPrefs = { provider: ProviderId; models: Partial<Record<ProviderId, string>>; attach: boolean };

const PREFS = 'bancada:prefs';
const AI = 'bancada:ai';

const read = <T extends object>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    if (!v) return fallback;
    const parsed = JSON.parse(v);
    if (!parsed || typeof parsed !== 'object') return fallback;
    const out = { ...fallback } as Record<string, unknown>;
    for (const key of Object.keys(fallback)) {
      if (key in parsed && typeof parsed[key] === typeof (fallback as Record<string, unknown>)[key]) out[key] = parsed[key];
    }
    return out as T;
  } catch { return fallback; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

export const loadPrefs = (): Prefs => read<Prefs>(PREFS, { snap: true, minimap: true, wheel: 'zoom', scenario: 'encurtador' });
export const savePrefs = (p: Prefs) => write(PREFS, p);
export function loadAi(): AiPrefs {
  const a = read<AiPrefs>(AI, { provider: 'anthropic', models: {}, attach: false });
  if (!['anthropic', 'openai', 'gemini'].includes(a.provider)) a.provider = 'anthropic';
  return a;
}
export const saveAi = (p: AiPrefs) => write(AI, { provider: p.provider, models: p.models, attach: p.attach });
