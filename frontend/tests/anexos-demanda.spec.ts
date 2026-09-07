import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('gestor envia, baixa e remove evidência da demanda', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
  await expect(page.getByText('Nenhum arquivo anexado.')).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'relatorio.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nconteudo') });
  await expect(page.getByText('relatorio.pdf').first()).toBeVisible();
  await expect(page.getByText('Anexo adicionado: relatorio.pdf')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Baixar relatorio.pdf' }).click();
  expect((await download).suggestedFilename()).toBeTruthy();
  await page.getByRole('button', { name: 'Remover relatorio.pdf' }).click();
  await page.getByRole('button', { name: 'Remover anexo' }).click();
  await expect(page.getByText('Nenhum arquivo anexado.')).toBeVisible();
  await expect(page.getByText('Anexo removido: relatorio.pdf')).toBeVisible();
});

test('valida tipo e mantém a área de anexos acessível', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await page.locator('input[type=file]').setInputFiles({ name: 'programa.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('teste') });
  await expect(page.getByRole('alert')).toContainText('PDF, JPEG ou PNG');
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
});
