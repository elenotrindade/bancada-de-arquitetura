import { expect, test } from './fixtures';

test.describe('Celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('sem rolagem horizontal, ferramentas embaixo e painel como gaveta', async ({ app, page }, info) => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    const barra = (await page.locator('.toolbar').boundingBox())!;
    expect(barra.y).toBeGreaterThan(600);
    await expect(page.locator('.sidebar')).toBeHidden();
    await info.attach('celular', { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Painel', exact: true }).click();
    await expect(page.locator('.sidebar')).toBeVisible();
    await info.attach('celular-painel', { body: await page.screenshot(), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Fechar painel' }).click();
    await expect(page.locator('.sidebar')).toBeHidden();
  });

  test('tocar num componente seleciona e mostra a barra do elemento', async ({ app, page }) => {
    await app.no('a3').tap();
    await expect(page.locator('.react-flow__node[data-id="a3"]')).toHaveClass(/selected/);
    await expect(app.barraDoElemento).toBeVisible();
  });
});

test.describe('Tema escuro', () => {
  test.use({ colorScheme: 'dark' });

  test('usa o fundo escuro e mantém o texto legível', async ({ app, page }, info) => {
    const fundo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(fundo).toBe('rgb(15, 20, 23)');
    const texto = await page.evaluate(() => getComputedStyle(document.querySelector('.n-name')!).color);
    expect(texto).not.toBe('rgb(0, 0, 0)');
    await info.attach('tema-escuro', { body: await page.screenshot(), contentType: 'image/png' });
  });
});

test('desktop claro', async ({ app, page }, info) => {
  await info.attach('desktop-claro', { body: await page.screenshot(), contentType: 'image/png' });
  await expect(page.locator('.react-flow__node-component')).toHaveCount(5);
});
