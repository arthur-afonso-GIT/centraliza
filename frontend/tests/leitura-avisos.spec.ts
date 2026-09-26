import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('abrir registra leitura e filtros preservam o estado após recarregar', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/avisos');
  await expect(page.getByText('2 avisos para ler')).toBeVisible();
  await page.getByRole('button', { name: 'Não lidos', exact: true }).click();
  await page.getByRole('link', { name: /Plantão extraordinário/ }).click();
  await expect(page.locator('.notice-detail .notice-reading-state')).toHaveText('Lido');
  await page.reload();
  await expect(page.locator('.notice-detail .notice-reading-state')).toHaveText('Lido');
  await page.getByRole('link', { name: 'Voltar aos avisos' }).click();
  await expect(page.getByText('1 aviso para ler')).toBeVisible();
  await page.getByRole('button', { name: 'Não lidos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plantão extraordinário' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Lidos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plantão extraordinário' })).toBeVisible();
  await page.getByLabel('Buscar avisos').fill('plantao');
  await expect(page.locator('.notice-card')).toHaveCount(1);
  await page.getByRole('combobox', { name: /^Categoria/ }).selectOption('informativo');
  await expect(page.getByRole('heading', { name: 'Nenhum aviso encontrado' })).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.locator('.notice-card')).toHaveCount(2);
});

test('falha ao registrar leitura mantém conteúdo e oferece nova tentativa', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  let falhar = true;
  await page.route('**/api/avisos/1/leitura/', async route => {
    if (falhar) return route.fulfill({ status: 503, json: { detail: 'Não foi possível registrar a leitura.' } });
    return route.fallback();
  });
  await page.goto('/avisos/1');
  await expect(page.getByRole('alert')).toContainText('Não foi possível registrar a leitura.');
  await expect(page.getByRole('heading', { name: 'Plantão extraordinário' })).toBeVisible();
  falhar = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.notice-detail .notice-reading-state')).toHaveText('Lido');
});

test('erro de cancelamento mantém diálogo aberto e permite tentar novamente', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/avisos/1');
  let falhar = true;
  await page.route('**/api/avisos/1/', async route => {
    if (route.request().method() === 'DELETE' && falhar) return route.fulfill({ status: 503 });
    return route.fallback();
  });
  await page.getByRole('button', { name: 'Cancelar aviso' }).first().click();
  await page.getByRole('button', { name: 'Cancelar aviso' }).last().click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Não foi possível cancelar o aviso.');
  falhar = false;
  await page.getByRole('button', { name: 'Cancelar aviso' }).last().click();
  await expect(page).toHaveURL(/\/avisos$/);
});

for (const width of [390, 1366]) {
  test(`avisos renderizados em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await entrarComo(page, 'gestor');
    await page.goto('/avisos');
    await expect(page.getByRole('heading', { name: 'Plantão extraordinário' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('avisos.png'), fullPage: true });
    await page.goto('/avisos/1');
    await expect(page.locator('.notice-detail .notice-reading-state')).toHaveText('Lido');
    await page.screenshot({ path: testInfo.outputPath('aviso-lido.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
