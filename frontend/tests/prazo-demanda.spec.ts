import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

for (const perfil of ['gestor', 'inspetor'] as const) {
  test(`${perfil} altera prazo e consulta novamente sem mudar o fuso`, async ({ page }) => {
    await instalarApi(page);
    let prazo = '2026-10-30T20:00:00Z';
    const detalhe = () => ({
      id: 1, titulo: 'Demanda com prazo', sei_numero: 'HU3-001', descricao: '', origem: '',
      status: 'aceita', prioridade: 'media', prazo, critica: false, atrasada: false,
      responsavel: { id: 2, nome: 'Inspetor de teste' }, equipes_ids: [1], equipes: [],
      criada_em: '2026-10-21T12:00:00Z', atualizada_em: '2026-10-21T12:00:00Z', historico: [],
    });
    await page.route('**/api/demandas/1/', route => route.fulfill({ json: detalhe() }));
    await page.route('**/api/demandas/1/prazo/', async route => {
      expect(route.request().method()).toBe('PATCH');
      expect(route.request().postDataJSON()).toEqual({ prazo: '2026-10-31T18:30:00-03:00' });
      prazo = route.request().postDataJSON().prazo;
      await route.fulfill({ json: detalhe() });
    });
    await entrarComo(page, perfil);
    await page.goto('/demandas/1');
    await page.getByRole('button', { name: 'Alterar prazo', exact: true }).click();
    await expect(page.getByLabel('Data e horário limite')).toHaveValue('2026-10-30T17:00');
    await page.getByLabel('Data e horário limite').fill('2026-10-31T18:30');
    await page.getByRole('button', { name: 'Salvar prazo', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Prazo atualizado com sucesso.');
    await expect(page.locator('dd').filter({ hasText: '31/10/2026, 18:30' })).toBeVisible();
    await page.reload();
    await expect(page.locator('dd').filter({ hasText: '31/10/2026, 18:30' })).toBeVisible();
  });
}

test('erro ao salvar mantém formulário aberto e permite corrigir', async ({ page }) => {
  await instalarApi(page);
  await page.route('**/api/demandas/1/prazo/', route => route.fulfill({ status: 400, json: { prazo: ['Demandas encerradas não podem ter o prazo alterado.'] } }));
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await page.getByRole('button', { name: 'Alterar prazo', exact: true }).click();
  await page.getByLabel('Data e horário limite').fill('2026-10-31T18:30');
  await page.getByRole('button', { name: 'Salvar prazo', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Demandas encerradas');
  await expect(page.getByRole('button', { name: 'Salvar prazo', exact: true })).toBeEnabled();
});
