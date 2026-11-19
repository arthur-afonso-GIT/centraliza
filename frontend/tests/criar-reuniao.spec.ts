import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-23T15:00:00Z') });
  await instalarApi(page);
});

test('inspetor cria reunião e ela entra no calendário no horário informado', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/agenda');
  await expect(page.getByText('Reunião de alinhamento')).toBeVisible();
  await page.getByRole('button', { name: 'Nova reunião' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova reunião' });
  await expect(dialog.getByLabel('Data')).toHaveValue('2026-09-23');
  await dialog.getByLabel('Título').fill('Alinhamento das demandas');
  await dialog.getByLabel('Data').fill('2026-09-25');
  await dialog.getByLabel('Início').fill('14:00');
  await dialog.getByLabel('Término').fill('15:30');
  await dialog.getByLabel('Pauta').fill('Revisar prazos e prioridades da semana.');
  const request = page.waitForRequest(item => item.url().endsWith('/api/compromissos/') && item.method() === 'POST');
  await dialog.getByRole('button', { name: 'Salvar reunião' }).click();
  expect((await request).postDataJSON()).toEqual({ titulo: 'Alinhamento das demandas', pauta: 'Revisar prazos e prioridades da semana.', inicio: '2026-09-25T14:00:00-03:00', fim: '2026-09-25T15:30:00-03:00', participante_ids: [] });
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Reunião “Alinhamento das demandas” agendada para 25/09, 14:00–15:30.');
  const evento = page.locator('.calendar-event', { hasText: 'Alinhamento das demandas' });
  await expect(evento).toContainText('Reunião');
  await expect(evento).toContainText('14:00–15:30');
  await expect(page.locator('.week-view > section', { has: evento }).getByRole('heading')).toContainText('25');
});

test('reunião em outra semana leva o calendário até a data agendada', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/agenda');
  await page.getByRole('button', { name: 'Nova reunião' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova reunião' });
  await dialog.getByLabel('Título').fill('Planejamento de outubro');
  await dialog.getByLabel('Data').fill('2026-10-02');
  await dialog.getByLabel('Início').fill('09:00');
  await dialog.getByLabel('Término').fill('10:00');
  await dialog.getByLabel('Pauta').fill('Distribuição das próximas inspeções.');
  await dialog.getByRole('button', { name: 'Salvar reunião' }).click();
  await expect(page.getByRole('heading', { name: /28 de set\.? – 04 de out\.? de 2026/ })).toBeVisible();
  await expect(page.locator('.calendar-event', { hasText: 'Planejamento de outubro' })).toContainText('09:00–10:00');
  await expect(page.getByRole('button', { name: 'Hoje' })).toBeEnabled();
});

test('inspetor pode convidar colega da equipe para a reunião', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/agenda');
  await page.getByRole('button', { name: 'Nova reunião' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova reunião' });
  await expect(dialog.getByRole('checkbox', { name: 'Gestor de teste' })).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Gestor de teste' }).check();
  await dialog.getByLabel('Título').fill('Alinhamento com a gestão');
  await dialog.getByLabel('Data').fill('2026-09-25');
  await dialog.getByLabel('Início').fill('14:00');
  await dialog.getByLabel('Término').fill('15:00');
  await dialog.getByLabel('Pauta').fill('Decisões da equipe.');
  const request = page.waitForRequest(item => item.url().endsWith('/api/compromissos/') && item.method() === 'POST');
  await dialog.getByRole('button', { name: 'Salvar reunião' }).click();
  expect((await request).postDataJSON().participante_ids).toEqual([1]);
  await expect(dialog).toHaveCount(0);
});

test('valida horários e informa conflito com a agenda do inspetor', async ({ page }) => {
  let posts = 0;
  page.on('request', item => { if (item.url().endsWith('/api/compromissos/') && item.method() === 'POST') posts += 1; });
  await entrarComo(page, 'inspetor');
  await page.goto('/agenda');
  await page.getByRole('button', { name: 'Nova reunião' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova reunião' });
  await dialog.getByLabel('Título').fill('Reunião sobreposta');
  await dialog.getByLabel('Início').fill('10:00');
  await dialog.getByLabel('Término').fill('09:00');
  await dialog.getByLabel('Pauta').fill('Teste de horários.');
  await dialog.getByRole('button', { name: 'Salvar reunião' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('O horário de término deve ser posterior ao de início.');
  expect(posts).toBe(0);

  await dialog.getByLabel('Início').fill('09:30');
  await dialog.getByLabel('Término').fill('10:30');
  await dialog.getByRole('button', { name: 'Salvar reunião' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Há conflito de horário para um ou mais participantes. Reunião de alinhamento');
  await expect(dialog.getByLabel('Título')).toHaveValue('Reunião sobreposta');
  expect(posts).toBe(1);
});

test('somente o inspetor vê a ação de nova reunião; o gestor mantém a gestão completa', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/agenda');
  await expect(page.getByText('Reunião de alinhamento')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo compromisso' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nova reunião' })).toHaveCount(0);
});

test('formulário de reunião é acessível em tela pequena', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'inspetor');
  await page.goto('/agenda');
  await page.getByRole('button', { name: 'Nova reunião' }).click();
  await expect(page.getByRole('dialog', { name: 'Nova reunião' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
});
