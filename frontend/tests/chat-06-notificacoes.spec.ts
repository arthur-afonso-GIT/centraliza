import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

type Notificacoes = { total: number; conversas: Array<{ id: number; titulo: string; nao_lidas: number; ultima_mensagem: { id: number; autor_nome: string; criada_em: string } }> };

const conversa = (naoLidas: number, ultimaId: number, autor = 'Gestor de teste') => ({
  id: 1, titulo: 'Visita técnica', nao_lidas: naoLidas,
  ultima_mensagem: { id: ultimaId, autor_nome: autor, criada_em: '2026-11-18T12:10:00Z' },
});

async function prepararChat(page: Page, inicial: Notificacoes) {
  const estado = { dados: inicial, consultas: 0, cursor: 0 };
  await page.clock.install({ time: new Date('2026-11-18T15:00:00Z') });
  await instalarApi(page);
  await page.route('**/api/notificacoes/chat/', route => { estado.consultas += 1; return route.fulfill({ json: estado.dados }); });
  await page.route('**/api/conversas/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/conversas/membros/') return route.fulfill({ json: { resultados: [] } });
    if (path === '/api/conversas/1/leitura/') {
      estado.cursor = (route.request().postDataJSON() as { mensagem_id: number }).mensagem_id;
      estado.dados = { total: 0, conversas: [] };
      return route.fulfill({ json: { ultima_mensagem_lida_id: estado.cursor } });
    }
    const item = {
      id: 1, titulo: 'Visita técnica', criada_em: '2026-11-18T12:00:00Z', atualizada_em: '2026-11-18T12:10:00Z',
      participantes: [{ id: 1, nome: 'Gestor de teste' }, { id: 2, nome: 'Inspetor de teste' }],
      mensagens: [{ id: 11, texto: 'Conteúdo da mensagem', criada_em: '2026-11-18T12:10:00Z', autor_id: 1, autor_nome: 'Gestor de teste' }],
      ultima_mensagem_lida_id: estado.cursor, nao_lidas: estado.cursor >= 11 ? 0 : 1,
    };
    if (path === '/api/conversas/') return route.fulfill({ json: { resultados: [item] } });
    if (path === '/api/conversas/1/') return route.fulfill({ json: item });
    return route.fulfill({ status: 404 });
  });
  return estado;
}

const linkChats = (page: Page) => page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: /Chats/ });

test('mostra o total de não lidas no menu sem alertar mensagens antigas', async ({ page }) => {
  await prepararChat(page, { total: 2, conversas: [conversa(2, 10)] });
  await entrarComo(page, 'inspetor');
  await page.goto('/agenda');
  await expect(linkChats(page)).toHaveAccessibleName(/Chats, 2 mensagens não lidas no chat/);
  await expect(linkChats(page).locator('.nav-count')).toContainText('2');
  await expect(page.locator('.chat-aviso')).toHaveCount(0);
});

test('avisa nova mensagem fora do chat com autor e conversa e abre a conversa', async ({ page }) => {
  const estado = await prepararChat(page, { total: 0, conversas: [] });
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas');
  await expect.poll(() => estado.consultas).toBeGreaterThan(0);
  await expect(linkChats(page).locator('.nav-count')).toHaveCount(0);

  estado.dados = { total: 3, conversas: [conversa(3, 11)] };
  await page.clock.fastForward(30000);
  const aviso = page.getByRole('region', { name: 'Nova mensagem em Visita técnica' });
  await expect(aviso).toContainText('Nova mensagem de Gestor de teste em “Visita técnica”');
  await expect(aviso).toContainText('3 mensagens não lidas nesta conversa');
  await expect(aviso).not.toContainText('Conteúdo da mensagem');
  await expect(linkChats(page)).toHaveAccessibleName(/3 mensagens não lidas no chat/);

  await aviso.getByRole('link', { name: 'Abrir conversa' }).click();
  await expect(page).toHaveURL(/\/chats\?conversa=1$/);
  await expect(page.getByRole('heading', { name: 'Visita técnica' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Mensagens' })).toContainText('Conteúdo da mensagem');
  await expect.poll(() => estado.cursor).toBe(11);
  await expect(linkChats(page).locator('.nav-count')).toHaveCount(0);
});

test('não repete o aviso ao trocar de tela e permite dispensá-lo', async ({ page }) => {
  const estado = await prepararChat(page, { total: 0, conversas: [] });
  await entrarComo(page, 'inspetor');
  await page.goto('/agenda');
  await expect.poll(() => estado.consultas).toBeGreaterThan(0);
  estado.dados = { total: 1, conversas: [conversa(1, 11)] };
  await page.clock.fastForward(30000);
  const aviso = page.locator('.chat-aviso');
  await expect(aviso).toHaveCount(1);
  await page.getByRole('button', { name: 'Dispensar aviso de Visita técnica' }).click();
  await expect(aviso).toHaveCount(0);

  const consultas = estado.consultas;
  await page.goto('/demandas');
  await expect.poll(() => estado.consultas).toBeGreaterThan(consultas);
  await expect(linkChats(page).locator('.nav-count')).toContainText('1');
  await expect(aviso).toHaveCount(0);
});

test('na tela de Chats não exibe o aviso flutuante', async ({ page }) => {
  const estado = await prepararChat(page, { total: 0, conversas: [] });
  await entrarComo(page, 'inspetor');
  await page.goto('/chats');
  await expect.poll(() => estado.consultas).toBeGreaterThan(0);
  estado.dados = { total: 1, conversas: [conversa(1, 11)] };
  await page.clock.fastForward(30000);
  await expect(linkChats(page).locator('.nav-count')).toContainText('1');
  await expect(page.locator('.chat-aviso')).toHaveCount(0);
});

test('aviso e contador são acessíveis no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const estado = await prepararChat(page, { total: 0, conversas: [] });
  await entrarComo(page, 'inspetor');
  await page.goto('/');
  await expect.poll(() => estado.consultas).toBeGreaterThan(0);
  estado.dados = { total: 4, conversas: [conversa(4, 11, 'Gestora com um nome bastante longo para quebrar a linha')] };
  await page.clock.fastForward(30000);
  await expect(page.locator('.chat-aviso')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir menu, 4 mensagens não lidas no chat' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).include('.chat-avisos').include('.mobile-header').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
});
