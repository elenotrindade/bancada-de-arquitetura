import { mkdir, writeFile } from 'node:fs/promises';
import type { CDPSession, Page } from '@playwright/test';
import { App, expect, quadroGrande, test } from '../fixtures';

/**
 * Benchmark de desempenho. CPU desacelerada 4x (como o Lighthouse faz) para simular
 * um notebook comum. Cada cenário mede quadros por segundo, tempo de quadro (p95),
 * tarefas longas e quanto tempo o navegador gastou em script, layout e estilo.
 */

const CPU = 4;
const resultados: Record<string, unknown> = { cpu: CPU, data: new Date().toISOString() };

type Frames = {
  fps: number; media_ms: number; p95_ms: number; max_ms: number; quadros_lentos: number;
  tbt_ms: number; script_ms: number; layout_ms: number; estilo_ms: number; duracao_ms: number;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (arr: number[], p: number) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mediana = (arr: number[]) => pct(arr, 0.5);

async function cdpDe(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  return cdp;
}

async function metricas(cdp: CDPSession) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(metrics.map(m => [m.name, m.value])) as Record<string, number>;
}

async function gravar(page: Page, cdp: CDPSession, acao: () => Promise<void>): Promise<Frames> {
  await page.evaluate(() => {
    const w = window as any;
    w.__f = []; w.__lt = []; w.__on = true;
    w.__po = new PerformanceObserver(l => { for (const e of l.getEntries()) w.__lt.push(e.duration); });
    w.__po.observe({ entryTypes: ['longtask'] });
    let last = performance.now();
    const loop = (t: number) => { w.__f.push(t - last); last = t; if (w.__on) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const m0 = await metricas(cdp);
  const t0 = Date.now();
  await acao();
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const duracao = Date.now() - t0;
  const m1 = await metricas(cdp);
  const { f, lt } = await page.evaluate(() => {
    const w = window as any; w.__on = false; w.__po.disconnect();
    return { f: (w.__f as number[]).slice(1), lt: w.__lt as number[] };
  });
  const media = f.reduce((a, b) => a + b, 0) / Math.max(1, f.length);
  return {
    fps: r1(1000 / media), media_ms: r1(media), p95_ms: r1(pct(f, 0.95)), max_ms: r1(Math.max(0, ...f)),
    quadros_lentos: f.filter(x => x > 50).length,
    tbt_ms: r1(lt.reduce((a, d) => a + Math.max(0, d - 50), 0)),
    script_ms: r1((m1.ScriptDuration - m0.ScriptDuration) * 1000),
    layout_ms: r1((m1.LayoutDuration - m0.LayoutDuration) * 1000),
    estilo_ms: r1((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000),
    duracao_ms: duracao
  };
}

/** Movimento de mouse no ritmo de uma pessoa (um evento a cada ~16 ms). */
async function arrastar(page: Page, x: number, y: number, dx: number, dy: number, passos = 60) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= passos; i++) {
    await page.mouse.move(x + (dx * i) / passos, y + (dy * i) / passos);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

async function marca(page: Page, nome: string) {
  return page.evaluate(n => {
    const e = performance.getEntriesByName(`bancada:${n}`);
    return e.length ? Math.round(e[e.length - 1].startTime + (e[e.length - 1] as PerformanceMeasure).duration) : -1;
  }, nome);
}

async function duracoes(page: Page, nome: string) {
  return page.evaluate(n => performance.getEntriesByName(`bancada:${n}`).map(e => Math.round(e.duration * 10) / 10), nome);
}

test.afterAll(async () => {
  await mkdir('bench-results', { recursive: true });
  await writeFile('bench-results/desempenho.json', JSON.stringify(resultados, null, 2));
});

test('carregamento da página (mediana de 3, cache vazio)', async ({ browser }) => {
  const runs: Record<string, number>[] = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await cdpDe(page);
    await page.goto('/');
    await page.waitForFunction(() => performance.getEntriesByName('bancada:quadro-pronto').length > 0, null, { timeout: 30_000 });
    await page.waitForTimeout(500);
    runs.push(await page.evaluate(async () => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1;
      const lcp = await new Promise<number>(res => {
        new PerformanceObserver(l => { const e = l.getEntries(); res(e[e.length - 1]?.startTime ?? -1); }).observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => res(-1), 1000);
      });
      const lt = await new Promise<number[]>(res => {
        const d: number[] = [];
        new PerformanceObserver(l => { for (const e of l.getEntries()) d.push(e.duration); }).observe({ type: 'longtask', buffered: true } as PerformanceObserverInit);
        setTimeout(() => res(d), 300);
      });
      const scripts = performance.getEntriesByType('resource').filter(r => (r as PerformanceResourceTiming).initiatorType === 'script') as PerformanceResourceTiming[];
      const pronto = performance.getEntriesByName('bancada:quadro-pronto')[0].startTime;
      return {
        ttfb_ms: Math.round(nav.responseStart),
        fcp_ms: Math.round(fcp),
        lcp_ms: Math.round(lcp),
        quadro_pronto_ms: Math.round(pronto),
        tbt_ms: Math.round(lt.reduce((a, x) => a + Math.max(0, x - 50), 0)),
        js_arquivos: scripts.length,
        js_kb: Math.round(scripts.reduce((a, s) => a + s.encodedBodySize, 0) / 1024),
        js_descomprimido_kb: Math.round(scripts.reduce((a, s) => a + s.decodedBodySize, 0) / 1024)
      };
    }));
    await ctx.close();
  }
  const out: Record<string, number> = {};
  for (const k of Object.keys(runs[0])) out[k] = mediana(runs.map(r => r[k]));
  resultados.carregamento = out;
  expect(out.quadro_pronto_ms).toBeGreaterThan(0);
});

for (const n of [50, 150, 300]) {
  test(`quadro com ${n} componentes`, async ({ page }) => {
    const app = new App(page);
    await app.abrir();
    await app.semear('livre', quadroGrande(n));
    const cdp = await cdpDe(page);
    await app.abrir();
    const r: Record<string, unknown> = {};
    r.quadro_pronto_ms = await marca(page, 'quadro-pronto');
    const m = await metricas(cdp);
    r.heap_mb = r1(m.JSHeapUsedSize / 1048576);
    r.nos_dom = m.Nodes;
    await expect(page.locator('.react-flow__node-component')).toHaveCount(n);

    const centro = async () => {
      const box = await page.locator('.react-flow__pane').boundingBox();
      return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
    };

    // 1. arrastar um componente
    const no = page.locator('.react-flow__node-component').first();
    await page.getByRole('button', { name: 'Enquadrar tudo' }).click();
    await page.waitForTimeout(400);
    const b = (await no.boundingBox())!;
    r.arrastar_um = await gravar(page, cdp, () => arrastar(page, b.x + b.width / 2, b.y + b.height / 2, 260, 140));

    // 2. mover o quadro com a mão
    const c = await centro();
    await page.keyboard.press('h');
    r.mover_quadro = await gravar(page, cdp, () => arrastar(page, c.x, c.y, -300, -160));
    await page.keyboard.press('v');

    // 3. zoom com a roda do mouse
    await page.mouse.move(c.x, c.y);
    r.zoom = await gravar(page, cdp, async () => {
      for (let i = 0; i < 24; i++) { await page.mouse.wheel(0, i < 12 ? -120 : 120); await page.waitForTimeout(16); }
    });

    if (n === 150) {
      // 4. arrastar tudo selecionado
      await page.getByRole('button', { name: 'Enquadrar tudo' }).click();
      await page.waitForTimeout(400);
      await page.locator('.react-flow__pane').click({ position: { x: 5, y: 5 } }).catch(() => {});
      await page.keyboard.press('Control+a');
      const b2 = (await page.locator('.react-flow__node-component').nth(3).boundingBox())!;
      r.arrastar_todos = await gravar(page, cdp, () => arrastar(page, b2.x + b2.width / 2, b2.y + b2.height / 2, 120, 80, 40));
      await page.keyboard.press('Escape');

      // 5. digitar no Inspector
      await page.locator('.react-flow__node-component').nth(5).click();
      await app.aba('Detalhes');
      await page.locator('#i-name').click();
      await page.keyboard.press('Control+a');
      r.digitar = await gravar(page, cdp, () => page.keyboard.type('Serviço de pagamentos com fila', { delay: 30 }));

      // 6. adicionar componente pela paleta (tempo até aparecer)
      const tempos: number[] = [];
      for (let i = 0; i < 5; i++) {
        await page.getByRole('button', { name: 'Componentes', exact: true }).click();
        const antes = await page.locator('.react-flow__node-component').count();
        const t0 = Date.now();
        await page.locator('.picker').getByRole('button', { name: 'Worker', exact: true }).click();
        await expect(page.locator('.react-flow__node-component')).toHaveCount(antes + 1);
        tempos.push(Date.now() - t0);
      }
      r.adicionar_ms = mediana(tempos);

      // 7. desfazer
      const td: number[] = [];
      for (let i = 0; i < 3; i++) {
        const antes = await page.locator('.react-flow__node-component').count();
        const t0 = Date.now();
        await page.keyboard.press('Control+z');
        await expect(page.locator('.react-flow__node-component')).toHaveCount(antes - 1);
        td.push(Date.now() - t0);
      }
      r.desfazer_ms = mediana(td);

      // 8. resumo, salvamento e exportação
      await page.getByRole('button', { name: 'Resumo para IA' }).click();
      await page.getByRole('button', { name: 'Fechar', exact: true }).click();
      r.resumo_ms = (await duracoes(page, 'resumo')).at(-1) ?? -1;
      await page.waitForTimeout(800);
      const salvar = await duracoes(page, 'salvar');
      r.salvar_ms = salvar.length ? mediana(salvar) : -1;
      r.salvamentos = salvar.length;
      await page.getByRole('button', { name: 'Arquivo' }).click();
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60_000 }), page.getByRole('menuitem', { name: /Exportar imagem/ }).click()]);
      await dl.path();
      r.exportar_png_ms = (await duracoes(page, 'exportar-png')).at(-1) ?? -1;
    }

    const m2 = await metricas(cdp);
    r.heap_final_mb = r1(m2.JSHeapUsedSize / 1048576);
    resultados[`n${n}`] = r;
  });
}
