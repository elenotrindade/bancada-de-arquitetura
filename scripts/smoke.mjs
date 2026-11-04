// Teste de fumaça do app rodando em http://localhost:3000.
// Exercita o canvas, imagens, conexões, persistência, exportação e o chat (com chave inválida),
// salva screenshots em ./screenshots e falha se algo quebrar ou houver erro no console.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });
const report = [];
const errors = [];
const log = (ok, msg) => { report.push(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); console.log(`${ok ? 'OK  ' : 'FAIL'} ${msg}`); };

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try { const r = await fetch(BASE); if (r.ok) return; } catch { /* aguardando */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Servidor não respondeu em 90 s');
}

/** PNG 120x80 gerado na hora, sem dependências. */
function makePng(w = 120, h = 80) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * (w * 3 + 1) + 1 + x * 3;
    raw[o] = 30 + x; raw[o + 1] = 107; raw[o + 2] = 88 + y;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

async function check(name, fn) {
  try { await fn(); log(true, name); }
  catch (e) { log(false, `${name}: ${e.message.split('\n').filter(l => l.trim() && !/^\s*-\s*(waiting for|locator resolved|attempting|  retrying)/.test(l)).slice(0, 4).join(' | ').slice(0, 500)}`); }
}

const count = (page, sel) => page.locator(sel).count();

await waitForServer();
const browser = await chromium.launch();

// ---------- desktop, tema claro ----------
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
let expectCspBlock = false;
page.on('console', m => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/favicon|status of 401/.test(t)) return;
  if (expectCspBlock && /Content Security Policy|Failed to load resource/.test(t)) return;
  errors.push(`console: ${t}`);
});

