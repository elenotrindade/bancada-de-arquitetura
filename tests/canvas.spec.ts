import { CATALOG } from '../lib/catalog';
import { expect, png, test } from './fixtures';

test.describe('Componentes de arquitetura', () => {
  test('todos os tipos do catálogo podem ser adicionados, renomeados e removidos pela barra do elemento', async ({ app, page }) => {
    test.setTimeout(150_000);
    await app.quadroVazio();
    for (const item of Object.values(CATALOG)) {
      await app.adicionarComponente(item.label);
      const no = page.locator('.react-flow__node-component.selected');
      await expect(no, item.label).toHaveCount(1);
      await expect(no.locator('.n-type')).toHaveText(item.label);
      await app.aba('Detalhes');
      await page.fill('#i-name', `Meu ${item.label}`);
      await expect(no.locator('.n-name')).toHaveText(`Meu ${item.label}`);
      await expect(page.locator('.teach')).toContainText(item.care);
      await app.barraDoElemento.getByRole('button', { name: 'Remover', exact: true }).click();
      await expect(page.locator('.react-flow__node-component'), `remover ${item.label}`).toHaveCount(0);
    }
  });

  test('componente arrastado da paleta cai onde foi solto', async ({ app, page }) => {
    await app.quadroVazio();
    await page.getByRole('button', { name: 'Componentes', exact: true }).click();
    await page.locator('.picker').getByRole('button', { name: 'Cache', exact: true }).dragTo(app.pane, { targetPosition: { x: 750, y: 300 } });
    await expect(page.locator('.react-flow__node-component')).toHaveCount(1);
  });

  test('duplicar e trazer para frente pela barra do elemento', async ({ app, page }) => {
    await app.no('a3').click();
    await app.barraDoElemento.getByRole('button', { name: 'Duplicar', exact: true }).click();
    await expect(page.locator('.react-flow__node-component')).toHaveCount(6);
    await app.no('a1').click();
    await app.barraDoElemento.getByRole('button', { name: 'Trazer para frente', exact: true }).click();
    const ultimo = await page.locator('.react-flow__node').last().getAttribute('data-id');
    expect(ultimo).toBe('a1');
  });

  test('Inspector edita responsabilidade e tecnologia', async ({ app, page }) => {
    await app.no('a3').click();
    await app.aba('Detalhes');
    await page.fill('#i-tech', 'Go');
    await page.fill('#i-resp', 'Resolve o código curto');
    await expect(app.no('a3').locator('.n-tech')).toHaveText('Go');
    const r = await app.resumo();
    expect(r).toContain('- **Serviço de links** (Serviço / API, Go)');
    expect(r).toContain('  - Responsabilidade: Resolve o código curto');
  });
});

