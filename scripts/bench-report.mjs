// Monta o relatório da bancada: testes funcionais + benchmark de desempenho contra os orçamentos.
// Escreve bench-results/relatorio.md e, no GitHub Actions, o resumo da execução.
// Sai com código 1 se algum orçamento estourar (use BENCH_SOFT=1 para só relatar).
import { appendFile, readFile, writeFile } from 'node:fs/promises';

const ler = async p => { try { return JSON.parse(await readFile(p, 'utf8')); } catch { return null; } };
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);

import { readdir } from 'node:fs/promises';
let perf = null;
try {
  for (const f of await readdir('bench-results/desempenho')) {
    const j = await ler(`bench-results/desempenho/${f}`);
    if (!j) continue;
    perf ??= { cpu: j.cpu };
    perf[f.replace(/\.json$/, '')] = j.valor;
  }
} catch { /* sem resultados */ }
const orc = await ler('tests/perf/orcamentos.json');
const func = await ler('bench-results/funcional.json');
const L = [];
let estouros = 0;

L.push('# Bancada de testes');

if (func) {
  const tests = [];
  const walk = s => { (s.specs || []).forEach(sp => sp.tests.forEach(t => tests.push({ titulo: `${s.title} › ${sp.title}`, arquivo: sp.file, status: t.status, results: t.results }))); (s.suites || []).forEach(walk); };
  (func.suites || []).forEach(walk);
  const funcionais = tests.filter(t => !/perf\//.test(t.arquivo || ''));
  const ok = funcionais.filter(t => t.status === 'expected').length;
  const instaveis = funcionais.filter(t => t.status === 'flaky');
  const falhas = funcionais.filter(t => t.status === 'unexpected');
  L.push('', `## Funcional: ${ok + instaveis.length} de ${funcionais.length} passaram`);
  if (instaveis.length) L.push('', 'Passaram só na segunda tentativa:', ...instaveis.map(t => `- ${t.titulo}`));
  if (falhas.length) {
    L.push('', 'Falharam:');
    for (const t of falhas) {
      const msg = (t.results.at(-1)?.error?.message || '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').filter(Boolean).slice(0, 3).join(' ').slice(0, 300);
      L.push(`- **${t.titulo}**: ${msg}`);
    }
  }
}

if (perf && orc) {
  L.push('', `## Desempenho (CPU ${perf.cpu}x mais lenta)`, '', '| Métrica | Valor | Orçamento | Situação |', '| --- | ---: | ---: | --- |');
  for (const [chave, o] of Object.entries(orc)) {
    if (chave.startsWith('_')) continue;
    const v = get(perf, chave);
    if (typeof v !== 'number') { L.push(`| ${o.rotulo} | sem dado | ${o.max ?? '≥ ' + o.min} | não medido |`); continue; }
    const ruim = (o.max !== undefined && v > o.max) || (o.min !== undefined && v < o.min);
    if (ruim) estouros++;
    L.push(`| ${o.rotulo} | ${v} | ${o.max !== undefined ? '≤ ' + o.max : '≥ ' + o.min} | ${ruim ? 'ESTOUROU' : 'ok'} |`);
  }
  L.push('', '### Detalhe por interação', '', '| Cenário | FPS | Quadro médio | p95 | Pior | Quadros > 50 ms | TBT | Script | Layout | Estilo |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const n of ['n50', 'n150', 'n300']) {
    const r = perf[n]; if (!r) continue;
    for (const k of ['arrastar_um', 'arrastar_todos', 'mover_quadro', 'zoom', 'digitar']) {
      const f = r[k]; if (!f) continue;
      L.push(`| ${n.slice(1)} comp. · ${k.replace('_', ' ')} | ${f.fps} | ${f.media_ms} ms | ${f.p95_ms} ms | ${f.max_ms} ms | ${f.quadros_lentos} | ${f.tbt_ms} ms | ${f.script_ms} ms | ${f.layout_ms} ms | ${f.estilo_ms} ms |`);
    }
  }
  L.push('', '### Outros números', '', '```json', JSON.stringify({ carregamento: perf.carregamento, n50: pick(perf.n50), n150: pick(perf.n150), n300: pick(perf.n300) }, null, 2), '```');
} else {
  L.push('', '## Desempenho', '', 'Sem resultados: o benchmark não rodou ou falhou antes de gravar.');
}

function pick(r) {
  if (!r) return r;
  const out = {};
  for (const [k, v] of Object.entries(r)) if (typeof v !== 'object') out[k] = v;
  return out;
}

const md = L.join('\n') + '\n';
await writeFile('bench-results/relatorio.md', md).catch(async () => {
  const { mkdir } = await import('node:fs/promises');
  await mkdir('bench-results', { recursive: true });
  await writeFile('bench-results/relatorio.md', md);
});
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md);
if (estouros && !process.env.BENCH_SOFT) {
  console.error(`${estouros} orçamento(s) de desempenho estourado(s).`);
  process.exit(1);
}
