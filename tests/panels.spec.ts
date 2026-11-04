import { readFile } from 'node:fs/promises';
import { SCENARIOS } from '../lib/scenarios';
import { expect, test } from './fixtures';

test.describe('Cenários', () => {
  test('cada cenário mostra contexto, requisitos e números', async ({ app, page }) => {
    for (const s of SCENARIOS.filter(s => !s.custom)) {
      await app.cenario(s.id);
      await app.aba('Cenário');
      await expect(page.locator('.side-body h2').first()).toHaveText(s.name);
      await expect(page.locator('.metric')).toHaveCount(s.quality!.length);
    }
  });

  test('cada cenário tem o próprio quadro', async ({ app, page }) => {
    await app.adicionarComponente('Fila');
    await app.cenario('delivery');
    await expect(page.locator('.empty-hint')).toBeVisible();
    await app.cenario('encurtador');
    await expect(page.locator('.react-flow__node-component')).toHaveCount(6);
  });

  test('revelar mudança de requisito', async ({ app, page }) => {
    await app.aba('Cenário');
    await page.getByRole('button', { name: 'Revelar mudança de requisito' }).click();
    await expect(page.locator('.twist')).toContainText('painel com cliques por país');
    expect(await app.resumo()).toContain('Mudança de requisito (já revelada)');
  });

  test('perguntas de arquiteto contam e vão para o resumo', async ({ app, page }) => {
    await app.aba('Cenário');
    await page.check('#q-dono');
    await page.check('#q-falha');
    await expect(page.getByText('2/8')).toBeVisible();
    const r = await app.resumo();
    expect(r).toContain('Acho que o desenho já responde:\n- Cada dado tem um único dono');
  });

  test('cenário livre guarda os campos e vai para o resumo', async ({ app, page }) => {
    await app.quadroVazio();
    await app.aba('Cenário');
    await page.fill('#c-name', 'Plataforma de cursos');
    await page.fill('#c-quality', '5 mil alunos simultâneos em dia de prova');
    await page.waitForTimeout(600);
    await app.abrir();
    await app.aba('Cenário');
    await expect(page.locator('#c-name')).toHaveValue('Plataforma de cursos');
    const r = await app.resumo();
    expect(r).toContain('# Exercício de arquitetura: Plataforma de cursos');
    expect(r).toContain('- 5 mil alunos simultâneos em dia de prova');
  });
});

test.describe('Decisões (ADRs)', () => {
  test('criar, preencher, contar, resumir e remover', async ({ app, page }) => {
    await app.aba('Decisões');
    await page.getByRole('button', { name: 'Nova decisão' }).click();
    const titulo = page.locator('[id^="adr-title-"]');
    await titulo.fill('PostgreSQL como fonte da verdade');
    await page.locator('[id^="adr-decision-"]').fill('Banco relacional com réplicas de leitura');
    await expect(page.getByRole('tab', { name: /Decisões/ })).toContainText('1');
    expect(await app.resumo()).toContain('### ADR 001: PostgreSQL como fonte da verdade');
    await app.aba('Decisões');
    await page.getByRole('button', { name: 'Remover decisão' }).click();
    await page.getByRole('button', { name: 'Confirmar remoção' }).click();
    await expect(titulo).toHaveCount(0);
  });
});

test.describe('Resumo e arquivo', () => {
  test('resumo é copiado para a área de transferência', async ({ app, page }) => {
    await page.getByRole('button', { name: 'Resumo para IA' }).click();
    await expect(page.locator('.modal')).toContainText('Copiado');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('## Componentes');
    expect(clip).toContain('## O que eu quero de você');
  });

  test('exporta PNG válido do quadro inteiro', async ({ app, page }) => {
    await page.getByRole('button', { name: 'Arquivo' }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Exportar imagem/ }).click()]);
    const buf = await readFile((await dl.path())!);
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect(buf.length).toBeGreaterThan(20_000);
    expect(dl.suggestedFilename()).toBe('encurtador-de-links.png');
  });

  test('exporta resumo em Markdown', async ({ app, page }) => {
    await page.getByRole('button', { name: 'Arquivo' }).click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('menuitem', { name: /Exportar resumo/ }).click()]);
    const txt = await readFile((await dl.path())!, 'utf8');
    expect(txt).toContain('# Exercício de arquitetura: Encurtador de links');
  });

  test('menu não oferece importação de arquivo', async ({ app, page }) => {
    await page.getByRole('button', { name: 'Arquivo' }).click();
    await expect(page.getByRole('menuitem', { name: /Importar/ })).toHaveCount(0);
    await expect(page.locator('input[type="file"][accept*="json"]')).toHaveCount(0);
  });

  test('limpar quadro pede confirmação e pode ser desfeito', async ({ app, page }) => {
    await page.getByRole('button', { name: 'Arquivo' }).click();
    await page.getByRole('menuitem', { name: /Limpar quadro/ }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(7);
    await page.getByRole('menuitem', { name: /Confirmar/ }).click();
    await expect(page.locator('.react-flow__node')).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(page.locator('.react-flow__node')).toHaveCount(7);
  });

  test('quadro editado sobrevive ao recarregar', async ({ app, page }) => {
    await app.adicionarComponente('Barramento de eventos');
    await page.waitForTimeout(700);
    await app.abrir();
    await expect(page.locator('.react-flow__node-component', { hasText: 'Barramento de eventos' })).toHaveCount(1);
  });
});

test.describe('Painel lateral', () => {
  test('fechar e reabrir', async ({ app, page }) => {
    await page.getByRole('button', { name: 'Fechar painel' }).click();
    await expect(page.locator('.sidebar')).toBeHidden();
    await page.getByRole('button', { name: 'Painel', exact: true }).click();
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('sem seleção, Detalhes mostra o guia e os atalhos', async ({ app, page }) => {
    await app.aba('Detalhes');
    await expect(page.getByRole('heading', { name: 'Como praticar' })).toBeVisible();
    await expect(page.locator('.shortcuts .kbd')).toHaveCount(10);
  });

  test('selecionar um elemento abre a aba Detalhes', async ({ app, page }) => {
    await app.aba('Cenário');
    await app.no('a2').click();
    await expect(page.getByRole('tab', { name: 'Detalhes' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#i-name')).toHaveValue('API Gateway');
  });
});
