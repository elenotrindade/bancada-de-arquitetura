import { test as base, expect, type Locator, type Page } from '@playwright/test';
import zlib from 'node:zlib';

/** Erros de console que não indicam problema no app. */
const IGNORAR = [
  /favicon/,
  /status of 401/, // chave inválida de propósito nos testes do chat
  /_vercel\//     // telemetria só existe quando o app roda na Vercel
];

type Fixtures = {
  permitirConsole: RegExp[];
  vigia: void;
  app: App;
};

export const test = base.extend<Fixtures>({
  permitirConsole: async ({}, use) => { await use([]); },

  /** Falha o teste se aparecer erro de JavaScript ou de console que não foi previsto. */
  vigia: [async ({ page, permitirConsole }, use) => {
    const erros: string[] = [];
    page.on('pageerror', e => erros.push(`pageerror: ${e.message}`));
    page.on('console', m => {
      if (m.type() !== 'error') return;
      const t = m.text(), url = m.location()?.url || '';
      if (IGNORAR.some(r => r.test(t) || r.test(url))) return;
      if (permitirConsole.some(r => r.test(t))) return;
      erros.push(`console: ${t}`);
    });
    await use();
    expect(erros, 'erros inesperados no console').toEqual([]);
  }, { auto: true }],

  app: async ({ page }, use) => {
    const app = new App(page);
    await app.abrir();
    await use(app);
  }
});

export { expect };

/** Atalhos para dirigir o app nos testes. */
export class App {
  constructor(readonly page: Page) {}

  get pane() { return this.page.locator('.react-flow__pane'); }
  get barraDoElemento() { return this.page.locator('.react-flow__node-toolbar .node-actions'); }

  async abrir(caminho = '/') {
    await this.page.goto(caminho);
    await this.page.locator('.react-flow__node, .empty-hint').first().waitFor();
    await this.page.waitForFunction(() => performance.getEntriesByName('bancada:quadro-pronto').length > 0);
  }

  no(id: string): Locator { return this.page.locator(`.react-flow__node[data-id="${id}"]`); }
  contar(sel: string) { return this.page.locator(sel).count(); }
  componentes() { return this.contar('.react-flow__node-component'); }

  /** Clica no fundo do quadro numa posição relativa (0 a 1). */
  async cliqueNoQuadro(fx: number, fy: number) {
    const b = (await this.pane.boundingBox())!;
    await this.page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
  }

  async cenario(id: string) {
    await this.page.selectOption('#scenario', id);
    await this.page.waitForTimeout(150);
    await this.page.locator('.react-flow__node, .empty-hint').first().waitFor();
  }

  async quadroVazio() {
    await this.cenario('livre');
    await expect(this.page.locator('.empty-hint')).toBeVisible();
  }

  async adicionarComponente(rotulo: string) {
    const picker = this.page.locator('.picker');
    if (!(await picker.isVisible())) await this.page.getByRole('button', { name: 'Componentes', exact: true }).click();
    await picker.getByRole('button', { name: rotulo, exact: true }).click();
  }

  async aba(nome: 'Cenário' | 'Detalhes' | 'Decisões' | 'IA') {
    await this.page.getByRole('tab', { name: new RegExp(`^${nome}`) }).click();
  }

  async ferramenta(nome: string) {
    await this.page.locator('.toolbar').getByRole('button', { name: nome, exact: true }).click();
  }

