import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('gestor cria uma demanda atribuída', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas');
  await page.getByRole('button', { name: 'Nova demanda' }).click();
  await page.getByLabel('Título').fill('Fiscalização solicitada pelo sindicato');
  await page.getByLabel('Número do processo SEI (opcional)').fill('PROCESSO-FICTICIO-002');
  await page.getByLabel('Descrição').fill('Verificar condições do ambiente.');
  await page.getByLabel('Origem').fill('Sindicato');
  await page.getByLabel('Prazo', { exact: true }).fill('2026-10-20');
  await page.getByLabel('Prioridade').selectOption('alta');
  await page.getByRole('dialog').getByLabel('Responsável').selectOption('2');
  await page.getByLabel('Demanda crítica').check();
  await page.getByRole('button', { name: 'Salvar demanda' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('gestor recebe aviso de possível duplicidade do número SEI', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas');
  await page.getByRole('button', { name: 'Nova demanda' }).click();
  await page.getByLabel('Número do processo SEI (opcional)').fill('processo ficticio 001');
  await page.getByLabel('Número do processo SEI (opcional)').blur();
  await expect(page.getByText('Possível duplicidade')).toBeVisible();
  await expect(page.getByRole('link', { name: /PROCESSO-FICTICIO-001/ })).toBeVisible();
});

test('gestor interpreta texto, revisa e confirma demanda do SEI', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas');
  await page.getByRole('button', { name: 'Importar do SEI' }).click();
  await page.getByLabel('Texto copiado do SEI').fill('Número SEI: PROCESSO-FICTICIO-009\nAssunto: Inspeção importada');
  await page.getByRole('button', { name: 'Gerar prévia' }).click();
  await expect(page.getByLabel('Número do processo SEI')).toHaveValue('PROCESSO-FICTICIO-009');
  await expect(page.getByLabel('Título')).toHaveValue('Inspeção importada');
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  await page.getByLabel('Prazo', { exact: true }).fill('2026-10-20');
  await page.getByRole('button', { name: 'Confirmar e criar demanda' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('gestor edita e reatribui uma demanda', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
  await page.getByRole('button', { name: 'Editar demanda' }).click();
  await page.getByLabel('Título').fill('Inspeção revisada');
  await page.getByLabel('Responsável').selectOption('3');
  await page.getByRole('button', { name: 'Salvar demanda' }).click();
  await expect(page.getByRole('heading', { name: 'Inspeção revisada' })).toBeVisible();
  await expect(page.locator('.detail-card dd').filter({ hasText: 'Segundo inspetor' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Demanda atualizada com sucesso.');
});

test('formulário é acessível no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'gestor');
  await page.goto('/demandas');
  await page.getByRole('button', { name: 'Nova demanda' }).click();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('gestor cancela demanda com motivo', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
  await page.getByRole('button', { name: 'Cancelar demanda' }).click();
  await page.getByLabel('Motivo do cancelamento').fill('Solicitação retirada pela instituição de origem.');
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click();
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Demanda cancelada.');
  await expect(page.getByRole('button', { name: 'Editar demanda' })).toHaveCount(0);
});
