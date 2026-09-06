import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('inspetor abre detalhe, altera status e vê a lista atualizada', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas');
  await page.getByRole('link', { name: 'Ver detalhes' }).first().click();
  await expect(page).toHaveURL('/demandas/1');
  await expect(page.getByRole('heading', { name: 'Inspeção demonstrativa 1' })).toBeVisible();
  await expect(page.getByText('Ainda não há eventos registrados.')).toBeVisible();

  await page.getByRole('button', { name: 'Iniciar demanda' }).click();
  await expect(page.getByRole('status')).toHaveText('Demanda iniciada com sucesso.');
  await expect(page.getByText('Pendente → Em andamento')).toBeVisible();

  await page.getByRole('link', { name: 'Voltar para demandas' }).click();
  await expect(page.getByText('Inspeção demonstrativa 1')).toHaveCount(0);
});

test('comentário aparece imediatamente na timeline', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
  await page.getByLabel('Adicionar registro').fill('Contato realizado com o estabelecimento.');
  await page.getByRole('button', { name: 'Registrar comentário' }).click();
  await expect(page.getByRole('status')).toHaveText('Comentário registrado.');
  await expect(page.getByText('Contato realizado com o estabelecimento.')).toBeVisible();
  await expect(page.locator('.timeline small')).toContainText('Gestor de teste');
});

test('detalhe indisponível apresenta estado de 404', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/404');
  await expect(page.getByRole('heading', { name: 'Demanda indisponível' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar para demandas' })).toBeVisible();
});

test('detalhe é acessível e não cria rolagem horizontal no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await expect(page.getByRole('heading', { name: 'Inspeção demonstrativa 1' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
});
