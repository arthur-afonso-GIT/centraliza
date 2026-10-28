import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

async function iniciar(page: Page) {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await expect(page.getByRole('heading', { name: 'Registrar andamento' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Aceitar demanda' }).click();
  await page.getByRole('button', { name: 'Iniciar demanda' }).click();
  await expect(page.getByRole('heading', { name: 'Registrar andamento' })).toBeVisible();
}

test('inspetor registra e consulta após recarregar; gestor consulta o mesmo histórico', async ({ page }) => {
  await iniciar(page);
  await expect(page.getByRole('button', { name: 'Salvar andamento' })).toBeDisabled();
  await page.getByLabel('O que foi realizado').fill('Visita realizada.\nEntrevistas concluídas.');
  await expect(page.getByRole('button', { name: 'Salvar andamento' })).toBeDisabled();
  await page.getByLabel('O que está pendente').fill('Receber laudo.');
  await page.getByRole('button', { name: 'Salvar andamento' }).click();
  await expect(page.getByRole('status')).toHaveText('Andamento registrado com sucesso.');
  await expect(page.getByLabel('O que foi realizado')).toHaveValue('');
  await expect(page.locator('.detail-actions .status')).toHaveText('Em andamento');
  await page.reload();
  await expect(page.locator('.progress-record')).toContainText('Visita realizada.');
  await expect(page.locator('.progress-record')).toContainText('Receber laudo.');
  await expect(page.locator('.timeline li').first()).toContainText('Inspetor de teste');
  await expect(page.locator('.timeline li').first()).toContainText('14/09/2026');
  await page.getByRole('button', { name: /Sair/ }).click();
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
  await expect(page.locator('.progress-record')).toContainText('Receber laudo.');
  await expect(page.getByRole('heading', { name: 'Registrar andamento' })).toHaveCount(0);
});

test('preserva texto após falha e permite tentar novamente', async ({ page }) => {
  await iniciar(page);
  await page.getByLabel('O que foi realizado').fill('Visita realizada.');
  await page.getByLabel('O que está pendente').fill('Receber laudo.');
  await page.route('**/api/demandas/1/andamentos/', route => route.fulfill({ status: 500, json: { detail: 'Falha temporária. Tente novamente.' } }), { times: 1 });
  await page.getByRole('button', { name: 'Salvar andamento' }).click();
  await expect(page.getByRole('alert')).toHaveText('Falha temporária. Tente novamente.');
  await expect(page.getByLabel('O que foi realizado')).toHaveValue('Visita realizada.');
  await expect(page.getByLabel('O que está pendente')).toHaveValue('Receber laudo.');
  await expect(page.locator('.progress-record')).toHaveCount(0);
  await page.getByRole('button', { name: 'Salvar andamento' }).click();
  await expect(page.locator('.progress-record')).toHaveCount(1);
});

test('formulário acessível em tela pequena e histórico sem rolagem horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await iniciar(page);
  await page.getByLabel('O que foi realizado').fill('a'.repeat(2000));
  await page.getByLabel('O que está pendente').fill('Nenhuma pendência.');
  await page.getByRole('button', { name: 'Salvar andamento' }).click();
  await expect(page.locator('.progress-record')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
});
