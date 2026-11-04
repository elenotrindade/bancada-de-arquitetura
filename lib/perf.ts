/**
 * Marcas de desempenho lidas pela bancada de testes (performance.getEntriesByName).
 * Custo desprezível em produção: são entradas na linha do tempo do navegador.
 */
const P = 'bancada:';

export function mark(name: string) {
  try { performance.mark(P + name); } catch { /* sem suporte */ }
}

export function measure<T>(name: string, fn: () => T): T {
  const start = typeof performance !== 'undefined' ? performance.now() : 0;
  try { return fn(); } finally { record(name, start); }
}

export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = typeof performance !== 'undefined' ? performance.now() : 0;
  try { return await fn(); } finally { record(name, start); }
}

function record(name: string, start: number) {
  try { performance.measure(P + name, { start, end: performance.now() }); } catch { /* sem suporte */ }
}
