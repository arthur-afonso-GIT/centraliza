import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-23T15:00:00Z') });
  await instalarApi(page);
});

test('gestor cria, edita e cancela compromisso sem recarregar a página', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/agenda');
  await page.getByRole('button', { name: 'Novo compromisso' }).click();
  await page.getByLabel('Título').fill('Reunião criada');
  await page.getByLabel('Início').fill('2026-09-25T09:00');
  await page.getByLabel('Fim').fill('2026-09-25T10:00');
  await page.getByLabel('Inspetor de teste').check();
  await page.getByRole('button', { name: 'Salvar compromisso' }).click();
  await expect(page.getByText('Reunião criada')).toBeVisible();
  await page.getByRole('button', { name: 'Editar Reunião criada' }).click();
  await page.getByLabel('Título').fill('Reunião revisada');
  await page.getByRole('button', { name: 'Salvar compromisso' }).click();
  await expect(page.getByText('Reunião revisada')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar Reunião revisada' }).click();
  await page.getByRole('button', { name: 'Cancelar compromisso' }).click();
  await expect(page.getByText('Reunião revisada')).toHaveCount(0);
});

test('inspetor consulta a agenda sem ações de gestão', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/agenda');
  await expect(page.getByText('Reunião de alinhamento')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo compromisso' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Editar Reunião/ })).toHaveCount(0);
});
