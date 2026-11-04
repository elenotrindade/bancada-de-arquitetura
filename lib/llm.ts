import type { ProviderId } from './providers';

/** Código compartilhado pelas rotas de API. Nunca registra a chave em log. */

export type InMsg = { role: 'user' | 'assistant'; content: string; image?: string };

export function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

/**
 * Aceita só requisições feitas pela própria página do app: Origin igual ao host,
 * Sec-Fetch-Site same-origin (quando o navegador envia) e corpo JSON.
 * Impede que outros sites usem estas rotas pelo navegador de um visitante.
 * Scripts fora do navegador podem forjar cabeçalhos; para eles vale o limite de requisições do Firewall da Vercel.
 */
export function rejectForeign(req: Request): Response | null {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  let sameHost = false;
  try { sameHost = !!origin && !!host && new URL(origin).host === host; } catch { sameHost = false; }
  const site = req.headers.get('sec-fetch-site');
  if (!sameHost || (site && site !== 'same-origin')) return jsonError(403, 'Requisição recusada: use o app pelo próprio site.');
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return jsonError(415, 'Tipo de conteúdo inválido.');
  const len = Number(req.headers.get('content-length') || 0);
  if (len > 4_500_000) return jsonError(413, 'Requisição grande demais.');
  return null;
}

export function friendlyError(status: number, raw: string): string {
  let detail = '';
  try {
    const j = JSON.parse(raw);
    detail = j?.error?.message || j?.message || '';
  } catch { detail = raw.slice(0, 200); }
  detail = String(detail).slice(0, 300);
  if (status === 401 || status === 403) return 'Chave de API inválida ou sem permissão para este modelo.' + (detail ? ` (${detail})` : '');
  if (status === 404) return 'Modelo não encontrado neste provedor. Use "Buscar modelos" para ver os disponíveis na sua conta.' + (detail ? ` (${detail})` : '');
  if (status === 429) return 'Limite de uso atingido ou conta sem créditos no provedor.' + (detail ? ` (${detail})` : '');
  if (status === 400) return 'O provedor recusou a requisição.' + (detail ? ` (${detail})` : '');
  return `O provedor respondeu com erro ${status}.` + (detail ? ` (${detail})` : '');
}

const parseDataUrl = (url: string) => {
  const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(url);
  return m ? { mime: m[1], data: m[2] } : null;
};

/** Junta mensagens consecutivas do mesmo papel e garante que a conversa comece pelo usuário. */
export function normalize(messages: InMsg[]): InMsg[] {
  const out: InMsg[] = [];
  for (const m of messages) {
    if (!m.content.trim() && !m.image) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content += '\n\n' + m.content;
      if (m.image) last.image = m.image;
    } else out.push({ ...m });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

export function buildRequest(provider: ProviderId, model: string, apiKey: string, system: string, messages: InMsg[]): { url: string; init: RequestInit } {
  if (provider === 'anthropic') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model, max_tokens: 4096, system, stream: true,
          messages: messages.map(m => {
            const img = m.image ? parseDataUrl(m.image) : null;
            if (!img) return { role: m.role, content: m.content };
            return { role: m.role, content: [{ type: 'image', source: { type: 'base64', media_type: img.mime, data: img.data } }, { type: 'text', text: m.content || 'Imagem do quadro.' }] };
          })
        })
      }
    };
  }
  if (provider === 'openai') {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model, stream: true, max_completion_tokens: 8000,
          messages: [
            { role: 'system', content: system },
            ...messages.map(m => (m.image && m.role === 'user'
              ? { role: 'user', content: [{ type: 'text', text: m.content || 'Imagem do quadro.' }, { type: 'image_url', image_url: { url: m.image } }] }
              : { role: m.role, content: m.content }))
          ]
        })
      }
    };
  }
  const name = model.replace(/^models\//, '');
  return {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:streamGenerateContent?alt=sse`,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        generationConfig: { maxOutputTokens: 8000 },
        contents: messages.map(m => {
          const img = m.image ? parseDataUrl(m.image) : null;
          const parts: unknown[] = [];
          if (img) parts.push({ inlineData: { mimeType: img.mime, data: img.data } });
          parts.push({ text: m.content || 'Imagem do quadro.' });
          return { role: m.role === 'assistant' ? 'model' : 'user', parts };
        })
      })
    }
  };
}

/** Extrai o texto de cada evento SSE do provedor. Lança erro quando o evento é de erro. */
function extract(provider: ProviderId, data: string): string {
  if (data === '[DONE]') return '';
  let j: any;
  try { j = JSON.parse(data); } catch { return ''; }
  if (j?.error) throw new Error(j.error.message || 'Erro do provedor durante a resposta.');
  if (provider === 'anthropic') {
    if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') return j.delta.text || '';
    return '';
  }
  if (provider === 'openai') return j.choices?.[0]?.delta?.content || '';
  const parts = j.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.filter((p: any) => !p.thought && typeof p.text === 'string').map((p: any) => p.text).join('');
}

/** Converte o stream SSE do provedor num stream de texto puro. */
export function sseToText(provider: ProviderId, body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = body.getReader();
  let buf = '';
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          if (buf.trim().startsWith('data:')) {
            const t = extract(provider, buf.trim().slice(5).trim());
            if (t) controller.enqueue(enc.encode(t));
          }
          controller.close();
          return;
        }
        buf += dec.decode(value, { stream: true });
        const parts = buf.split(/\r?\n/);
        buf = parts.pop() ?? '';
        let out = '';
        for (const line of parts) {
          if (!line.startsWith('data:')) continue;
          out += extract(provider, line.slice(5).trim());
        }
        if (out) controller.enqueue(enc.encode(out));
      } catch (e) {
        controller.enqueue(enc.encode(`\n\n[Erro: ${(e as Error).message}]`));
        controller.close();
        reader.cancel().catch(() => {});
      }
    },
    cancel() { reader.cancel().catch(() => {}); }
  });
}
