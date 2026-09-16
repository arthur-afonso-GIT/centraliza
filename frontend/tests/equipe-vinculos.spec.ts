import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => {
  await instalarApi(page);
  await page.route('**/api/usuarios/equipes/', route => route.fulfill({ json: { resultados: [
    { id: 1, equipe: 1, equipe_nome: 'Equipe Norte', papel: 'gestor', pode_administrar: true, ativo: true, criado_em: '2026-09-14T12:00:00Z', encerrado_em: null },
    { id: 2, equipe: 2, equipe_nome: 'Equipe Sul', papel: 'inspetor', pode_administrar: false, ativo: true, criado_em: '2026-09-14T12:00:00Z', encerrado_em: null },
  ] } }));
});

test('usuário com múltiplos vínculos pode alternar a equipe ativa', async ({ page }) => {
  await entrarComo(page, 'gestor');
  const selector = page.getByLabel('Equipe ativa');
  await expect(selector).toBeVisible();
  await selector.selectOption('2');
  await expect(selector).toHaveValue('2');
  expect(await page.evaluate(() => localStorage.getItem('centraliza_equipe_ativa'))).toBe('2');
});
