import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test.use({ timezoneId: 'Pacific/Honolulu' });

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
      expect(route.request().postDataJSON()).toEqual({ prazo: '2026-10-31T18:30:00-03:00', atualizada_em: '2026-10-21T12:00:00Z' });
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


test('conflito de edição bloqueia sobrescrita e oferece recarregar', async ({ page }) => {
  await instalarApi(page);
  await page.route('**/api/demandas/1/prazo/', route => route.fulfill({ status: 409, json: { detail: 'A demanda foi atualizada por outra pessoa. Recarregue antes de salvar o prazo.' } }));
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await page.getByRole('button', { name: 'Alterar prazo', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar prazo', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('atualizada por outra pessoa');
  await expect(page.getByRole('button', { name: 'Salvar prazo', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Recarregar demanda', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('salvar sem editar preserva segundos e frações do prazo original', async ({ page }) => {
  await instalarApi(page);
  const original = '2026-10-30T20:00:59.123456Z';
  const detalhe = { id: 1, titulo: 'Prazo com segundos', sei_numero: 'HU3-SEG', descricao: '', origem: '', status: 'aceita', prioridade: 'media', prazo: original, critica: false, atrasada: false, responsavel: { id: 2, nome: 'Inspetor de teste' }, equipes_ids: [1], equipes: [], criada_em: '2026-10-21T12:00:00Z', atualizada_em: '2026-10-21T12:00:00Z', historico: [] };
  await page.route('**/api/demandas/1/', route => route.fulfill({ json: detalhe }));
  await page.route('**/api/demandas/1/prazo/', async route => {
    expect(route.request().postDataJSON().prazo).toBe(original);
    await route.fulfill({ json: detalhe });
  });
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await page.getByRole('button', { name: 'Alterar prazo', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar prazo', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Prazo atualizado com sucesso.');
});


test('editar somente o título não reenvia nem trunca o prazo', async ({ page }) => {
  await instalarApi(page);
  const detalhe = { id: 1, titulo: 'Título original', sei_numero: 'HU3-TITULO', descricao: '', origem: '', status: 'aceita', prioridade: 'media', prazo: '2026-10-30T20:00:59.123456Z', critica: false, atrasada: false, responsavel: { id: 2, nome: 'Inspetor de teste' }, equipes_ids: [1], equipes: [], criada_em: '2026-10-21T12:00:00Z', atualizada_em: '2026-10-21T12:00:00Z', historico: [] };
  await page.route('**/api/demandas/1/', async route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      expect(body).not.toHaveProperty('prazo');
      expect(body.atualizada_em).toBe(detalhe.atualizada_em);
      expect(body.titulo).toBe('Novo título');
      await route.fulfill({ json: { ...detalhe, titulo: body.titulo } });
    } else await route.fulfill({ json: detalhe });
  });
  await entrarComo(page, 'gestor');
  await page.goto('/demandas/1');
  await page.getByRole('button', { name: 'Editar demanda', exact: true }).click();
  await page.getByLabel('Título', { exact: true }).fill('Novo título');
  await page.getByRole('button', { name: 'Salvar demanda', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Novo título' })).toBeVisible();
});

for (const cenario of [
  { nome: 'concluída', status: 'concluida', responsavel: 2 },
  { nome: 'cancelada', status: 'cancelada', responsavel: 2 },
  { nome: 'outro responsável', status: 'aceita', responsavel: 99 },
]) {
  test(`inspetor não recebe ação de prazo em demanda ${cenario.nome}`, async ({ page }) => {
    await instalarApi(page);
    await page.route('**/api/demandas/1/', route => route.fulfill({ json: { id: 1, titulo: 'Restrita', sei_numero: 'HU3-RESTRITA', descricao: '', origem: '', status: cenario.status, prioridade: 'media', prazo: '2026-10-30T20:00:00Z', critica: false, atrasada: false, responsavel: { id: cenario.responsavel, nome: 'Responsável' }, equipes_ids: [1], equipes: [], criada_em: '2026-10-21T12:00:00Z', atualizada_em: '2026-10-21T12:00:00Z', historico: [] } }));
    await entrarComo(page, 'inspetor');
    await page.goto('/demandas/1');
    await expect(page.getByRole('heading', { name: 'Restrita' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Alterar prazo', exact: true })).toHaveCount(0);
  });
}