  /** Arrasta da alça de um nó até o centro de outro. */
  async conectar(de: string, para: string, alca: 't' | 'r' | 'b' | 'l' = 'r') {
    const origem = this.no(de);
    await origem.hover();
    const pos = { t: 'top', r: 'right', b: 'bottom', l: 'left' }[alca];
    const h = (await origem.locator(`.react-flow__handle-${pos}`).boundingBox())!;
    const t = (await this.no(para).boundingBox())!;
    await this.page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await this.page.mouse.down();
    await this.page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 12 });
    await this.page.mouse.up();
  }

  /** Clica no meio do traçado de uma conexão (o ponto central da caixa nem sempre fica sobre a linha). */
  async clicarConexao(id: string) {
    const p = await this.page.locator(`.react-flow__edge[data-id="${id}"] .react-flow__edge-path`).evaluate((el: SVGPathElement) => {
      const len = el.getTotalLength();
      const pt = el.getPointAtLength(len / 2);
      const m = el.getScreenCTM()!;
      return { x: pt.x * m.a + pt.y * m.c + m.e, y: pt.x * m.b + pt.y * m.d + m.f };
    });
    await this.page.mouse.click(p.x, p.y);
  }

  /** Posição do nó no quadro (coordenadas do fluxo), lida do transform. */
  async posicao(id: string) {
    const st = (await this.no(id).getAttribute('style')) || '';
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(st);
    return m ? { x: Number(m[1]), y: Number(m[2]) } : { x: NaN, y: NaN };
  }

  async resumo(): Promise<string> {
    await this.page.getByRole('button', { name: 'Resumo para IA' }).click();
    const t = await this.page.locator('.modal textarea').inputValue();
    await this.page.getByRole('button', { name: 'Fechar', exact: true }).click();
    return t;
  }

  /** Grava um quadro direto no IndexedDB e abre esse cenário. */
  async semear(cenario: string, quadro: object) {
    await this.page.evaluate(async ({ cenario, quadro }) => {
      await new Promise<void>((resolve, reject) => {
        const r = indexedDB.open('keyval-store');
        r.onupgradeneeded = () => r.result.createObjectStore('keyval');
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const tx = r.result.transaction('keyval', 'readwrite');
          tx.objectStore('keyval').put(quadro, `board:${cenario}`);
          tx.oncomplete = () => { r.result.close(); resolve(); };
          tx.onerror = () => reject(tx.error);
        };
      });
      localStorage.setItem('bancada:prefs', JSON.stringify({ snap: true, minimap: true, wheel: 'zoom', scenario: cenario }));
    }, { cenario, quadro });
    await this.abrir();
  }
}

/** PNG gerado na hora, sem dependências. */
export function png(w = 120, h = 80): Buffer {
  const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf: Buffer) => { let c = 0xffffffff; for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = y * (w * 3 + 1) + 1 + x * 3;
    raw[o] = (30 + x) & 255; raw[o + 1] = 107; raw[o + 2] = (88 + y) & 255;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const KINDS = ['usuario', 'web', 'mobile', 'externo', 'cdn', 'lb', 'gateway', 'servico', 'worker', 'funcao', 'auth', 'sql', 'nosql', 'cache', 'storage', 'busca', 'fila', 'eventos', 'obs', 'agendador'];

/** Quadro sintético com n componentes em grade, conexões, notas e áreas. */
export function quadroGrande(n: number) {
  const cols = Math.ceil(Math.sqrt(n * 1.6));
  const nodes: object[] = [];
  const edges: object[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    nodes.push({ id: `c${i}`, type: 'component', position: { x: c * 260, y: r * 140 }, data: { kind: KINDS[i % KINDS.length], name: `Componente ${i}`, resp: 'Responsabilidade de teste', tech: i % 3 ? '' : 'PostgreSQL' } });
    if (i > 0) edges.push({ id: `e${i}`, source: `c${i - 1}`, target: `c${i}`, sourceHandle: 'r', targetHandle: 'l', type: 'arch', data: { label: i % 4 ? 'HTTP/REST' : 'Publica evento', async: i % 4 === 0, pathType: 'smoothstep' } });
    if (i >= cols) edges.push({ id: `v${i}`, source: `c${i - cols}`, target: `c${i}`, sourceHandle: 'b', targetHandle: 't', type: 'arch', data: { label: 'SQL', async: false, pathType: 'smoothstep' } });
  }
  const notas = Math.max(2, Math.round(n / 10));
  for (let i = 0; i < notas; i++) nodes.push({ id: `n${i}`, type: 'note', position: { x: -320, y: i * 200 }, width: 220, height: 160, data: { text: `Nota ${i}: risco ou dúvida para discutir`, color: 'amarelo' } });
  const areas = Math.max(1, Math.round(n / 40));
  const linhasPorArea = Math.ceil(Math.ceil(n / cols) / areas);
  for (let a = 0; a < areas; a++) nodes.unshift({ id: `f${a}`, type: 'frame', position: { x: -30, y: a * linhasPorArea * 140 - 40 }, width: cols * 260 + 20, height: linhasPorArea * 140 + 20, zIndex: -1, data: { title: `Área ${a}`, color: 'cinza' } });
  return { nodes, edges, adrs: [], checks: {}, twist: false, custom: { name: `Quadro com ${n} componentes`, context: '', functional: '', quality: '', constraints: '' }, chat: [], updatedAt: Date.now() };
}
