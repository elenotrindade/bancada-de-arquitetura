import { expect, test } from './fixtures';

const CHAVE = 'sk-ant-teste-1234567890abcdef';

test.describe('Chat de IA', () => {
  test('envia o quadro como contexto e mostra a resposta em markdown', async ({ app, page }) => {
    let enviado: any = null;
    await page.route('**/api/chat', async route => {
      enviado = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: 'O **Serviço de links** é ponto único de falha.\n\n- Adicione réplicas\n- Meça o p95' });
    });
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.fill('#chat-input', 'Onde está o risco?');
    await page.keyboard.press('Enter');
    const resposta = page.locator('.msg.assistant .md');
    await expect(resposta.locator('strong')).toHaveText('Serviço de links');
    await expect(resposta.locator('li')).toHaveCount(2);
    expect(enviado.provider).toBe('anthropic');
    expect(enviado.apiKey).toBe(CHAVE);
    expect(enviado.system).toContain('**Serviço de links**');
    expect(enviado.system).toContain('Segurança:');
    expect(enviado.messages.at(-1)).toEqual({ role: 'user', content: 'Onde está o risco?' });
  });

  test('botões de pergunta rápida enviam a mensagem', async ({ app, page }) => {
    let texto = '';
    await page.route('**/api/chat', async route => { texto = route.request().postDataJSON().messages.at(-1).content; await route.fulfill({ status: 200, body: 'Ok.' }); });
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.getByRole('button', { name: 'Onde está o ponto único de falha?' }).click();
    await expect(page.locator('.msg.assistant')).toHaveText('Ok.');
    expect(texto).toBe('Onde está o ponto único de falha?');
  });

  test('anexar imagem do quadro envia JPEG junto da mensagem', async ({ app, page }) => {
    let imagem = '';
    await page.route('**/api/chat', async route => { imagem = route.request().postDataJSON().messages.at(-1).image || ''; await route.fulfill({ status: 200, body: 'Vi a imagem.' }); });
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.check('#ai-attach');
    await page.fill('#chat-input', 'Olhe o desenho');
    await page.keyboard.press('Enter');
    await expect(page.locator('.msg.assistant')).toHaveText('Vi a imagem.');
    expect(imagem).toMatch(/^data:image\/jpeg;base64,/);
    await expect(page.locator('.msg.user .attach')).toHaveText('imagem do quadro anexada');
  });

  test('erro do provedor aparece como mensagem de erro', async ({ app, page }) => {
    await page.route('**/api/chat', route => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'Limite de uso atingido ou conta sem créditos no provedor.' }) }));
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.fill('#chat-input', 'Oi');
    await page.keyboard.press('Enter');
    await expect(page.locator('.msg.error')).toContainText('Limite de uso atingido');
  });

  test('chave inválida de verdade: o servidor repassa o erro do provedor', async ({ app, page }) => {
    await app.aba('IA');
    await page.fill('#ai-key', 'sk-ant-chave-invalida-para-teste');
    await page.fill('#chat-input', 'Revise meu desenho');
    await page.keyboard.press('Enter');
    await expect(page.locator('.msg.error')).toContainText(/Chave de API inválida|provedor/, { timeout: 20_000 });
  });

  test('sem chave, pede para configurar', async ({ app, page }) => {
    await app.aba('IA');
    await page.fill('#chat-input', 'Oi');
    await page.keyboard.press('Enter');
    await expect(page.locator('.toast')).toContainText('Informe a chave');
    await expect(page.locator('.msg')).toHaveCount(0);
  });

  test('buscar modelos preenche as sugestões', async ({ app, page }) => {
    await page.route('**/api/models', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: ['modelo-a', 'modelo-b'] }) }));
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.getByRole('button', { name: 'Buscar modelos' }).click();
    await expect(page.locator('#ai-models option')).toHaveCount(2);
    await page.fill('#ai-model', 'modelo-b');
    await page.reload();
    await app.aba('IA');
    await expect(page.locator('#ai-model')).toHaveValue('modelo-b');
  });

  test('cada provedor tem a sua chave em memória', async ({ app, page }) => {
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.selectOption('#ai-provider', 'openai');
    await expect(page.locator('#ai-key')).toHaveValue('');
    await page.fill('#ai-key', 'sk-openai-teste-123456');
    await page.selectOption('#ai-provider', 'anthropic');
    await expect(page.locator('#ai-key')).toHaveValue(CHAVE);
  });

  test('limpar conversa pede confirmação', async ({ app, page }) => {
    await page.route('**/api/chat', route => route.fulfill({ status: 200, body: 'Resposta.' }));
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.fill('#chat-input', 'Oi');
    await page.keyboard.press('Enter');
    await expect(page.locator('.msg')).toHaveCount(2);
    await page.getByRole('button', { name: 'Limpar conversa' }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(page.locator('.msg')).toHaveCount(0);
  });

  test('conversa fica salva junto do quadro', async ({ app, page }) => {
    await page.route('**/api/chat', route => route.fulfill({ status: 200, body: 'Guardado.' }));
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.fill('#chat-input', 'Lembre disso');
    await page.keyboard.press('Enter');
    await expect(page.locator('.msg.assistant')).toHaveText('Guardado.');
    await page.waitForTimeout(700);
    await app.abrir();
    await app.aba('IA');
    await expect(page.locator('.msg.assistant')).toHaveText('Guardado.');
  });
});

