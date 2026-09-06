import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

async function entrar(page: import('@playwright/test').Page, perfil: 'gestor' | 'inspetor') {
  await entrarComo(page, perfil);
  await page.goto('/demandas');
}

test('gestor filtra demandas e percorre a paginação', async ({ page }) => {
  await entrar(page, 'gestor');
  await expect(page.getByRole('status')).toContainText('Carregando demandas');
  await expect(page.getByText('9 demandas')).toBeVisible();
  await expect(page.locator('.demand-card')).toHaveCount(4);

  await page.getByRole('button', { name: 'Próxima' }).click();
  await expect(page.getByText('Página 2 de 3')).toBeVisible();

  const pendentes = page.getByRole('tab', { name: 'Pendentes' });
  await pendentes.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Em andamento' })).toBeFocused();
  await expect(page.getByText('5 demandas')).toBeVisible();
  await expect(page.getByText('Página 1 de 2')).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Críticas' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('4 demandas')).toBeVisible();
});

test('inspetor visualiza somente demandas atribuídas em tela móvel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrar(page, 'inspetor');
  await expect(page.getByText('7 demandas')).toBeVisible();
  await expect(page.getByText('Não atribuída')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
