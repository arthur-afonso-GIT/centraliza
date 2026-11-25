import { expect, test, type Page } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

const message = (id: number, texto = `Mensagem ${id}`) => ({ id, texto, criada_em: `2026-11-25T12:${String(Math.floor(id / 60)).padStart(2, '0')}:${String(id % 60).padStart(2, '0')}Z`, autor_id: 1, autor_nome: 'Gestor de teste' });
async function preparar(page: Page, quantidade = 1) {
  await instalarApi(page);
  const conversas = [1, 2].map(id => ({ id, titulo: `Conversa ${id}`, criada_em: '2026-11-25T12:00:00Z', atualizada_em: '2026-11-25T12:00:00Z', participantes: [{ id: 1, nome: 'Gestor de teste' }, { id: 2, nome: 'Inspetor de teste' }], mensagens: Array.from({ length: quantidade }, (_, i) => message(i + 1)) }));
  const state = { falharGet: false, perderResposta: false, segurar: false, gets: 0, listas: 0, posts: [] as Array<{ texto: string; client_id: string }>, liberar: () => {} };
  await page.route('**/api/conversas/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/conversas/membros/') return route.fulfill({ json: { resultados: [{ id: 1, nome: 'Gestor de teste' }] } });
    if (path === '/api/conversas/') { state.listas++; return route.fulfill({ json: { resultados: conversas } }); }
    const conversa = conversas[Number(path.split('/')[3]) - 1];
    if (route.request().method() === 'GET') {
      state.gets++;
      // Capture a snapshot to exercise GET/POST response ordering.
      const snapshot = JSON.parse(JSON.stringify(conversa));
      if (state.segurar) await new Promise<void>(resolve => { state.liberar = resolve; });
      return route.fulfill({ status: state.falharGet ? 503 : 200, json: state.falharGet ? {} : snapshot });
    }
    const payload = route.request().postDataJSON() as { texto: string; client_id: string };
    const repetido = state.posts.some(item => item.client_id === payload.client_id);
    state.posts.push(payload);
    if (!repetido) conversa.mensagens.push({ ...message(100 + state.posts.length, payload.texto), autor_id: 2 });
    if (state.perderResposta) { state.perderResposta = false; return route.abort(); }
    return route.fulfill({ status: repetido ? 200 : 201, json: conversa.mensagens.at(-1) });
  });
  await entrarComo(page, 'inspetor');
  await page.goto('/chats');
  await page.getByRole('button', { name: /Conversa 1/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Mensagens atualizadas' })).toBeVisible();
  return { state, conversas };
}

test('atualiza só a conversa aberta em 15s e permite recuperar falha de rede', async ({ page }) => {
  await page.clock.install();
  const { state, conversas } = await preparar(page);
  conversas[0].mensagens.push(message(2, 'Resposta de B'));
  await page.clock.fastForward(15000);
  await expect(page.getByRole('list', { name: 'Mensagens' }).getByText('Resposta de B')).toBeVisible();
  expect(state.listas).toBe(1);
  state.falharGet = true;
  await page.clock.fastForward(15000);
  await expect(page.getByRole('alert')).toContainText('Não foi possível atualizar');
  state.falharGet = false;
  await page.getByRole('button', { name: 'Tentar atualizar novamente' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('não sobrepõe consultas e ignora resposta de conversa anterior', async ({ page }) => {
  await page.clock.install();
  const { state } = await preparar(page);
  state.segurar = true;
  await page.getByRole('button', { name: 'Atualizar mensagens', exact: true }).click();
  await expect.poll(() => state.gets).toBe(2);
  await page.clock.fastForward(10000);
  await page.getByRole('button', { name: 'Atualizar mensagens', exact: true }).click();
  expect(state.gets).toBe(2);
  state.segurar = false;
  const liberarAnterior = state.liberar;
  await page.getByRole('button', { name: /Conversa 2/ }).click();
  await expect(page.getByRole('heading', { name: 'Conversa 2' })).toBeVisible();
  liberarAnterior();
  await expect(page.getByRole('status').filter({ hasText: 'Mensagens atualizadas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Conversa 2' })).toBeVisible();
});

test('preserva rascunho e identidade no reenvio após resposta perdida', async ({ page }) => {
  const { state } = await preparar(page);
  state.perderResposta = true;
  await page.getByLabel('Mensagem', { exact: true }).fill('Texto preservado');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByRole('alert')).toContainText('Seu texto foi preservado');
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue('Texto preservado');
  await page.getByRole('button', { name: /Conversa 2/ }).click();
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue('');
  await page.getByLabel('Mensagem', { exact: true }).fill('Outro rascunho');
  await page.getByRole('button', { name: /Conversa 1/ }).click();
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue('Texto preservado');
  await page.getByRole('button', { name: 'Tentar enviar novamente' }).click();
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue('');
  await expect(page.getByRole('list', { name: 'Mensagens' }).getByText('Texto preservado')).toHaveCount(1);
  expect(state.posts).toHaveLength(2);
  expect(state.posts[0].client_id).toBe(state.posts[1].client_id);
  await page.getByRole('button', { name: /Conversa 2/ }).click();
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue('Outro rascunho');
});

test('resposta GET antiga não apaga envio confirmado', async ({ page }) => {
  const { state } = await preparar(page);
  state.segurar = true;
  await page.getByRole('button', { name: 'Atualizar mensagens', exact: true }).click();
  await expect.poll(() => state.gets).toBe(2);
  await page.getByLabel('Mensagem', { exact: true }).fill('Envio confirmado');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  const enviado = page.getByRole('list', { name: 'Mensagens' }).getByText('Envio confirmado');
  await expect(enviado).toHaveCount(1);
  state.segurar = false;
  state.liberar();
  await expect(page.getByRole('status').filter({ hasText: 'Mensagens atualizadas' })).toBeVisible();
  await expect(enviado).toHaveCount(1);
});

test('acompanha o fim e preserva a leitura do histórico, inclusive no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { conversas } = await preparar(page, 40);
  const lista = page.getByRole('list', { name: 'Mensagens' });
  const distanciaFim = () => lista.evaluate(el => el.scrollHeight - el.scrollTop - el.clientHeight);
  await expect.poll(distanciaFim).toBeLessThan(48);
  conversas[0].mensagens.push(message(41));
  await page.getByRole('button', { name: 'Atualizar mensagens', exact: true }).click();
  await expect(lista.getByText('Mensagem 41', { exact: true })).toBeVisible();
  await expect.poll(distanciaFim).toBeLessThan(48);
  await lista.evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
  conversas[0].mensagens.push(message(42));
  await page.getByRole('button', { name: 'Atualizar mensagens', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ver novas mensagens' })).toBeVisible();
  expect(await lista.evaluate(el => el.scrollTop)).toBe(0);
  await page.getByRole('button', { name: 'Ver novas mensagens' }).click();
  await expect.poll(distanciaFim).toBeLessThan(48);
});
