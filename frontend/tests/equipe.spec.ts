import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('gestor autorizado cria e edita integrante da própria equipe', async ({ page }) => {
  await entrarComo(page, 'gestor'); await page.goto('/equipe');
  await expect(page.locator('#nome-equipe')).toHaveText('VISAT Demonstração 1');
  await page.getByRole('button', { name: 'Novo integrante' }).click();
  await page.getByLabel('Usuário').fill('nova.inspetora'); await page.getByLabel('Senha inicial').fill('SenhaSegura@2026');
  await page.getByLabel('Nome', { exact: true }).fill('Nova'); await page.getByLabel('Sobrenome', { exact: true }).fill('Inspetora');
  await page.getByRole('button', { name: 'Salvar integrante' }).click();
  await expect(page.getByRole('heading', { name: 'Nova Inspetora' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar Nova Inspetora' }).click();
  await page.getByLabel('Conta ativa').uncheck(); await page.getByRole('button', { name: 'Salvar integrante' }).click();
  await expect(page.getByText('Conta inativa')).toBeVisible();
});

test('inspetor consulta a equipe sem ações administrativas', async ({ page }) => {
  await entrarComo(page, 'inspetor'); await page.goto('/equipe');
  await expect(page.locator('#nome-equipe')).toHaveText('VISAT Demonstração 1');
  await expect(page.getByRole('button', { name: 'Novo integrante' })).toHaveCount(0);
  await expect(page.getByText('Somente gestores autorizados podem alterar as contas da equipe.')).toBeVisible();
});
