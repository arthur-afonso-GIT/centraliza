import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import type { User } from '../lib/auth';
import type { ConversaFiltravel } from '../lib/conversas-filtros';

// Traces e vídeos podem registrar o POST de login e cookies de sessão.
test.use({ trace: 'off', video: 'off', screenshot: 'off' });
test.setTimeout(180_000);

function conta(papel: 'A' | 'B' | 'C' | 'D', local: boolean) {
  const usuarios = { A: 'demo.gestor.1', B: 'demo.inspetor.1', C: 'demo.inspetor2.1', D: 'demo.inspetor.2' };
  if (local) {
    const password = process.env.CENTRALIZA_SMOKE_PASSWORD;
    if (!password) throw new Error('Configure CENTRALIZA_SMOKE_PASSWORD para o smoke local.');
    return { username: usuarios[papel], password };
  }
  const username = process.env[`CENTRALIZA_CHAT_${papel}_USERNAME`];
  const password = process.env[`CENTRALIZA_CHAT_${papel}_PASSWORD`];
  if (!username || !password) throw new Error(`Configure CENTRALIZA_CHAT_${papel}_USERNAME e CENTRALIZA_CHAT_${papel}_PASSWORD para o smoke remoto.`);
  return { username, password };
}

async function entrar(page: Page, conta: { username: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Usuário').fill(conta.username);
  await page.getByLabel('Senha').fill(conta.password);
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith('/api/auth/login/') && r.request().method() === 'POST'),
    page.getByRole('button', { name: /^Entrar/ }).click(),
  ]);
  expect(response.status()).toBe(200);
  await expect(page).toHaveURL('/');
  return await response.json() as User;
}

async function sair(page: Page) {
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL('/login');
  expect((await page.request.get('/api/conversas/')).status()).toBe(401);
}

async function selecionarConversa(page: Page, titulo: string) {
  await page.getByRole('button').filter({ has: page.locator('strong', { hasText: titulo }) }).click();
  await expect(page.getByRole('heading', { name: titulo, exact: true })).toBeVisible();
}

async function abrir(page: Page, titulo: string) {
  await page.goto('/chats');
  await selecionarConversa(page, titulo);
}

async function enviar(page: Page, id: number, texto: string) {
  await page.getByLabel('Mensagem', { exact: true }).fill(texto);
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith(`/api/conversas/${id}/mensagens/`) && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Enviar mensagem' }).click(),
  ]);
  expect(response.status()).toBe(201);
  expect(response.request().headers()['x-csrftoken']).toBeTruthy();
  await expect(page.getByRole('list', { name: 'Mensagens', exact: true }).getByText(texto, { exact: true })).toBeVisible();
}