const first = await page.goto(BASE);
await check('cabeçalhos de segurança e CSP com nonce', async () => {
  const h = first.headers();
  const csp = h['content-security-policy'] || '';
  for (const x of ["'nonce-", "'strict-dynamic'", "connect-src 'self'", "frame-ancestors 'none'", "object-src 'none'"]) {
    if (!csp.includes(x)) throw new Error(`CSP sem ${x}: ${csp.slice(0, 160)}`);
  }
  if (h['x-frame-options'] !== 'DENY') throw new Error('sem X-Frame-Options');
  if (!h['permissions-policy']) throw new Error('sem Permissions-Policy');
  const second = await page.request.get(BASE);
  const nonceA = /'nonce-([^']+)'/.exec(csp)?.[1], nonceB = /'nonce-([^']+)'/.exec(second.headers()['content-security-policy'] || '')?.[1];
  if (!nonceA || nonceA === nonceB) throw new Error('nonce não muda a cada requisição');
});
await check('quadro de exemplo carrega', async () => {
  await page.locator('.react-flow__node-component').first().waitFor({ timeout: 15000 });
  const n = await count(page, '.react-flow__node-component');
  if (n < 5) throw new Error(`esperava 5 componentes, veio ${n}`);
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/01-desktop-claro.png` });

const pane = page.locator('.react-flow__pane');
/** Clica no fundo do quadro numa posição relativa (0 a 1), longe das barras flutuantes. */
async function paneAt(fx, fy) {
  const b = await pane.boundingBox();
  await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
}

await check('inspetor mostra detalhes do componente', async () => {
  await page.locator('.react-flow__node[data-id="a3"]').click();
  await page.locator('#tab-detalhes').click();
  await page.locator('#i-name').waitFor();
  const v = await page.locator('#i-name').inputValue();
  if (v !== 'Serviço de links') throw new Error(`nome: ${v}`);
});

await check('conecta soltando a linha em cima de outro componente', async () => {
  await page.keyboard.press('Escape');
  const before = await count(page, '.react-flow__edge');
  const src = page.locator('.react-flow__node[data-id="a5"]');
  await src.hover();
  const hb = await src.locator('.react-flow__handle-right').boundingBox();
  const tb = await page.locator('.react-flow__node[data-id="a4"]').boundingBox();
  if (!hb || !tb) throw new Error('elementos não encontrados');
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 15 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await count(page, '.react-flow__edge');
  if (after !== before + 1) throw new Error(`${before} -> ${after}`);
});

await check('resumo para IA inclui cenário e componentes', async () => {
  await page.getByRole('button', { name: 'Resumo para IA' }).click();
  const ta = page.locator('.modal textarea');
  await ta.waitFor();
  const t = await ta.inputValue();
  for (const x of ['# Exercício de arquitetura: Encurtador de links', 'Serviço de links', '## Conexões', 'Cache de redirecionamento → Banco de links']) {
    if (!t.includes(x)) throw new Error(`faltou "${x}"`);
  }
  await page.screenshot({ path: `${OUT}/04-resumo.png` });
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
});

// ---------- quadro vazio (cenário livre) para criar elementos ----------
await page.selectOption('#scenario', 'livre');
await page.locator('.empty-hint').waitFor({ timeout: 5000 });

await check('atalho C abre componentes e adiciona uma fila', async () => {
  await page.keyboard.press('c');
  await page.locator('.picker').waitFor({ timeout: 3000 });
  await page.screenshot({ path: `${OUT}/02-paleta.png` });
  await page.locator('.pick', { hasText: 'Fila' }).click();
  await page.locator('.react-flow__node-component').first().waitFor({ timeout: 3000 });
});

await check('cria nota adesiva e escreve', async () => {
  await page.keyboard.press('n');
  await paneAt(0.25, 0.3);
  const ta = page.locator('.n-note textarea');
  await ta.waitFor({ timeout: 3000 });
  await ta.type('Risco: o banco aguenta 5x?');
  await page.keyboard.press('Escape');
  await page.locator('.n-note', { hasText: 'Risco: o banco aguenta 5x?' }).waitFor({ timeout: 3000 });
});

await check('cria texto e área', async () => {
  await page.keyboard.press('t');
  await paneAt(0.25, 0.75);
  await page.locator('.n-text textarea').waitFor({ timeout: 3000 });
  await page.keyboard.type('Título do desenho');
  await page.keyboard.press('Escape');
  await page.keyboard.press('f');
  await paneAt(0.7, 0.35);
  await page.locator('.frame-title input').waitFor({ timeout: 3000 });
  await page.keyboard.press('End');
  await page.keyboard.type(' de pedidos');
  await page.keyboard.press('Enter');
  if ((await count(page, '.react-flow__node-frame')) !== 1) throw new Error('área não criada');
});

await check('adiciona imagem pelo seletor de arquivo', async () => {
  await page.setInputFiles('#image-input', { name: 'diagrama.png', mimeType: 'image/png', buffer: makePng() });
  await page.locator('.n-image img').first().waitFor({ timeout: 5000 });
});

await check('desfazer e refazer pelo teclado', async () => {
  await page.keyboard.press('Escape');
  const before = await count(page, '.react-flow__node-image');
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(200);
  const undone = await count(page, '.react-flow__node-image');
  await page.keyboard.press('Control+Shift+z');
  await page.waitForTimeout(200);
  const redone = await count(page, '.react-flow__node-image');
  if (!(undone === before - 1 && redone === before)) {
    const active = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120));
    throw new Error(`${before} -> ${undone} -> ${redone}; foco: ${active}`);
  }
});

await check('duplicar com Ctrl+D', async () => {
  await page.locator('.react-flow__node-component').first().click();
  const before = await count(page, '.react-flow__node-component');
  await page.keyboard.press('Control+d');
  await page.waitForTimeout(200);
  if ((await count(page, '.react-flow__node-component')) !== before + 1) throw new Error('não duplicou');
});
await check('copiar e colar elementos dentro do app', async () => {
  await page.locator('.react-flow__node-component').first().click();
  const before = await count(page, '.react-flow__node-component');
  await page.keyboard.press('Control+c');
  await paneAt(0.5, 0.85);
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(250);
  const after = await count(page, '.react-flow__node-component');
  if (after !== before + 1) throw new Error(`${before} -> ${after}`);
});

await check('JSON colado de fora vira nota de texto, nunca elementos', async () => {
  const comps = await count(page, '.react-flow__node-component');
  const notes = await count(page, '.react-flow__node-note');
  const imgs = await count(page, '.react-flow__node-image');
  await page.evaluate(() => navigator.clipboard.writeText(JSON.stringify({
    bancada: 1, nodes: [{ id: 'x1', type: 'image', position: { x: 0, y: 0 }, data: { src: 'https://evil.example/p.png' } }], edges: []
  })));
  await paneAt(0.5, 0.85);
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(250);
  if ((await count(page, '.react-flow__node-note')) !== notes + 1) throw new Error('não virou nota');
  if ((await count(page, '.react-flow__node-component')) !== comps || (await count(page, '.react-flow__node-image')) !== imgs) throw new Error('JSON externo virou elemento');
});

await check('CSP bloqueia script injetado na página', async () => {
  expectCspBlock = true;
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = '<img src="data:," onerror="window.__xss = 1">';
    document.body.appendChild(d);
  });
  await page.waitForTimeout(400);
  const ran = await page.evaluate(() => (window).__xss === 1);
  expectCspBlock = false;
  if (ran) throw new Error('script inline executou');
});

await page.keyboard.press('Escape');
await page.locator('button[aria-label="Enquadrar tudo"]').click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/03-elementos-criados.png` });

