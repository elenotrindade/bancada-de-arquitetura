import { friendlyError, jsonError } from '@/lib/llm';
import { isProvider } from '@/lib/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SKIP = /(audio|realtime|transcribe|tts|image|dall-e|search|embedding|moderation|instruct|whisper|davinci|babbage|codex)/i;

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return jsonError(400, 'Requisição inválida.'); }
  const { provider, apiKey } = body ?? {};
  if (!isProvider(provider)) return jsonError(400, 'Provedor desconhecido.');
  if (typeof apiKey !== 'string' || apiKey.length < 8 || apiKey.length > 400) return jsonError(400, 'Informe a chave de API do provedor.');
  const key = apiKey.trim();

  let url: string, headers: Record<string, string>;
  if (provider === 'anthropic') { url = 'https://api.anthropic.com/v1/models?limit=100'; headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' }; }
  else if (provider === 'openai') { url = 'https://api.openai.com/v1/models'; headers = { authorization: `Bearer ${key}` }; }
  else { url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200'; headers = { 'x-goog-api-key': key }; }

  let res: Response;
  try { res = await fetch(url, { headers }); } catch { return jsonError(502, 'Não foi possível conectar ao provedor de IA.'); }
  const raw = await res.text();
  if (!res.ok) return jsonError(res.status, friendlyError(res.status, raw));

  let j: any;
  try { j = JSON.parse(raw); } catch { return jsonError(502, 'Resposta inesperada do provedor.'); }
  let models: string[] = [];
  if (provider === 'gemini') {
    models = (j.models ?? [])
      .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent') && /gemini/.test(m.name))
      .map((m: any) => String(m.name).replace(/^models\//, ''));
  } else {
    models = (j.data ?? []).map((m: any) => String(m.id));
    if (provider === 'openai') models = models.filter(id => /^(gpt|o\d|chatgpt)/.test(id) && !SKIP.test(id));
  }
  models = Array.from(new Set(models)).filter(m => !SKIP.test(m) || provider === 'anthropic').sort((a, b) => b.localeCompare(a));
  return Response.json({ models }, { headers: { 'Cache-Control': 'no-store' } });
}
