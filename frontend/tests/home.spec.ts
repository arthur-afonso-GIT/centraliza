import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('gestor recebe indicadores da equipe e distribuição por inspetor', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await expect(page.getByText('Demandas vencidas')).toBeVisible();
  await expect(page.getByText('Sem responsável')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Carga ativa por inspetor' })).toBeVisible();
  await expect(page.getByText('Segundo inspetor')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Demandas prioritárias' })).toBeVisible();
  await page.getByText('Sem responsável').click();
  await expect(page).toHaveURL(/\/demandas\?sem_responsavel=true$/);
  await expect(page.getByLabel('Sem responsável')).toBeChecked();
});

test('inspetor recebe resumo pessoal sem carga da equipe', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await expect(page.getByText('Entregas atrasadas')).toBeVisible();
  await expect(page.getByText('Correções solicitadas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Carga ativa por inspetor' })).toHaveCount(0);
  await page.getByText('Correções solicitadas').click();
  await expect(page.getByRole('tab', { name: 'Em correção' })).toHaveAttribute('aria-selected', 'true');
});