await check('resumo inclui anotações e áreas', async () => {
  await page.getByRole('button', { name: 'Resumo para IA' }).click();
  const t = await page.locator('.modal textarea').inputValue();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  for (const x of ['Risco: o banco aguenta 5x?', '## Áreas', 'Nova área de pedidos', 'imagem']) if (!t.includes(x)) throw new Error(`faltou "${x}"`);
});

await check('exporta PNG do quadro', async () => {
  await page.getByRole('button', { name: 'Arquivo' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), page.getByRole('menuitem', { name: /Exportar imagem/ }).click()]);
  await dl.saveAs(`${OUT}/05-export.png`);
});

await check('chat de IA mostra erro amigável com chave inválida', async () => {
  await page.locator('#tab-ia').click();
  await page.selectOption('#ai-provider', 'anthropic');
  await page.fill('#ai-key', 'sk-ant-chave-invalida-para-teste');
  await page.fill('#chat-input', 'Revise meu desenho');
  await page.keyboard.press('Enter');
  const err = page.locator('.msg.error');
  await err.waitFor({ timeout: 20000 });
  const t = await err.innerText();
  if (!/Chave de API inválida|provedor/i.test(t)) throw new Error(`mensagem: ${t}`);
  await page.screenshot({ path: `${OUT}/06-chat-erro.png` });
});

await check('cofre: chave fica só cifrada e pede senha ao recarregar', async () => {
  const KEY = 'sk-ant-teste-cofre-1234567890';
  await page.fill('#ai-key', KEY);
  await page.check('#ai-remember');
  await page.fill('#ai-pass', 'curta');
  await page.getByRole('button', { name: 'Salvar protegida' }).click();
  await page.getByText('pelo menos 8 caracteres').first().waitFor({ timeout: 3000 });
  await page.fill('#ai-pass', 'senha-forte-123');
  await page.getByRole('button', { name: 'Salvar protegida' }).click();
  await page.getByRole('button', { name: 'Bloquear agora' }).waitFor({ timeout: 15000 });
  const dump = await page.evaluate(async () => {
    const readDb = name => new Promise(resolve => {
      const r = indexedDB.open(name);
      r.onerror = () => resolve('');
      r.onsuccess = () => {
        const db = r.result;
        const names = Array.from(db.objectStoreNames);
        if (!names.length) { db.close(); resolve(''); return; }
        const tx = db.transaction(names, 'readonly');
        const out = [];
        let pending = names.length;
        names.forEach(n => {
          const g = tx.objectStore(n).getAll();
          g.onsuccess = () => { out.push(JSON.stringify(g.result)); if (--pending === 0) { db.close(); resolve(out.join('')); } };
          g.onerror = () => { if (--pending === 0) { db.close(); resolve(out.join('')); } };
        });
      };
    });
    const dbs = await indexedDB.databases();
    let idb = '';
    for (const d of dbs) if (d.name) idb += await readDb(d.name);
    return { web: JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }), idb };
  });
  if (/sk-ant/.test(dump.web + dump.idb)) throw new Error('chave em texto puro no armazenamento do navegador');
  if (!dump.idb.includes('"iv"')) throw new Error('cofre cifrado não encontrado');
  await page.reload();
  await page.locator('#tab-ia').click();
  await page.locator('#ai-unlock-pass').waitFor({ timeout: 10000 });
  await page.fill('#ai-unlock-pass', 'senha-errada-000');
  await page.getByRole('button', { name: 'Desbloquear' }).click();
  await page.getByText('Senha incorreta.').waitFor({ timeout: 15000 });
  await page.fill('#ai-unlock-pass', 'senha-forte-123');
  await page.getByRole('button', { name: 'Desbloquear' }).click();
  await page.locator('#ai-key').waitFor({ timeout: 15000 });
  if ((await page.inputValue('#ai-key')) !== KEY) throw new Error('chave não voltou após desbloquear');
  await page.screenshot({ path: `${OUT}/07-cofre.png` });
});

