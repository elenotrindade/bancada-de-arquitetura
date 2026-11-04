'use client';
import type { ProviderId } from './providers';

export type Prefs = { snap: boolean; minimap: boolean; wheel: 'zoom' | 'pan'; scenario: string };
export type AiPrefs = { provider: ProviderId; models: Partial<Record<ProviderId, string>>; remember: boolean; attach: boolean };

const PREFS = 'bancada:prefs';
const AI = 'bancada:ai';
const KEY = (p: ProviderId) => `bancada:key:${p}`;

const read = <T,>(k: string, fallback: T): T => {
  try { const v = localStorage.getItem(k); return v ? { ...fallback, ...JSON.parse(v) } : fallback; } catch { return fallback; }
};
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } };

export const loadPrefs = (): Prefs => read<Prefs>(PREFS, { snap: true, minimap: true, wheel: 'zoom', scenario: 'encurtador' });
export const savePrefs = (p: Prefs) => write(PREFS, p);
export const loadAi = (): AiPrefs => read<AiPrefs>(AI, { provider: 'anthropic', models: {}, remember: true, attach: false });
export const saveAi = (p: AiPrefs) => write(AI, p);

/** A chave fica só neste navegador, e só se a pessoa marcar "Lembrar". */
export const loadKey = (p: ProviderId): string => { try { return localStorage.getItem(KEY(p)) || sessionStorage.getItem(KEY(p)) || ''; } catch { return ''; } };
export function saveKey(p: ProviderId, key: string, remember: boolean) {
  try {
    if (remember) { localStorage.setItem(KEY(p), key); sessionStorage.removeItem(KEY(p)); }
    else { sessionStorage.setItem(KEY(p), key); localStorage.removeItem(KEY(p)); }
  } catch { /* sem armazenamento */ }
}
export function forgetKeys() {
  try { (['anthropic', 'openai', 'gemini'] as const).forEach(p => { localStorage.removeItem(KEY(p)); sessionStorage.removeItem(KEY(p)); }); } catch { /* */ }
}
