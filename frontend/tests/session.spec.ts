import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('todas as páginas privadas exigem sessão', async ({ page }) => {
  for (const route of ['/', '/agenda', '/avisos', '/demandas', '/chats']) {
    await page.goto(route);
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('button', { name: /^Entrar/ })).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);
  }
});

test('credenciais inválidas permitem corrigir e entrar', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuário').fill('demo.gestor.1');
  await page.getByLabel('Senha').fill('incorreta');
  await page.getByRole('button', { name: /^Entrar/ }).click();
  await expect(page.getByRole('heading', { name: 'Não foi possível acessar a sessão' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await entrarComo(page, 'gestor');
  await expect(page.getByRole('heading', { name: 'Olá, Gestor.' })).toBeVisible();
});

test('logout encerra a sessão no servidor', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL('/login');
  await page.goto('/demandas');
  await expect(page).toHaveURL('/login');
});

test('carregamento da sessão é anunciado', async ({ page }) => {
  await page.route('**/api/auth/me/', async route => { await new Promise(resolve => setTimeout(resolve, 300)); await route.fulfill({ status: 401, json: {} }); });
  await page.goto('/login');
  await expect(page.getByRole('status')).toHaveText('Preparando seu espaço de trabalho…');
  await expect(page.getByRole('button', { name: /^Entrar/ })).toBeVisible();
});

test('atalho de conteúdo funciona por teclado com foco visível', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await expect(page.locator('#conteudo')).toBeFocused();
  for (let step = 0; step < 9; step++) {
    await page.keyboard.press('Shift+Tab');
    if (await page.getByRole('link', { name: 'Pular para o conteúdo' }).evaluate(node => node === document.activeElement)) break;
  }
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();
});
