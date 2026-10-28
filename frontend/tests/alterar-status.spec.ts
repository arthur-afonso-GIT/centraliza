import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('inspetor escolhe o novo status e vê a situação atualizada imediatamente', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  const card = page.getByRole('region', { name: 'Status da demanda' });
  await expect(card).toContainText('Situação atual: Aguardando aceite');
  await expect(page.getByLabel('Novo status').locator('option')).toHaveText(['Aceita']);
  await page.getByLabel('Novo status').selectOption('aceita');
  await page.getByRole('button', { name: 'Salvar status' }).click();
  await expect(page.getByRole('status')).toHaveText('Status alterado para Aceita.');
  await expect(page.locator('.detail-actions .status')).toHaveText('Aceita');
  await expect(card).toContainText('Situação atual: Aceita');
  await expect(page.locator('.demand-progress [aria-current="step"]')).toContainText('Aceite');
  await expect(page.locator('.timeline')).toContainText('Aguardando aceite → Aceita');
  await expect(page.getByLabel('Novo status').locator('option')).toHaveText(['Em andamento']);
  await page.reload();
  await expect(page.locator('.detail-actions .status')).toHaveText('Aceita');
});

test('status que exige resumo só é salvo com o texto preenchido', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  for (const [status, label] of [['aceita', 'Aceita'], ['em_andamento', 'Em andamento']]) {
    await page.getByLabel('Novo status').selectOption(status);
    await page.getByRole('button', { name: 'Salvar status' }).click();
    await expect(page.locator('.detail-actions .status')).toHaveText(label);
  }
  await expect(page.getByRole('button', { name: 'Salvar status' })).toBeDisabled();
  await page.getByLabel('Resumo da entrega').fill('Vistoria concluída e relatório anexado.');
  await page.getByRole('button', { name: 'Salvar status' }).click();
  await expect(page.locator('.detail-actions .status')).toHaveText('Aguardando avaliação');
  await expect(page.locator('.timeline')).toContainText('Vistoria concluída e relatório anexado.');
  await expect(page.getByRole('region', { name: 'Status da demanda' })).toHaveCount(0);
});

test('falha ao salvar mantém o status anterior e mostra o erro', async ({ page }) => {
  await page.route('**/api/demandas/1/status/', route => route.fulfill({ status: 400, json: { status: ['Transição de status não permitida.'] } }));
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await page.getByRole('button', { name: 'Salvar status' }).click();
  await expect(page.getByRole('alert')).toContainText('Transição de status não permitida.');
  await expect(page.locator('.detail-actions .status')).toHaveText('Aguardando aceite');
});

test('gestor não vê o seletor do inspetor', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
  await expect(page.getByRole('button', { name: 'Editar demanda' })).toBeVisible();
  await expect(page.getByLabel('Novo status')).toHaveCount(0);
});

test('seletor de status é acessível e cabe no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await expect(page.getByLabel('Novo status')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
});
