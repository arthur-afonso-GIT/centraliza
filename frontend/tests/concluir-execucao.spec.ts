import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

async function iniciarExecucao(page: Page) {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  for (const [status, label] of [['aceita', 'Aceita'], ['em_andamento', 'Em andamento']]) {
    await page.getByLabel('Novo status').selectOption(status);
    await page.getByRole('button', { name: 'Salvar status' }).click();
    await expect(page.locator('.detail-actions .status')).toHaveText(label);
  }
}

test('inspetor registra a conclusão da execução com resumo', async ({ page }) => {
  await iniciarExecucao(page);
  await expect(page.getByLabel('Novo status').locator('option')).toHaveText(['Execução concluída (enviar para avaliação)']);
  await expect(page.getByText('Ao salvar, a conclusão fica registrada no histórico')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar status' })).toBeDisabled();
  await page.getByLabel('Resumo da entrega').fill('Vistoria realizada e relatório anexado.');
  await page.getByRole('button', { name: 'Salvar status' }).click();
  await expect(page.getByRole('status')).toHaveText('Execução concluída. A demanda saiu das suas pendências e foi enviada para avaliação.');
  await expect(page.locator('.detail-actions .status')).toHaveText('Aguardando avaliação');
  await expect(page.getByRole('heading', { name: 'Execução concluída' })).toBeVisible();
  await expect(page.locator('.acceptance-note')).toContainText('Você registrou a conclusão em');
  await expect(page.locator('.timeline')).toContainText('Em andamento → Aguardando avaliação');
  await expect(page.locator('.timeline')).toContainText('Vistoria realizada e relatório anexado.');
  await expect(page.getByRole('region', { name: 'Status da demanda' })).toHaveCount(0);
});

test('gestor vê quem concluiu a execução e pode avaliar', async ({ page }) => {
  await iniciarExecucao(page);
  await page.getByLabel('Resumo da entrega').fill('Inspeção finalizada.');
  await page.getByRole('button', { name: 'Salvar status' }).click();
  await expect(page.locator('.detail-actions .status')).toHaveText('Aguardando avaliação');
  await page.getByRole('button', { name: 'Sair' }).click();
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
  await expect(page.locator('.acceptance-note')).toContainText('Inspetor de teste registrou a conclusão em');
  await expect(page.getByRole('button', { name: 'Aprovar demanda' })).toBeVisible();
});

test('conclusão da execução é acessível e cabe no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await iniciarExecucao(page);
  await page.getByLabel('Resumo da entrega').fill('Inspeção finalizada.');
  await page.getByRole('button', { name: 'Salvar status' }).click();
  await expect(page.getByRole('heading', { name: 'Execução concluída' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
});
