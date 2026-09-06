import { test, expect } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('protege rotas; gestor navega, atualiza e sai', async ({ page }) => {
  await page.goto('/demandas');
  await expect(page).toHaveURL('/login');
  await entrarComo(page, 'gestor');
  await expect(page.getByRole('heading', { name: 'Olá, Gestor.' })).toBeVisible();
  for (const title of ['Agenda', 'Avisos', 'Demandas', 'Chats', 'Home']) {
    const link = page.getByRole('navigation').getByRole('link', { name: title, exact: true });
    await link.click();
    await expect(page.getByRole('navigation').getByRole('link', { name: title, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await page.goto('/demandas');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Demandas', exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Agenda', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Demandas', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Agenda', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await page.goto('/agenda');
  await expect(page).toHaveURL('/login');
});

test('inspetor usa menu móvel por teclado e sem overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'inspetor');
  await expect(page.getByRole('heading', { name: 'Olá, Inspetor.' })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Abrir menu' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('navigation')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(page.getByRole('navigation')).toBeHidden();
  await menu.click();
  await page.getByRole('navigation').getByRole('link', { name: 'Demandas' }).click();
  await expect(page.getByRole('heading', { name: 'Demandas', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('rota desconhecida retorna 404 e permite voltar', async ({ page }) => {
  const response = await page.goto('/nao-existe');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar para a Home' }).click();
  await expect(page).toHaveURL('/login');
});

test('falha temporária da API permite tentar novamente', async ({ page }) => {
  await page.unroute('**/api/**');
  let first = true;
  await page.route('**/api/auth/me/', route => first ? (first = false, route.abort()) : route.fulfill({ status: 401, json: { detail: 'Não autenticado.' } }));
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Não foi possível acessar a sessão' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('button', { name: /^Entrar/ })).toBeVisible();
});
