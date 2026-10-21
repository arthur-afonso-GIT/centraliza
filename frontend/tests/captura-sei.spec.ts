import { expect, test } from '@playwright/test';
import { instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('páginas fictícias distinguem processo e documento', async ({ page }) => {
  await page.goto('/mock-sei/documento.html');
  await expect(page.locator('[data-sei-processo]')).toHaveText('PROCESSO-FICTICIO-2026-002');
  await expect(page.locator('[data-sei-documento]')).toHaveText('DOCUMENTO-987654');
  await page.goto('/mock-sei/ambiguo.html');
  await expect(page.locator('[data-sei-processo]')).toHaveCount(2);
});

test('captura permanece na aba durante login e é removida após salvar', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => sessionStorage.setItem('centraliza:captura-sei:v1', JSON.stringify({
    version: 1, sei_numero: 'PROCESSO-FICTICIO-2026-010', origem: 'Sindicato dos Trabalhadores',
  })));
  await page.goto('/captura-sei');
  await expect(page).toHaveURL(/\/login\?next=\/captura-sei$/);
  await page.getByLabel('Usuário').fill('demo.gestor.1');
  await page.getByLabel('Senha').fill('senha-de-teste');
  await page.getByRole('button', { name: /^Entrar/ }).click();
  await expect(page).toHaveURL(/\/captura-sei$/);
  await expect(page.getByLabel('Número do processo SEI')).toHaveValue('PROCESSO-FICTICIO-2026-010');
  await expect(page.getByLabel('Demandante (instituição)')).toHaveValue('Sindicato dos Trabalhadores');
  await page.getByLabel('Título da demanda').fill('Nova inspeção');
  await page.getByLabel('Prazo').fill('2026-11-15T17:00');
  await page.getByRole('button', { name: 'Criar demanda' }).click();
  await expect(page).toHaveURL(/\/demandas\/90$/);
  expect(await page.evaluate(() => sessionStorage.getItem('centraliza:captura-sei:v1'))).toBeNull();
});

test('captura ambígua pede número manual e cancelar descarta a aba', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuário').fill('demo.gestor.1');
  await page.getByLabel('Senha').fill('senha-de-teste');
  await page.getByRole('button', { name: /^Entrar/ }).click();
  await page.evaluate(() => sessionStorage.setItem('centraliza:captura-sei:v1', JSON.stringify({
    version: 1, sei_numero: '', origem: 'Instituição demonstrativa', aviso: 'Há mais de um número de processo visível.',
  })));
  await page.goto('/captura-sei');
  await expect(page.getByText('Há mais de um número de processo visível.')).toBeVisible();
  await expect(page.getByLabel('Número do processo SEI')).toHaveValue('');
  await page.getByRole('button', { name: 'Cancelar captura' }).click();
  await expect(page).toHaveURL(/\/demandas$/);
  expect(await page.evaluate(() => sessionStorage.getItem('centraliza:captura-sei:v1'))).toBeNull();
});
