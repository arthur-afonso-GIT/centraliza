import { expect, test, type Page } from '@playwright/test';

// Use two dedicated accounts in the same team. Credentials are never stored here.
const contaA = process.env.CENTRALIZA_CHAT_USER_A;
const contaB = process.env.CENTRALIZA_CHAT_USER_B;
const senha = process.env.CENTRALIZA_CHAT_PASSWORD;

test('CHAT-02: duas sessões recebem mensagens e recuperam envio com PostgreSQL real', async ({ browser, baseURL }) => {
  test.skip(!contaA || !contaB || !senha, 'Defina CENTRALIZA_CHAT_USER_A, CENTRALIZA_CHAT_USER_B e CENTRALIZA_CHAT_PASSWORD.');
  test.setTimeout(60000);
  const contextoA = await browser.newContext({ baseURL });
  const contextoB = await browser.newContext({ baseURL });
  try {
    const a = await contextoA.newPage();
    const b = await contextoB.newPage();
    async function entrar(page: Page, username: string) {
      await page.goto('/login');
      await page.getByLabel('Usuário').fill(username);
      await page.getByLabel('Senha').fill(senha!);
      await page.getByRole('button', { name: /^Entrar/ }).click();
      await expect(page).toHaveURL('/');
    }
    await entrar(a, contaA!);
    await entrar(b, contaB!);
    const usuarioB = await (await b.request.get('/api/auth/me/')).json() as { id: number };
    const csrf = await (await a.request.get('/api/auth/csrf/')).json() as { csrfToken: string };
    const titulo = `CHAT-02 smoke ${Date.now()}`;
    const criada = await a.request.post('/api/conversas/', {
      headers: { 'X-CSRFToken': csrf.csrfToken }, data: { titulo, participante_ids: [usuarioB.id] },
    });
    expect(criada.status()).toBe(201);
    const conversa = await criada.json() as { id: number };
    for (const page of [a, b]) {
      await page.goto('/chats');
      await page.getByRole('button', { name: new RegExp(titulo) }).click();
    }
    await b.getByLabel('Mensagem', { exact: true }).fill('Resposta recebida automaticamente');
    await b.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(a.getByRole('list', { name: 'Mensagens' }).getByText('Resposta recebida automaticamente')).toBeVisible({ timeout: 20000 });
    // The actual API saves the POST; only its response is lost on the way back.
    const endpoint = `**/api/conversas/${conversa.id}/mensagens/`;
    await a.route(endpoint, async route => { await route.fetch(); await route.abort(); }, { times: 1 });
    await a.getByLabel('Mensagem', { exact: true }).fill('Persistir uma vez');
    await a.getByRole('button', { name: 'Enviar mensagem' }).click();
    await expect(a.getByRole('alert')).toContainText('Seu texto foi preservado');
    await a.getByRole('button', { name: 'Tentar enviar novamente' }).click();
    await expect(a.getByLabel('Mensagem', { exact: true })).toHaveValue('');
    await a.reload();
    await a.getByRole('button', { name: new RegExp(titulo) }).click();
    await expect(a.getByRole('list', { name: 'Mensagens' }).getByText('Persistir uma vez')).toHaveCount(1);
    const detalhe = await (await a.request.get(`/api/conversas/${conversa.id}/`)).json() as { mensagens: Array<{ texto: string }> };
    expect(detalhe.mensagens.filter(item => item.texto === 'Persistir uma vez')).toHaveLength(1);
  } finally {
    await contextoA.close();
    await contextoB.close();
  }
});