await check('rotas de IA recusam chamadas de fora do site', async () => {
  const semOrigem = await page.request.post(`${BASE}/api/models`, { data: { provider: 'anthropic', apiKey: '12345678' } });
  if (semOrigem.status() !== 403) throw new Error(`sem Origin: ${semOrigem.status()}`);
  const outroSite = await page.request.post(`${BASE}/api/chat`, { data: { provider: 'anthropic' }, headers: { origin: 'https://evil.example' } });
  if (outroSite.status() !== 403) throw new Error(`outro site: ${outroSite.status()}`);
  const proprio = await page.request.post(`${BASE}/api/models`, { data: { provider: 'xpto', apiKey: '12345678' }, headers: { origin: BASE } });
  if (proprio.status() !== 400) throw new Error(`mesmo site com provedor inválido: ${proprio.status()}`);
});

await check('quadro persiste após recarregar', async () => {
  const before = await count(page, '.react-flow__node');
  await page.waitForTimeout(900);
  await page.reload();
  await page.locator('.react-flow__node').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  const after = await count(page, '.react-flow__node');
  if (after !== before) throw new Error(`${before} -> ${after}`);
  if ((await page.locator('#scenario').inputValue()) !== 'livre') throw new Error('cenário não foi lembrado');
});

await check('volta ao encurtador com as edições anteriores', async () => {
  await page.selectOption('#scenario', 'encurtador');
  await page.locator('.react-flow__node[data-id="a3"]').waitFor({ timeout: 5000 });
  if ((await count(page, '.react-flow__edge')) !== 5) throw new Error(`conexões: ${await count(page, '.react-flow__edge')}`);
});

await check('quadro salvo adulterado é limpo ao abrir', async () => {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const r = indexedDB.open('keyval-store');
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      const tx = r.result.transaction('keyval', 'readwrite');
      tx.objectStore('keyval').put({
        nodes: [
          { id: 'm1', type: 'image', position: { x: 0, y: 0 }, width: 200, height: 100, data: { src: 'https://evil.example/pixel.png', caption: 'rastreio' } },
          { id: 'm2', type: 'note', position: { x: 300, y: 0 }, width: 200, height: 120, style: { position: 'fixed', inset: '0', zIndex: 9999 }, className: 'falso', data: { text: 'nota legítima', color: 'amarelo' } },
          { id: 'm3', type: 'script', position: { x: 0, y: 300 }, data: {} }
        ],
        edges: [{ id: 'z', source: 'm2', target: 'nao-existe' }]
      }, 'board:ingressos');
      tx.oncomplete = () => { r.result.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }));
  await page.selectOption('#scenario', 'ingressos');
  await page.locator('.n-note', { hasText: 'nota legítima' }).waitFor({ timeout: 5000 });
  if (await count(page, '.react-flow__node-image')) throw new Error('imagem externa foi carregada');
  if (await count(page, '.react-flow__node[data-id="m3"]')) throw new Error('tipo desconhecido foi aceito');
  const style = (await page.locator('.react-flow__node[data-id="m2"]').getAttribute('style')) || '';
  const cls = (await page.locator('.react-flow__node[data-id="m2"]').getAttribute('class')) || '';
  if (/fixed|9999/.test(style) || /falso/.test(cls)) throw new Error('estilo injetado foi aplicado');
});
await ctx.close();

// ---------- tema escuro ----------
const dark = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const dp = await dark.newPage();
dp.on('pageerror', e => errors.push(`pageerror (escuro): ${e.message}`));
await dp.goto(BASE);
await dp.locator('.react-flow__node-component').first().waitFor({ timeout: 15000 });
await dp.waitForTimeout(600);
await dp.screenshot({ path: `${OUT}/08-desktop-escuro.png` });
await dark.close();

// ---------- celular ----------
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', isMobile: true, hasTouch: true });
const mp = await mob.newPage();
mp.on('pageerror', e => errors.push(`pageerror (celular): ${e.message}`));
await mp.goto(BASE);
await mp.locator('.react-flow__node-component').first().waitFor({ timeout: 15000 });
await mp.waitForTimeout(600);
await check('celular sem rolagem horizontal', async () => {
  const w = await mp.evaluate(() => document.documentElement.scrollWidth);
  if (w > 391) throw new Error(`scrollWidth ${w}`);
});
await mp.screenshot({ path: `${OUT}/09-celular.png` });
await mp.getByRole('button', { name: 'Painel' }).click();
await mp.waitForTimeout(300);
await mp.screenshot({ path: `${OUT}/10-celular-painel.png` });
await mob.close();

await browser.close();

if (errors.length) { log(false, `erros no console:\n  ${errors.slice(0, 15).join('\n  ')}`); }
writeFileSync(`${OUT}/report.txt`, report.join('\n') + '\n');
const failed = report.filter(r => r.startsWith('FAIL')).length;
console.log(`\n${report.length - failed}/${report.length} verificações passaram`);
process.exit(failed ? 1 : 0);
