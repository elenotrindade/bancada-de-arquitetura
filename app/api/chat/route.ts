import { buildRequest, friendlyError, jsonError, rejectForeign, normalize, sseToText, type InMsg } from '@/lib/llm';
import { isProvider } from '@/lib/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_MESSAGES = 60;
const MAX_CHARS = 200_000;
const MAX_IMAGE = 4_000_000;

export async function POST(req: Request) {
  const refused = rejectForeign(req);
  if (refused) return refused;
  let body: any;
  try { body = await req.json(); } catch { return jsonError(400, 'Requisição inválida.'); }

  const { provider, model, apiKey, system, messages } = body ?? {};
  if (!isProvider(provider)) return jsonError(400, 'Provedor desconhecido.');
  if (typeof model !== 'string' || !/^[\w.\-:/]{1,100}$/.test(model)) return jsonError(400, 'Nome de modelo inválido.');
  if (typeof apiKey !== 'string' || apiKey.length < 8 || apiKey.length > 400) return jsonError(400, 'Informe a chave de API do provedor.');
  if (typeof system !== 'string' || system.length > MAX_CHARS) return jsonError(400, 'Contexto do quadro grande demais.');
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES) return jsonError(400, 'Conversa vazia ou longa demais. Limpe a conversa e tente de novo.');

  let total = system.length;
  const clean: InMsg[] = [];
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return jsonError(400, 'Mensagem inválida.');
    total += m.content.length;
    const msg: InMsg = { role: m.role, content: m.content };
    if (typeof m.image === 'string' && m.role === 'user') {
      if (m.image.length > MAX_IMAGE) return jsonError(413, 'Imagem do quadro grande demais.');
      msg.image = m.image;
    }
    clean.push(msg);
  }
  if (total > MAX_CHARS) return jsonError(413, 'Conversa longa demais. Limpe a conversa e tente de novo.');
  const msgs = normalize(clean);
  if (!msgs.length) return jsonError(400, 'Escreva uma mensagem.');

  const { url, init } = buildRequest(provider, model, apiKey.trim(), system, msgs);
  let upstream: Response;
  try {
    upstream = await fetch(url, { ...init, signal: req.signal });
  } catch {
    return jsonError(502, 'Não foi possível conectar ao provedor de IA. Tente de novo em instantes.');
  }
  if (!upstream.ok || !upstream.body) {
    const raw = await upstream.text().catch(() => '');
    return jsonError(upstream.status || 502, friendlyError(upstream.status, raw));
  }
  return new Response(sseToText(provider, upstream.body), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' }
  });
}
