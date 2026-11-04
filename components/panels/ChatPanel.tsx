'use client';
import { useEffect, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uid } from '@/lib/boards';
import { boardImage } from '@/lib/exportImage';
import { forgetKeys, loadAi, loadKey, saveAi, saveKey, type AiPrefs } from '@/lib/prefs';
import { PROVIDERS, SYSTEM_PROMPT, type ProviderId } from '@/lib/providers';
import { useBoard } from '@/lib/store';
import { buildSummary } from '@/lib/summary';
import type { ChatMsg } from '@/lib/types';
import { IconSend } from '../Icons';

const QUICK = [
  'Revise meu desenho',
  'Onde está o ponto único de falha?',
  'Simule o pico de tráfego do cenário',
  'Me faça 3 perguntas difíceis sobre o desenho',
  'Avalie minhas decisões (ADRs)'
];

export default function ChatPanel({ notify }: { notify: (m: string) => void }) {
  const chat = useBoard(s => s.chat);
  const setChat = useBoard(s => s.setChat);
  const rf = useReactFlow();
  const [ai, setAiState] = useState<AiPrefs>({ provider: 'anthropic', models: {}, remember: true, attach: false });
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = loadAi();
    setAiState(a);
    const k = loadKey(a.provider);
    setKey(k);
    setSettingsOpen(!k);
  }, []);

  const provider = ai.provider;
  const model = ai.models[provider] ?? PROVIDERS[provider].defaultModel;
  const setAi = (patch: Partial<AiPrefs>) => setAiState(prev => { const next = { ...prev, ...patch }; saveAi(next); return next; });

  const changeProvider = (p: ProviderId) => {
    setAi({ provider: p });
    const k = loadKey(p);
    setKey(k);
    setModelOptions([]);
    if (!k) setSettingsOpen(true);
  };

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [chat]);

  const fetchModels = async () => {
    if (!key) { notify('Informe a chave de API primeiro.'); return; }
    setLoadingModels(true);
    try {
      const res = await fetch('/api/models', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ provider, apiKey: key }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Erro ${res.status}`);
      setModelOptions(j.models || []);
      notify(`${(j.models || []).length} modelos disponíveis na sua conta`);
    } catch (e) {
      notify((e as Error).message);
    } finally { setLoadingModels(false); }
  };

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    if (!key) { setSettingsOpen(true); notify('Informe a chave de API do provedor para conversar.'); return; }
    const s = useBoard.getState();
    let image: string | undefined;
    if (ai.attach && s.nodes.length) {
      try { image = await boardImage(rf.getNodes(), { format: 'jpeg', maxSide: 1600 }); } catch { notify('Não deu para gerar a imagem do quadro; enviando só o resumo.'); }
    }
    const userMsg: ChatMsg = { id: uid(), role: 'user', content: t, withImage: !!image };
    const asst: ChatMsg = { id: uid(), role: 'assistant', content: '' };
    const history = [...s.chat.filter(m => !m.error && m.content.trim()), userMsg].slice(-40);
    setChat(c => [...c, userMsg, asst]);
    setInput('');

    const system = `${SYSTEM_PROMPT}\n\n---\nEstado atual do quadro (atualizado agora):\n\n${buildSummary(s)}`;
    const payload = {
      provider, model, apiKey: key, system,
      messages: history.map(m => ({ role: m.role, content: m.content, ...(m.id === userMsg.id && image ? { image } : {}) }))
    };
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    let acc = '';
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erro ${res.status} ao falar com a IA.`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const snapshot = acc;
        setChat(c => c.map(m => (m.id === asst.id ? { ...m, content: snapshot } : m)));
      }
      if (!acc.trim()) setChat(c => c.map(m => (m.id === asst.id ? { ...m, content: 'O modelo não retornou texto. Tente de novo ou troque de modelo.', error: true } : m)));
    } catch (e) {
      if (ctrl.signal.aborted) {
        setChat(c => (acc.trim() ? c.map(m => (m.id === asst.id ? { ...m, content: acc + '\n\n_(interrompido)_' } : m)) : c.filter(m => m.id !== asst.id)));
      } else {
        setChat(c => c.map(m => (m.id === asst.id ? { ...m, content: (e as Error).message, error: true } : m)));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const configured = !!key;
  const p = PROVIDERS[provider];

  return (
    <div className="chat">
      <details className="chat-settings" open={settingsOpen} onToggle={e => setSettingsOpen((e.target as HTMLDetailsElement).open)}>
        <summary>
          <span className={`status-dot${configured ? ' ok' : ''}`} aria-hidden />
          <span>{configured ? `${p.label} · ${model}` : 'Configurar a IA'}</span>
          <span className="spacer" />
          <span className="muted small">{settingsOpen ? 'Fechar' : 'Alterar'}</span>
        </summary>
        <label className="field"><span>Provedor</span>
          <select id="ai-provider" value={provider} onChange={e => changeProvider(e.target.value as ProviderId)}>
            {(Object.keys(PROVIDERS) as ProviderId[]).map(id => <option key={id} value={id}>{PROVIDERS[id].label}</option>)}
          </select>
        </label>
        <div className="field">
          <span>Chave de API (<a href={p.keyUrl} target="_blank" rel="noreferrer">gerar uma</a>)</span>
          <div className="key-row">
            <input
              type={showKey ? 'text' : 'password'} id="ai-key" autoComplete="off" spellCheck={false} placeholder={p.keyHint} value={key}
              onChange={e => { setKey(e.target.value); saveKey(provider, e.target.value.trim(), ai.remember); }}
            />
            <button type="button" className="btn small" onClick={() => setShowKey(v => !v)}>{showKey ? 'Ocultar' : 'Mostrar'}</button>
          </div>
        </div>
        <label className="row small" style={{ cursor: 'pointer' }}>
          <input type="checkbox" id="ai-remember" checked={ai.remember} onChange={e => { setAi({ remember: e.target.checked }); saveKey(provider, key.trim(), e.target.checked); }} />
          Lembrar a chave neste navegador
        </label>
        <div className="field">
          <span>Modelo</span>
          <div className="key-row">
            <input type="text" id="ai-model" list="ai-models" value={model} onChange={e => setAi({ models: { ...ai.models, [provider]: e.target.value.trim() } })} />
            <button type="button" className="btn small" onClick={fetchModels} disabled={loadingModels}>{loadingModels ? 'Buscando…' : 'Buscar modelos'}</button>
          </div>
          <datalist id="ai-models">{(modelOptions.length ? modelOptions : p.suggestions).map(m => <option key={m} value={m} />)}</datalist>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          A chave fica só neste navegador e é enviada ao provedor a cada mensagem, passando pelo servidor deste app sem ser guardada. O uso é cobrado na sua conta do provedor.
          {' '}<button type="button" className="btn small ghost" onClick={() => { forgetKeys(); setKey(''); notify('Chaves apagadas deste navegador'); }}>Apagar chaves salvas</button>
        </p>
      </details>

      <div className="chat-log" ref={logRef} aria-live="polite">
        {!chat.length && (
          <div className="chat-empty">
            <p style={{ margin: 0 }}>A IA vê o seu quadro a cada mensagem: cenário, componentes, conexões, anotações, áreas e decisões. Peça uma revisão ou faça uma pergunta.</p>
            <p style={{ margin: 0 }}>Ela foi orientada a perguntar mais do que responder, para você treinar o raciocínio.</p>
          </div>
        )}
        {chat.map(m => (
          <div key={m.id} className={`msg ${m.role}${m.error ? ' error' : ''}`}>
            {m.role === 'assistant' && !m.error
              ? (m.content
                ? <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node, ...props }) => { void node; return <a {...props} target="_blank" rel="noreferrer" />; } }}>{m.content}</ReactMarkdown></div>
                : <span className="typing">Pensando…</span>)
              : m.content}
            {m.withImage && <span className="attach">imagem do quadro anexada</span>}
          </div>
        ))}
      </div>

      {!busy && <div className="quick">{QUICK.map(q => <button key={q} type="button" onClick={() => send(q)}>{q}</button>)}</div>}

      <form className="composer" onSubmit={e => { e.preventDefault(); send(input); }}>
        <textarea
          id="chat-input" value={input} placeholder="Pergunte sobre o seu desenho…" aria-label="Mensagem para a IA"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
        />
        <div className="row">
          <label className="attach-toggle"><input type="checkbox" id="ai-attach" checked={ai.attach} onChange={e => setAi({ attach: e.target.checked })} />Anexar imagem do quadro</label>
          <span className="spacer" />
          {chat.length > 0 && !busy && (confirmClear
            ? <><button type="button" className="btn small danger" onClick={() => { setChat(() => []); setConfirmClear(false); }}>Confirmar</button><button type="button" className="btn small" onClick={() => setConfirmClear(false)}>Cancelar</button></>
            : <button type="button" className="btn small ghost" onClick={() => setConfirmClear(true)}>Limpar conversa</button>)}
          {busy
            ? <button type="button" className="btn small" onClick={() => abortRef.current?.abort()}>Parar</button>
            : <button type="submit" className="btn small primary" disabled={!input.trim()}><IconSend width={14} height={14} />Enviar</button>}
        </div>
      </form>
    </div>
  );
}
