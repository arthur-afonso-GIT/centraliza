import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('abre o feed categorizado e consulta o detalhe do aviso', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.getByRole('link', { name: 'Avisos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Plantão extraordinário' })).toBeVisible();
  await expect(page.getByText('Urgente', { exact: true })).toBeVisible();
  await expect(page.getByText('Informativo', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Plantão extraordinário/ }).click();
  await expect(page).toHaveURL(/\/avisos\/1$/);
  await expect(page.getByText('Consulte a nova escala')).toBeVisible();
  await page.getByRole('link', { name: 'Voltar aos avisos' }).click();
  await expect(page).toHaveURL(/\/avisos$/);
});

test('feed e detalhe de avisos são acessíveis em celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'gestor');
  await page.goto('/avisos');
  await expect(page.getByRole('heading', { name: 'Plantão extraordinário' })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.goto('/avisos/1');
  await expect(page.getByRole('heading', { name: 'Plantão extraordinário' })).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('informa quando o aviso não pertence à equipe', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/avisos/404');
  await expect(page.getByRole('heading', { name: 'Aviso indisponível' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar aos avisos' })).toBeVisible();
});