test.describe('Notas, textos, áreas e imagens', () => {
  test('nota: criar, escrever, mudar cor, duplicar e remover', async ({ app, page }) => {
    await app.quadroVazio();
    await page.keyboard.press('n');
    await expect(page.locator('.hint-toast')).toBeVisible();
    await app.cliqueNoQuadro(0.4, 0.4);
    await page.locator('.n-note textarea').fill('Gargalo no banco?');
    await page.keyboard.press('Escape');
    const nota = page.locator('.react-flow__node-note');
    await expect(nota).toContainText('Gargalo no banco?');
    await nota.click();
    await app.barraDoElemento.getByRole('button', { name: 'Cor Verde', exact: true }).click();
    await expect(nota.locator('.n-note')).toHaveAttribute('style', /note-verde/);
    await app.barraDoElemento.getByRole('button', { name: 'Duplicar', exact: true }).click();
    await expect(page.locator('.react-flow__node-note')).toHaveCount(2);
    await app.barraDoElemento.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(page.locator('.react-flow__node-note')).toHaveCount(1);
  });

  test('nota: duplo clique e Enter reabrem a edição', async ({ app, page }) => {
    await app.no('n1').dblclick();
    await expect(page.locator('.n-note textarea')).toBeVisible();
    await page.keyboard.press('Escape');
    await app.no('n1').click();
    await page.keyboard.press('Enter');
    await expect(page.locator('.n-note textarea')).toBeVisible();
  });

  test('texto: criar e trocar tamanho', async ({ app, page }) => {
    await app.quadroVazio();
    await page.keyboard.press('t');
    await app.cliqueNoQuadro(0.5, 0.3);
    await page.keyboard.type('Visão geral');
    await page.keyboard.press('Escape');
    const texto = page.locator('.react-flow__node-text');
    await texto.click();
    await app.barraDoElemento.getByRole('button', { name: 'Tamanho L', exact: true }).click();
    await expect(texto.locator('.n-text')).toHaveClass(/\bl\b/);
    await app.barraDoElemento.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(texto).toHaveCount(0);
  });

  test('área: criar, renomear, mudar cor e remover pela barra do elemento', async ({ app, page }) => {
    await app.quadroVazio();
    await page.keyboard.press('f');
    await app.cliqueNoQuadro(0.5, 0.5);
    await page.locator('.frame-title input').fill('Domínio de pagamentos');
    await page.keyboard.press('Enter');
    const area = page.locator('.react-flow__node-frame');
    await expect(area.locator('.frame-title')).toHaveText('Domínio de pagamentos');
    await area.locator('.frame-title').click();
    await app.barraDoElemento.getByRole('button', { name: 'Cor Azul', exact: true }).click();
    await expect(area.locator('.n-frame')).toHaveAttribute('style', /frame-line-azul/);
    await app.barraDoElemento.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(area).toHaveCount(0);
  });

  test('área do exemplo: selecionar pelo título e remover pela barra', async ({ app, page }) => {
    await app.no('f1').locator('.frame-title').click();
    await expect(app.barraDoElemento).toBeVisible();
    await app.barraDoElemento.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(page.locator('.react-flow__node-frame')).toHaveCount(0);
  });

  test('área leva junto o que está dentro ao ser arrastada', async ({ app, page }) => {
    const a0 = await app.posicao('a3'), f0 = await app.posicao('f1');
    const t = (await app.no('f1').locator('.frame-title').boundingBox())!;
    await page.mouse.move(t.x + 20, t.y + t.height / 2);
    await page.mouse.down();
    await page.mouse.move(t.x + 140, t.y + 90, { steps: 10 });
    await page.mouse.up();
    const a1 = await app.posicao('a3'), f1 = await app.posicao('f1');
    expect(f1.x - f0.x).not.toBe(0);
    expect(a1.x - a0.x).toBeCloseTo(f1.x - f0.x, 0);
    expect(a1.y - a0.y).toBeCloseTo(f1.y - f0.y, 0);
  });

  test('imagem: pelo seletor de arquivo, com legenda, e remover', async ({ app, page }) => {
    await app.quadroVazio();
    await page.setInputFiles('#image-input', { name: 'diagrama.png', mimeType: 'image/png', buffer: png() });
    const img = page.locator('.react-flow__node-image');
    await expect(img.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
    await app.aba('Detalhes');
    await page.fill('#i-caption', 'Diagrama atual');
    await expect(img.locator('figcaption')).toHaveText('Diagrama atual');
    await img.click();
    await app.barraDoElemento.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(img).toHaveCount(0);
  });

  test('imagem: colar da área de transferência e soltar arquivo no quadro', async ({ app, page }) => {
    await app.quadroVazio();
    const b64 = png().toString('base64');
    await page.evaluate(async b64 => {
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const file = new File([bytes], 'colada.png', { type: 'image/png' });
      const dt = new DataTransfer(); dt.items.add(file);
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
      const area = document.querySelector('.canvas-area')!;
      const r = area.getBoundingClientRect();
      const dt2 = new DataTransfer(); dt2.items.add(new File([bytes], 'solta.png', { type: 'image/png' }));
      area.dispatchEvent(new DragEvent('drop', { dataTransfer: dt2, bubbles: true, cancelable: true, clientX: r.left + 200, clientY: r.top + 200 }));
    }, b64);
    await expect(page.locator('.react-flow__node-image')).toHaveCount(2);
  });
});

test.describe('Conexões', () => {
  test('conectar soltando sobre o componente, com rótulo automático', async ({ app, page }) => {
    await app.conectar('a5', 'a4');
    await expect(page.locator('.react-flow__edge')).toHaveCount(5);
    await expect(page.locator('.edge-label', { hasText: /^SQL$/ })).toHaveCount(2);
  });

  test('editar rótulo com duplo clique', async ({ app, page }) => {
    await page.locator('.edge-label', { hasText: 'SQL' }).dblclick();
    const input = page.locator('.edge-label input');
    await input.fill('gRPC');
    await page.keyboard.press('Enter');
    await expect(page.locator('.edge-label', { hasText: 'gRPC' })).toBeVisible();
  });

  test('Inspector: assíncrona, traçado, inverter e remover', async ({ app, page }) => {
    await app.clicarConexao('e1');
    await app.aba('Detalhes');
    await expect(page.locator('.section h2')).toHaveText('Painel de links → API Gateway');
    await page.check('#i-async');
    await expect(page.locator('.react-flow__edge[data-id="e1"] .react-flow__edge-path')).toHaveAttribute('style', /stroke-dasharray/);
    await page.getByText('Curva', { exact: true }).click();
    await expect(page.locator('.react-flow__edge[data-id="e1"] .react-flow__edge-path')).toHaveAttribute('d', /C/);
    await page.getByRole('button', { name: 'Inverter direção' }).click();
    expect(await app.resumo()).toContain('API Gateway → Painel de links');
    await app.clicarConexao('e1');
    await page.getByRole('button', { name: 'Remover', exact: true }).click();
    await expect(page.locator('.react-flow__edge')).toHaveCount(3);
  });

  test('nota pode ser ligada a um componente e aparece no resumo', async ({ app }) => {
    await app.conectar('n1', 'a1', 't');
    expect(await app.resumo()).toContain('(ligada a: Painel de links)');
  });
});

test.describe('Seleção, edição e atalhos', () => {
  test('selecionar tudo e apagar com Delete, depois desfazer', async ({ app, page }) => {
    await app.cliqueNoQuadro(0.9, 0.9);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await expect(page.locator('.react-flow__node')).toHaveCount(0);
    await expect(page.locator('.react-flow__edge')).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(page.locator('.react-flow__node')).toHaveCount(7);
    await expect(page.locator('.react-flow__edge')).toHaveCount(4);
  });

  test('seleção múltipla removida pelo botão do Inspector', async ({ app, page }) => {
    await app.cliqueNoQuadro(0.9, 0.9);
    await page.keyboard.press('Control+a');
    await app.aba('Detalhes');
    await page.getByRole('button', { name: 'Remover seleção' }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(0);
  });

  test('seleção em caixa pega só o que está dentro', async ({ app, page }) => {
    const a = (await app.no('a1').boundingBox())!, n = (await app.no('n1').boundingBox())!;
    await page.mouse.move(Math.min(a.x, n.x) - 20, a.y - 20);
    await page.mouse.down();
    await page.mouse.move(Math.max(a.x + a.width, n.x + n.width) + 10, n.y + n.height + 10, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('.react-flow__node.selected')).toHaveCount(2);
    await page.keyboard.press('Backspace');
    await expect(page.locator('.react-flow__node')).toHaveCount(5);
  });

  test('desfazer e refazer pelos botões da barra', async ({ app, page }) => {
    await app.adicionarComponente('Worker');
    await expect(page.locator('.react-flow__node-component')).toHaveCount(6);
    await page.locator('.toolbar').getByRole('button', { name: 'Desfazer' }).click();
    await expect(page.locator('.react-flow__node-component')).toHaveCount(5);
    await page.locator('.toolbar').getByRole('button', { name: 'Refazer' }).click();
    await expect(page.locator('.react-flow__node-component')).toHaveCount(6);
  });

  test('copiar, recortar, colar e duplicar', async ({ app, page }) => {
    await app.no('a1').click();
    await page.keyboard.press('Control+c');
    await app.cliqueNoQuadro(0.5, 0.92);
    await page.keyboard.press('Control+v');
    await expect(page.locator('.react-flow__node-component')).toHaveCount(6);
    await page.keyboard.press('Control+x');
    await expect(page.locator('.react-flow__node-component')).toHaveCount(5);
    await page.keyboard.press('Control+v');
    await expect(page.locator('.react-flow__node-component')).toHaveCount(6);
    await page.keyboard.press('Control+d');
    await expect(page.locator('.react-flow__node-component')).toHaveCount(7);
  });

  test('texto colado de fora vira nota', async ({ app, page }) => {
    await page.evaluate(() => navigator.clipboard.writeText('Lembrar de medir a latência do cache'));
    await app.cliqueNoQuadro(0.5, 0.92);
    await page.keyboard.press('Control+v');
    await expect(page.locator('.react-flow__node-note', { hasText: 'Lembrar de medir a latência do cache' })).toHaveCount(1);
  });

  test('Escape cancela a ferramenta de colocar', async ({ app, page }) => {
    await page.keyboard.press('f');
    await expect(page.locator('.hint-toast')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.hint-toast')).toHaveCount(0);
    await app.cliqueNoQuadro(0.5, 0.92);
    await expect(page.locator('.react-flow__node-frame')).toHaveCount(1);
  });
});

test.describe('Navegação e exibição', () => {
  const zoom = async (page: import('@playwright/test').Page) => Number((await page.locator('.zoom-pct').innerText()).replace('%', ''));

  test('botões de zoom, 100% e enquadrar', async ({ app, page }) => {
    const z0 = await zoom(page);
    await page.getByRole('button', { name: 'Aumentar zoom' }).click();
    await expect.poll(() => zoom(page)).toBeGreaterThan(z0);
    await page.getByRole('button', { name: 'Diminuir zoom' }).click();
    await page.getByRole('button', { name: 'Diminuir zoom' }).click();
    await expect.poll(() => zoom(page)).toBeLessThan(z0);
    await page.locator('.zoom-pct').click();
    await expect.poll(() => zoom(page)).toBe(100);
    await page.getByRole('button', { name: 'Enquadrar tudo' }).click();
    await expect.poll(() => zoom(page)).toBeLessThanOrEqual(100);
  });

  test('roda do mouse dá zoom; no modo trackpad, move o quadro', async ({ app, page }) => {
    const b = (await app.pane.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    const z0 = await zoom(page);
    await page.mouse.wheel(0, -400);
    await expect.poll(() => zoom(page)).toBeGreaterThan(z0);
    await page.getByRole('button', { name: 'Modo da roda do mouse' }).click();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    const vp = page.locator('.react-flow__viewport');
    const antes = await vp.getAttribute('style');
    const z1 = await zoom(page);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => vp.getAttribute('style')).not.toBe(antes);
    expect(await zoom(page)).toBe(z1);
  });

  test('ferramenta mão move o quadro sem mover os elementos', async ({ app, page }) => {
    await app.ferramenta('Mover o quadro');
    const vp = page.locator('.react-flow__viewport');
    const antes = await vp.getAttribute('style');
    const p0 = await app.posicao('a3');
    const b = (await app.no('a3').boundingBox())!;
    await page.mouse.move(b.x + 20, b.y + 20);
    await page.mouse.down();
    await page.mouse.move(b.x + 220, b.y + 120, { steps: 8 });
    await page.mouse.up();
    expect(await vp.getAttribute('style')).not.toBe(antes);
    expect(await app.posicao('a3')).toEqual(p0);
  });

  test('grade magnética alinha em múltiplos de 16 e pode ser desligada', async ({ app, page }) => {
    const b = (await app.no('a3').boundingBox())!;
    await page.mouse.move(b.x + 30, b.y + 20);
    await page.mouse.down();
    await page.mouse.move(b.x + 107, b.y + 63, { steps: 6 });
    await page.mouse.up();
    const p = await app.posicao('a3');
    expect(p.x % 16).toBe(0);
    expect(p.y % 16).toBe(0);
    const botao = page.getByRole('button', { name: 'Grade magnética' });
    await botao.click();
    await expect(botao).toHaveAttribute('aria-pressed', 'false');
  });

  test('minimapa liga e desliga', async ({ app, page }) => {
    await expect(page.locator('.react-flow__minimap')).toBeVisible();
    await page.getByRole('button', { name: 'Minimapa' }).click();
    await expect(page.locator('.react-flow__minimap')).toHaveCount(0);
  });

  test('preferências de exibição sobrevivem ao recarregar', async ({ app, page }) => {
    await page.getByRole('button', { name: 'Minimapa' }).click();
    await page.getByRole('button', { name: 'Grade magnética' }).click();
    await app.abrir();
    await expect(page.locator('.react-flow__minimap')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Grade magnética' })).toHaveAttribute('aria-pressed', 'false');
  });
});
