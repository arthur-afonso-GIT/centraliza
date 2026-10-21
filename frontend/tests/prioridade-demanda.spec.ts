import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

test('inspetor altera prioridade, vê histórico e mantém o valor ao recarregar', async ({ page }) => {
  let prioridade = 'alta';
  let falhar = true;
  const historico: Array<Record<string, unknown>> = [];
  const demanda = () => ({ id: 1, titulo: 'Demanda HU4', sei_numero: 'HU4-001', descricao: '', origem: '', status: 'pendente', prioridade, prazo: '2026-12-01', critica: false, responsavel: { id: 2, nome: 'Inspetor de teste' }, equipes_ids: [1], equipes: [], criada_em: '2026-10-20T12:00:00Z', atualizada_em: '2026-10-20T12:00:00Z', historico });
  await page.route('**/api/demandas/1/', route => route.fulfill({ json: demanda() }));
  await page.route('**/api/demandas/1/prioridade/', route => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().postDataJSON()).toEqual({ prioridade: 'baixa' });
    if (falhar) { falhar = false; return route.fulfill({ status: 500, json: { detail: 'Falha temporária.' } }); }
    prioridade = 'baixa';
    historico.push({ id: 1, tipo: 'demanda_editada', autor: { id: 2, nome: 'Inspetor de teste' }, criado_em: '2026-10-20T12:00:00Z', texto: 'Prioridade alterada de Alta para Baixa.' });
    return route.fulfill({ json: demanda() });
  });
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await page.getByLabel('Nível de prioridade').selectOption('baixa');
  await page.getByRole('button', { name: 'Salvar prioridade' }).click();
  await expect(page.getByRole('alert')).toContainText('Falha temporária.');
  await page.getByRole('button', { name: 'Salvar prioridade' }).click();
  await expect(page.getByText('Prioridade atualizada com sucesso.')).toBeVisible();
  await expect(page.locator('.timeline')).toContainText('Prioridade alterada de Alta para Baixa.');
  await page.reload();
  await expect(page.getByLabel('Nível de prioridade')).toHaveValue('baixa');
  await expect(page.getByRole('button', { name: 'Salvar prioridade' })).toBeDisabled();
});

test('gestor continua usando a edição geral', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
  await expect(page.getByRole('button', { name: 'Editar demanda' })).toBeVisible();
  await expect(page.getByLabel('Nível de prioridade')).toHaveCount(0);
});

for (const status of ['concluida', 'cancelada']) {
  test(`inspetor não altera prioridade de demanda ${status}`, async ({ page }) => {
    await page.route('**/api/demandas/1/', async route => {
      await route.fulfill({ json: { id: 1, titulo: 'Encerrada', status, prioridade: 'alta', prazo: '2026-12-01', responsavel: { id: 2, nome: 'Inspetor de teste' }, equipes: [], historico: [], criada_em: '2026-10-20T12:00:00Z', atualizada_em: '2026-10-20T12:00:00Z' } });
    });
    await entrarComo(page, 'inspetor');
    await page.goto('/demandas/1');
    await expect(page.getByRole('heading', { name: 'Encerrada', exact: true })).toBeVisible();
    await expect(page.getByLabel('Nível de prioridade')).toHaveCount(0);
  });
}
