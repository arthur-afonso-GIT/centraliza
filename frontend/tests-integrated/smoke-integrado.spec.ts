import { expect, test } from '@playwright/test';

const password = process.env.CENTRALIZA_SMOKE_PASSWORD ?? 'Centraliza@2026';

async function entrar(page: import('@playwright/test').Page, username: string) {
  await page.goto('/login');
  await page.getByLabel('Usuário').fill(username);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: /^Entrar/ }).click();
  await expect(page).toHaveURL('/');
}

test('frontend, API e PostgreSQL executam o fluxo principal de uma demanda', async ({ page }) => {
  const suffix = `${Date.now()}`;
  const title = `Smoke integrado ${suffix}`;
  const sei = `SMOKE-${suffix}`;

  await entrar(page, 'demo.gestor.1');
  await page.goto('/demandas');
  await page.getByRole('button', { name: 'Nova demanda' }).click();
  await page.getByLabel('Título').fill(title);
  await page.getByLabel('Número do processo SEI').fill(sei);
  await page.getByLabel('Descrição').fill('Demanda criada pelo smoke integrado com serviços reais.');
  await page.getByLabel('Demandante (instituição)').fill('QA Centraliza');
  await page.getByLabel('Prazo (horário de Fortaleza)', { exact: true }).fill('2027-01-15T17:00');
  await page.getByLabel('Prioridade').selectOption('alta');
  await page.getByRole('dialog').getByLabel('Responsável').selectOption({ label: 'Inspetor de teste 1' });
  await page.getByRole('group', { name: 'Equipes participantes' }).getByLabel('VISAT Demonstração 1').check();
  const [createdResponse] = await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/demandas/') && response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Salvar demanda' }).click(),
  ]);
  expect(createdResponse.ok()).toBeTruthy();
  const created = await createdResponse.json() as { id: number };
  await page.goto(`/demandas/${created.id}`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Histórico' })).toBeVisible();
  await expect(page.getByText('Demanda criada', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await entrar(page, 'demo.inspetor.1');
  await page.goto('/demandas');
  await page.getByLabel('Buscar por número SEI').fill(sei);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.locator('article').filter({ hasText: title }).getByRole('link', { name: 'Ver detalhes' }).click();
  await page.getByRole('button', { name: 'Aceitar demanda' }).click();

  await expect(page.getByText('Aceita', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Demanda aceita');
  await expect(page.getByText('Aguardando aceite → Aceita')).toBeVisible();

  const persisted = await page.request.get(`/api/demandas/?status=aceita&sei_numero=${encodeURIComponent(sei)}`);
  expect(persisted.ok()).toBeTruthy();
  const body = await persisted.json() as { results: Array<{ titulo: string; status: string }> };
  expect(body.results).toEqual(expect.arrayContaining([expect.objectContaining({ titulo: title, status: 'aceita' })]));
});
