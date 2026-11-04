'use client';
import { createStore, del, get, set, type UseStore } from 'idb-keyval';
import type { ProviderId } from './providers';

/**
 * Cofre das chaves de API.
 *
 * - Sem cofre: a chave fica só na memória desta aba e some ao recarregar. Nada é gravado.
 * - Com cofre: as chaves são cifradas com AES-GCM 256 usando uma chave derivada da senha
 *   do usuário (PBKDF2-SHA256, 600 mil iterações, sal aleatório). No navegador só existe o
 *   texto cifrado; sem a senha ninguém consegue lê-lo, nem quem copiar os dados do navegador.
 * - A chave derivada é não exportável e vive só em memória enquanto o cofre está aberto.
 * - Nada vai para localStorage ou sessionStorage. Chaves antigas gravadas lá são apagadas.
 */

const PROVIDER_IDS: ProviderId[] = ['anthropic', 'openai', 'gemini'];
const RECORD = 'chaves';
const ITERATIONS = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

type VaultRecord = { v: 1; salt: string; iter: number; iv: string; data: string };

const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));
type Bytes = ReturnType<typeof randomBytes>;

const toB64 = (b: Uint8Array) => { let s = ''; b.forEach(x => { s += String.fromCharCode(x); }); return btoa(s); };
const fromB64 = (s: string): Bytes => { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };

let store: UseStore | null = null;
const vaultStore = () => (store ??= createStore('bancada-cofre', 'cofre'));

const memory: Partial<Record<ProviderId, string>> = {};
let vaultKey: CryptoKey | null = null;
let vaultSalt: Bytes | null = null;

async function deriveKey(passphrase: string, salt: Bytes, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function writeVault() {
  if (!vaultKey || !vaultSalt) return;
  const iv = randomBytes(12);
  const plain = enc.encode(JSON.stringify(memory));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, vaultKey, plain));
  const rec: VaultRecord = { v: 1, salt: toB64(vaultSalt), iter: ITERATIONS, iv: toB64(iv), data: toB64(data) };
  await set(RECORD, rec, vaultStore());
}

export const MIN_PASSPHRASE = 8;

export const getKey = (p: ProviderId): string => memory[p] ?? '';
export const isUnlocked = () => vaultKey !== null;

export async function hasVault(): Promise<boolean> {
  try { return !!(await get<VaultRecord>(RECORD, vaultStore())); } catch { return false; }
}

/** Atualiza a chave em memória e, se o cofre estiver aberto, regrava o texto cifrado. */
export async function setKey(p: ProviderId, key: string): Promise<void> {
  const k = key.trim();
  if (k) memory[p] = k; else delete memory[p];
  if (vaultKey) await writeVault();
}

/** Cria o cofre com as chaves que estão em memória. */
export async function createVault(passphrase: string): Promise<void> {
  if (passphrase.length < MIN_PASSPHRASE) throw new Error(`A senha precisa de pelo menos ${MIN_PASSPHRASE} caracteres.`);
  vaultSalt = randomBytes(16);
  vaultKey = await deriveKey(passphrase, vaultSalt, ITERATIONS);
  await writeVault();
}

/** Abre o cofre. Retorna false se a senha estiver errada (o AES-GCM recusa o texto). */
export async function unlockVault(passphrase: string): Promise<boolean> {
  const rec = await get<VaultRecord>(RECORD, vaultStore());
  if (!rec) return false;
  const salt = fromB64(rec.salt);
  const key = await deriveKey(passphrase, salt, rec.iter || ITERATIONS);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(rec.iv) }, key, fromB64(rec.data));
    const obj = JSON.parse(dec.decode(plain)) as Record<string, unknown>;
    PROVIDER_IDS.forEach(p => { if (typeof obj[p] === 'string') memory[p] = obj[p] as string; });
    vaultKey = key;
    vaultSalt = salt;
    return true;
  } catch {
    return false;
  }
}

/** Fecha o cofre e esquece as chaves desta aba. O texto cifrado continua salvo. */
export function lockVault() {
  vaultKey = null;
  vaultSalt = null;
  PROVIDER_IDS.forEach(p => { delete memory[p]; });
}

/** Apaga o cofre e as chaves em memória. */
export async function destroyVault() {
  lockVault();
  try { await del(RECORD, vaultStore()); } catch { /* armazenamento indisponível */ }
}

/** Remove chaves em texto puro deixadas por versões anteriores do app. */
export function purgeLegacyKeys() {
  for (const s of [globalThis.localStorage, globalThis.sessionStorage]) {
    try {
      if (!s) continue;
      for (let i = s.length - 1; i >= 0; i--) {
        const k = s.key(i);
        if (k && k.startsWith('bancada:key:')) s.removeItem(k);
      }
    } catch { /* armazenamento bloqueado */ }
  }
}