test.describe('Cofre da chave', () => {
  test('sem salvar, a chave some ao recarregar', async ({ app, page }) => {
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await app.abrir();
    await app.aba('IA');
    await expect(page.locator('#ai-key')).toHaveValue('');
    await expect(page.locator('#ai-unlock-pass')).toHaveCount(0);
  });

  test('senha curta é recusada', async ({ app, page }) => {
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.check('#ai-remember');
    await page.fill('#ai-pass', 'curta');
    await page.getByRole('button', { name: 'Salvar protegida' }).click();
    await expect(page.getByRole('alert')).toContainText('pelo menos 8 caracteres');
  });

  test('salvar, recarregar, errar a senha, desbloquear, bloquear e apagar', async ({ app, page }) => {
    test.setTimeout(90_000);
    await app.aba('IA');
    await page.fill('#ai-key', CHAVE);
    await page.check('#ai-remember');
    await page.fill('#ai-pass', 'senha-forte-123');
    await page.getByRole('button', { name: 'Salvar protegida' }).click();
    await expect(page.getByRole('button', { name: 'Bloquear agora' })).toBeVisible({ timeout: 15_000 });

    await app.abrir();
    await app.aba('IA');
    await page.fill('#ai-unlock-pass', 'senha-errada-000');
    await page.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.getByRole('alert')).toHaveText('Senha incorreta.', { timeout: 15_000 });
    await page.fill('#ai-unlock-pass', 'senha-forte-123');
    await page.getByRole('button', { name: 'Desbloquear' }).click();
    await expect(page.locator('#ai-key')).toHaveValue(CHAVE, { timeout: 15_000 });

    await page.getByRole('button', { name: 'Bloquear agora' }).click();
    await expect(page.locator('#ai-unlock-pass')).toBeVisible();
    await page.getByRole('button', { name: 'Esqueci a senha' }).click();
    await page.getByRole('button', { name: /Confirmar: apagar/ }).click();
    await expect(page.locator('#ai-key')).toHaveValue('');
    await app.abrir();
    await app.aba('IA');
    await expect(page.locator('#ai-unlock-pass')).toHaveCount(0);
  });

  test('chaves antigas em texto puro são apagadas ao abrir', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('semeado')) {
        localStorage.setItem('bancada:key:openai', 'sk-antiga-em-texto-puro');
        sessionStorage.setItem('semeado', '1');
      }
    });
    await page.goto('/');
    await page.locator('.react-flow__node').first().waitFor();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('bancada:key:openai'))).toBeNull();
  });
});