test('CHAT-01: duas sessões trocam mensagens, recuperam histórico e bloqueiam terceiros', async ({ browser, baseURL }, testInfo) => {
  const local = ['localhost', '127.0.0.1'].includes(new URL(baseURL!).hostname);
  const contas = { A: conta('A', local), B: conta('B', local), C: conta('C', local), D: conta('D', local) };
  expect(new Set(Object.values(contas).map(c => c.username)).size).toBe(4);
  const contextoA = await browser.newContext({ baseURL });
  const contextoB = await browser.newContext({ baseURL });
  try {
    const a = await contextoA.newPage();
    const b = await contextoB.newPage();
    expect((await a.request.get('/api/conversas/')).status()).toBe(401);
    const usuarioA = await entrar(a, contas.A);
    const usuarioB = await entrar(b, contas.B);
    const titulo = `CHAT-01 ${Date.now()}`;
    const mensagemA = `Mensagem de A — ${titulo}`;
    const mensagemB = `Resposta de B — ${titulo}`;

    await a.goto('/chats');
    await a.getByRole('button', { name: 'Nova conversa' }).click();
    await a.getByLabel('Assunto').fill(titulo);
    await a.getByRole('checkbox', { name: usuarioB.nome, exact: true }).check();
    const [criacao] = await Promise.all([
      a.waitForResponse(r => r.url().endsWith('/api/conversas/') && r.request().method() === 'POST'),
      a.getByRole('button', { name: 'Criar conversa' }).click(),
    ]);
    expect(criacao.status()).toBe(201);
    const conversa = await criacao.json() as ConversaFiltravel;
    expect(conversa.participantes.map(p => p.id).sort((a, b) => a - b)).toEqual([usuarioA.id, usuarioB.id].sort((a, b) => a - b));
    const url = `/api/conversas/${conversa.id}/`;
    // Sessão válida sem token CSRF não pode escrever.
    expect((await a.request.post(`${url}mensagens/`, { data: { texto: 'Sem CSRF' } })).status()).toBe(403);
    expect((await a.request.post('/api/conversas/', { data: { titulo: 'Sem CSRF', participante_ids: [usuarioB.id] } })).status()).toBe(403);

    await enviar(a, conversa.id, mensagemA);
    await abrir(b, titulo);
    await expect(b.getByRole('list', { name: 'Mensagens', exact: true }).getByText(mensagemA, { exact: true })).toBeVisible();
    await enviar(b, conversa.id, mensagemB);
    await a.getByRole('button', { name: 'Atualizar mensagens' }).click();
    await expect(a.getByRole('list', { name: 'Mensagens', exact: true }).getByText(mensagemB, { exact: true })).toBeVisible();

    for (const [page, credenciais, papel] of [[a, contas.A, 'A'], [b, contas.B, 'B']] as const) {
      const historico = page.getByRole('list', { name: 'Mensagens', exact: true });
      await page.reload();
      await selecionarConversa(page, titulo);
      await expect(historico.locator('li')).toHaveCount(2);
      await expect(historico.locator('li')).toContainText([mensagemA, mensagemB]);
      await sair(page);
      await entrar(page, credenciais);
      await abrir(page, titulo);
      await expect(historico.locator('li')).toHaveCount(2);
      await expect(historico.locator('li').nth(0)).toContainText(mensagemA);
      await expect(historico.locator('li').nth(1)).toContainText(mensagemB);
      const detalhe = await page.request.get(url);
      expect(detalhe.status()).toBe(200);
      const persistida = await detalhe.json() as ConversaFiltravel;
      expect(persistida.mensagens.map(m => m.autor_id)).toEqual([usuarioA.id, usuarioB.id]);
      const captura = testInfo.outputPath(`historico-${papel}.png`);
      await page.screenshot({ path: captura });
      await testInfo.attach(`historico-${papel}`, { path: captura, contentType: 'image/png' });
    }

    const membros = await (await a.request.get('/api/conversas/membros/')).json() as { resultados: Array<{ id: number }> };
    const negacoes: Array<{ papel: string; leitura: number; envio: number }> = [];
    for (const papel of ['C', 'D'] as const) {
      await sair(b);
      const usuario = await entrar(b, contas[papel]);
      expect(membros.resultados.some(m => m.id === usuario.id)).toBe(papel === 'C');
      const lista = await b.request.get('/api/conversas/');
      expect(lista.status()).toBe(200);
      expect((await lista.json() as { resultados: ConversaFiltravel[] }).resultados.some(c => c.id === conversa.id)).toBe(false);
      const leitura = (await b.request.get(url)).status();
      const csrf = await (await b.request.get('/api/auth/csrf/')).json() as { csrfToken: string };
      const envio = (await b.request.post(`${url}mensagens/`, {
        headers: { 'X-CSRFToken': csrf.csrfToken }, data: { texto: 'Tentativa indevida' },
      })).status();
      expect(leitura).toBe(404);
      expect(envio).toBe(404);
      await b.goto('/chats');
      await expect(b.getByRole('heading', { name: 'Conversas', exact: true })).toBeVisible();
      await expect(b.getByRole('button').filter({ has: b.locator('strong', { hasText: titulo }) })).toHaveCount(0);
      negacoes.push({ papel, leitura, envio });
    }
    const final = await a.request.get(url);
    expect((await final.json() as ConversaFiltravel).mensagens).toHaveLength(2);
    const evidencia = testInfo.outputPath('aceite-chat-01.json');
    await writeFile(evidencia, JSON.stringify({ ambiente: baseURL, executadoEm: new Date().toISOString(), conversaId: conversa.id,
      mensagens: 2, recargaENovoLogin: ['A', 'B'], semSessao: 401, semCsrf: 403, negacoes }, null, 2));
    await testInfo.attach('aceite-chat-01', { path: evidencia, contentType: 'application/json' });
  } finally {
    await contextoA.close();
    await contextoB.close();
  }
});
