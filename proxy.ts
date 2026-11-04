import { NextResponse, type NextRequest } from 'next/server';

/**
 * Content Security Policy com nonce por requisição.
 * - Só executam scripts que o próprio Next.js marcou com o nonce desta resposta.
 * - connect-src 'self': a página só conversa com o próprio servidor. Mesmo que um script
 *   malicioso rodasse, não conseguiria enviar a chave de API para outro endereço por fetch.
 * - img-src sem domínios externos: imagens não servem para vazar dados nem rastrear.
 */
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === 'development';
  const https = request.nextUrl.protocol === 'https:';

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Atributos style inline são usados pelo canvas para posicionar elementos.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "media-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ['upgrade-insecure-requests'] : [])
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' }
      ]
    }
  ]
};
