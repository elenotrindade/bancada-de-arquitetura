'use client';
import { useState } from 'react';
import {
  createVault, destroyVault, getKey, isUnlocked, lockVault, MIN_PASSPHRASE, setKey as storeKey, unlockVault
} from '@/lib/keyVault';
import { PROVIDERS, type ProviderId } from '@/lib/providers';

export type VaultState = 'none' | 'locked' | 'unlocked';

type Props = {
  provider: ProviderId;
  vault: VaultState;
  setVault: (v: VaultState) => void;
  keyValue: string;
  setKeyValue: (k: string) => void;
  notify: (m: string) => void;
};

/** Campo da chave de API e cofre protegido por senha. Nenhuma chave vai para localStorage. */
export default function KeySettings({ provider, vault, setVault, keyValue, setKeyValue, notify }: Props) {
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(false);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmForget, setConfirmForget] = useState(false);
  const p = PROVIDERS[provider];

  const create = async () => {
    setError('');
    if (!keyValue.trim()) { setError('Cole a chave antes de salvar.'); return; }
    if (pass.length < MIN_PASSPHRASE) { setError(`A senha precisa de pelo menos ${MIN_PASSPHRASE} caracteres.`); return; }
    setBusy(true);
    try {
      await createVault(pass);
      setPass(''); setRemember(false); setVault('unlocked');
      notify('Chave salva e cifrada com a sua senha');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const unlock = async () => {
    setError('');
    setBusy(true);
    try {
      const ok = await unlockVault(pass);
      if (!ok) { setError('Senha incorreta.'); return; }
      setPass(''); setVault('unlocked'); setKeyValue(getKey(provider));
      notify('Chaves desbloqueadas nesta aba');
    } finally { setBusy(false); }
  };

  const forget = async () => {
    await destroyVault();
    setConfirmForget(false); setVault('none'); setKeyValue('');
    notify('Chaves salvas apagadas deste navegador');
  };

  if (vault === 'locked') {
    return (
      <>
        <p className="small" style={{ margin: 0 }}>Há chaves salvas neste navegador, cifradas com a sua senha. Digite a senha para usar.</p>
        <form className="key-row" onSubmit={e => { e.preventDefault(); unlock(); }}>
          <input type="password" id="ai-unlock-pass" autoComplete="current-password" placeholder="Senha do cofre" value={pass} onChange={e => setPass(e.target.value)} aria-label="Senha do cofre" />
          <button type="submit" className="btn small primary" disabled={busy || !pass}>{busy ? 'Abrindo…' : 'Desbloquear'}</button>
        </form>
        {error && <p className="small" role="alert" style={{ margin: 0, color: 'var(--danger)' }}>{error}</p>}
        <div className="row">
          {confirmForget
            ? <><button type="button" className="btn small danger" onClick={forget}>Confirmar: apagar chaves salvas</button><button type="button" className="btn small" onClick={() => setConfirmForget(false)}>Cancelar</button></>
            : <button type="button" className="btn small ghost" onClick={() => setConfirmForget(true)}>Esqueci a senha</button>}
        </div>
        <p className="muted small" style={{ margin: 0 }}>Não existe recuperação de senha: sem ela, ninguém lê as chaves, nem este app. Se esqueceu, apague e cole a chave de novo.</p>
      </>
    );
  }

  return (
    <>
      <div className="field">
        <span>Chave de API (<a href={p.keyUrl} target="_blank" rel="noopener noreferrer">gerar uma</a>)</span>
        <div className="key-row">
          <input
            type={showKey ? 'text' : 'password'} id="ai-key" autoComplete="off" spellCheck={false} placeholder={p.keyHint} value={keyValue}
            onChange={e => { setKeyValue(e.target.value); storeKey(provider, e.target.value).catch(() => notify('Não foi possível atualizar o cofre.')); }}
          />
          <button type="button" className="btn small" onClick={() => setShowKey(v => !v)}>{showKey ? 'Ocultar' : 'Mostrar'}</button>
        </div>
      </div>

      {vault === 'unlocked' ? (
        <>
          <p className="muted small" style={{ margin: 0 }}>Cofre aberto nesta aba. As chaves ficam salvas cifradas com a sua senha; ao recarregar, a senha é pedida de novo.</p>
          <div className="row">
            <button type="button" className="btn small" onClick={() => { lockVault(); setVault('locked'); setKeyValue(''); }}>Bloquear agora</button>
            {confirmForget
              ? <><button type="button" className="btn small danger" onClick={forget}>Confirmar: apagar</button><button type="button" className="btn small" onClick={() => setConfirmForget(false)}>Cancelar</button></>
              : <button type="button" className="btn small ghost" onClick={() => setConfirmForget(true)}>Apagar chaves salvas</button>}
          </div>
        </>
      ) : (
        <>
          <label className="row small" style={{ cursor: 'pointer' }}>
            <input type="checkbox" id="ai-remember" checked={remember} onChange={e => { setRemember(e.target.checked); setError(''); }} />
            Lembrar neste navegador, protegida por senha
          </label>
          {remember ? (
            <form className="field" onSubmit={e => { e.preventDefault(); create(); }}>
              <span>Crie uma senha (mínimo {MIN_PASSPHRASE} caracteres)</span>
              <div className="key-row">
                <input type="password" id="ai-pass" autoComplete="new-password" value={pass} onChange={e => setPass(e.target.value)} aria-label="Senha para proteger a chave" />
                <button type="submit" className="btn small primary" disabled={busy}>{busy ? 'Cifrando…' : 'Salvar protegida'}</button>
              </div>
            </form>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>Sem salvar, a chave fica só na memória desta aba e some ao recarregar.</p>
          )}
          {error && <p className="small" role="alert" style={{ margin: 0, color: 'var(--danger)' }}>{error}</p>}
        </>
      )}
      <p className="muted small" style={{ margin: 0 }}>
        A chave passa pelo servidor deste app só para chegar ao provedor e não é gravada nele. O uso é cobrado na sua conta do provedor.
      </p>
    </>
  );
}

export const initialVaultState = async (hasVault: () => Promise<boolean>): Promise<VaultState> =>
  isUnlocked() ? 'unlocked' : (await hasVault()) ? 'locked' : 'none';
