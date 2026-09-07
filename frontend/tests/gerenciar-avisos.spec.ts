import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('gestor publica, edita e cancela aviso', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/avisos');
  await page.getByRole('button', { name: 'Publicar aviso' }).click();
  await page.getByLabel('Título').fill('Comunicado criado');
  await page.getByLabel('Resumo').fill('Resumo criado');
  await page.getByLabel('Conteúdo').fill('Conteúdo criado para a equipe.');
  await page.getByLabel('Início da publicação').fill('2026-10-02T09:00');
  await page.getByLabel('Inspetor de teste').check();
  await page.getByRole('button', { name: 'Publicar aviso' }).last().click();
  await expect(page.getByRole('heading', { name: 'Comunicado criado' })).toBeVisible();
  await page.getByRole('link', { name: /Comunicado criado/ }).click();
  await page.getByRole('button', { name: 'Editar aviso' }).click();
  await page.getByLabel('Título').fill('Comunicado revisado');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('heading', { name: 'Comunicado revisado' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar aviso' }).first().click();
  await page.getByRole('button', { name: 'Cancelar aviso' }).last().click();
  await expect(page).toHaveURL(/\/avisos$/);
  await expect(page.getByRole('heading', { name: 'Comunicado revisado' })).toHaveCount(0);
});

test('inspetor não recebe ações de gestão', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/avisos');
  await expect(page.getByRole('button', { name: 'Publicar aviso' })).toHaveCount(0);
  await page.getByRole('link', { name: /Plantão extraordinário/ }).click();
  await expect(page.getByRole('button', { name: 'Editar aviso' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cancelar aviso' })).toHaveCount(0);
});
