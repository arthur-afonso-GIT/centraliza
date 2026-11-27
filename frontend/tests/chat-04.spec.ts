import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test('pagina conversas e histórico, preserva rolagem e pesquisa no servidor', async ({ page }) => {
  await instalarApi(page);
  const mensagens = Array.from({ length: 60 }, (_, i) => ({ id: i+1, texto: i === 0 ? 'Relatório antigo de inspeção' : `Registro ${i+1}`, criada_em: '2026-11-18T12:00:00Z', autor_id: 1, autor_nome: 'Gestor de teste' }));
  const resumo = (id: number) => ({ id, titulo: `Assunto ${id}`, criada_em: '2026-11-18T12:00:00Z', atualizada_em: '2026-11-18T12:00:00Z', participantes: [{ id: 1, nome: 'Gestor de teste' }], ultima_mensagem: 'Último registro' });
  const consultas: URL[] = [];
  let falha = true;
  await page.route('**/api/conversas/**', route => {
    const u = new URL(route.request().url()); consultas.push(u);
    if (u.pathname.endsWith('/membros/')) return route.fulfill({ json: { resultados: [{ id: 1, nome: 'Gestor de teste' }] } });
    if (u.pathname === '/api/conversas/') {
      const busca = u.searchParams.get('palavra');
      return route.fulfill({ json: { resultados: busca ? [resumo(1)] : u.searchParams.has('cursor') ? [resumo(1)] : [resumo(2)], proximo_cursor: busca || u.searchParams.has('cursor') ? null : 'lista-2' } });
    }
    if (u.pathname === '/api/conversas/1/') {
      if (u.searchParams.has('cursor') && falha) { falha = false; return route.fulfill({ status: 503, json: {} }); }
      return route.fulfill({ json: { ...resumo(1), mensagens: u.searchParams.has('palavra') ? [mensagens[0]] : u.searchParams.has('cursor') ? mensagens.slice(0,30) : mensagens.slice(30), proximo_cursor: u.searchParams.has('cursor') || u.searchParams.has('palavra') ? null : 'historico-2' } });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await entrarComo(page, 'inspetor'); await page.goto('/chats');
  await expect(page.getByRole('button', { name: /Assunto 1/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Carregar mais conversas' }).click();
  await page.getByRole('button', { name: /Assunto 1/ }).click();
  const lista = page.getByRole('list', { name: 'Mensagens' });
  await expect(lista.getByText('Registro 60', { exact: true })).toBeVisible();
  await expect(lista.getByText('Relatório antigo de inspeção')).toHaveCount(0);
  await lista.evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
  await page.getByRole('button', { name: 'Carregar mensagens anteriores' }).click();
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar mensagens anteriores');
  await page.getByRole('button', { name: 'Carregar mensagens anteriores' }).click();
  await expect(lista.locator('li')).toHaveCount(60);
  expect(await lista.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.getByLabel('Buscar no histórico').fill('relatorio');
  await page.getByRole('button', { name: 'Buscar mensagens' }).click();
  await expect(lista.getByText('Relatório antigo de inspeção')).toBeVisible();
  await expect(lista.locator('li')).toHaveCount(1);
  await page.getByLabel('Palavra-chave', { exact: true }).fill('relatorio');
  await expect.poll(() => consultas.some(u => u.pathname === '/api/conversas/' && u.searchParams.get('palavra') === 'relatorio')).toBeTruthy();
  await expect(page.getByRole('button', { name: /Assunto 2/ })).toHaveCount(0);
  expect(consultas.some(u => u.searchParams.get('cursor') === 'lista-2')).toBeTruthy();
  expect(consultas.some(u => u.pathname === '/api/conversas/1/' && u.searchParams.get('palavra') === 'relatorio')).toBeTruthy();
});

test('atualização consome todas as páginas novas e mantém o mesmo apos', async ({ page }) => {
  await instalarApi(page);
  const mensagem = (id: number) => ({ id, texto: `Mensagem ${id}`, criada_em: '2026-11-18T12:00:00Z', autor_id: 1, autor_nome: 'Gestor' });
  const conversa = { id: 1, titulo: 'Volume', criada_em: '2026-11-18T12:00:00Z', atualizada_em: '2026-11-18T12:00:00Z', participantes: [], mensagens: [mensagem(1)] };
  const apos: string[] = [];
  await page.route('**/api/conversas/**', route => {
    const u = new URL(route.request().url());
    if (u.pathname.endsWith('/membros/')) return route.fulfill({ json: { resultados: [] } });
    if (u.pathname === '/api/conversas/') return route.fulfill({ json: { resultados: [conversa], proximo_cursor: null } });
    if (u.searchParams.has('apos')) {
      apos.push(u.searchParams.get('apos')!);
      return route.fulfill({ json: { ...conversa, mensagens: [mensagem(u.searchParams.has('cursor') ? 3 : 2)], proximo_cursor: u.searchParams.has('cursor') ? null : 'novas-2' } });
    }
    return route.fulfill({ json: { ...conversa, proximo_cursor: null } });
  });
  await entrarComo(page, 'inspetor'); await page.goto('/chats');
  await page.getByRole('button', { name: /Volume/ }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Mensagens atualizadas' })).toBeVisible();
  await page.getByRole('button', { name: 'Atualizar mensagens', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Mensagens' }).locator('li')).toHaveCount(3);
  expect(apos).toEqual(['1', '1']);
});
