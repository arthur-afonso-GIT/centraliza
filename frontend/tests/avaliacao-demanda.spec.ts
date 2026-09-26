import { expect, test, type Page } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

async function enviarParaAvaliacao(page: Page) {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await expect(page.getByRole('button', { name: 'Iniciar demanda' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Aceitar demanda' }).click();
  await expect(page.locator('.detail-actions .status')).toHaveText('Aceita');
  await page.getByRole('button', { name: 'Iniciar demanda' }).click();
  await page.getByLabel('Resumo da entrega').fill('Inspeção realizada e relatório conferido.');
  await page.getByRole('button', { name: 'Enviar para avaliação' }).click();
  await expect(page.getByText('Aguardando avaliação', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
}

test('gestor aprova uma entrega do inspetor', async ({ page }) => {
  await enviarParaAvaliacao(page);
  await page.getByRole('button', { name: 'Aprovar demanda' }).click();
  await page.getByRole('button', { name: 'Confirmar aprovação' }).click();
  await expect(page.getByText('Concluída', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Demanda aprovada e concluída.');
});

test('gestor devolve uma entrega com justificativa', async ({ page }, testInfo) => {
  await enviarParaAvaliacao(page);
  await page.getByRole('button', { name: 'Solicitar correção' }).click();
  await expect(page.getByRole('button', { name: 'Enviar para correção' })).toBeDisabled();
  await page.getByLabel('Justificativa da correção').fill('Inclua as fotografias da inspeção.');
  await page.getByRole('button', { name: 'Enviar para correção' }).click();
  await expect(page.locator('.detail-actions .status')).toHaveText('Em correção');
  await expect(page.locator('.correction-callout')).toContainText('Inclua as fotografias da inspeção.');
  await expect(page.getByRole('status')).toHaveText('Demanda devolvida para correção.');
  await page.getByRole('button', { name: 'Sair' }).click();
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await expect(page.locator('.correction-callout')).toContainText('Inclua as fotografias da inspeção.');
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`correcao-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByLabel('Resumo da entrega').fill('Fotografias incluídas e relatório reenviado.');
  await page.getByRole('button', { name: 'Reenviar para avaliação' }).click();
  await expect(page.getByText('Aguardando avaliação', { exact: true })).toBeVisible();
});
