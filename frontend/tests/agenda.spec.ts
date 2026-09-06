import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-23T15:00:00Z') });
  await instalarApi(page);
});

test('navega entre semana, mês e dia e o botão Hoje reposiciona o período', async ({ page }) => {
  const intervals: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/compromissos/')) intervals.push(request.url()); });
  await entrarComo(page, 'gestor');
  await page.goto('/agenda');
  await expect(page.getByText('Reunião de alinhamento')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hoje' })).toBeDisabled();
  await expect(page.getByText('09:00–10:00')).toBeVisible();

  await page.getByRole('button', { name: /Período anterior/ }).click();
  await expect(page.getByRole('button', { name: 'Hoje' })).toBeEnabled();
  await page.getByRole('button', { name: 'Hoje' }).click();
  await expect(page.getByRole('button', { name: 'Hoje' })).toBeDisabled();

  await page.getByRole('button', { name: 'Mês', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mês', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Abrir dia 23 de setembro/ }).click();
  await expect(page.getByRole('button', { name: 'Dia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => intervals.length).toBeGreaterThanOrEqual(4);
  expect(decodeURIComponent(intervals.at(-1)!)).toContain('inicio=2026-09-23T00:00:00-03:00');
});

test('agenda carregada é acessível e responsiva no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'inspetor');
  await page.goto('/agenda');
  await expect(page.getByText('Reunião de alinhamento')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
});

test('falha da agenda permite tentar novamente e apresentar período vazio', async ({ page }) => {
  let first = true;
  await page.route('**/api/compromissos/**', route => {
    if (first) { first = false; return route.fulfill({ status: 500, json: {} }); }
    return route.fulfill({ json: { inicio: '2026-09-21T00:00:00-03:00', fim: '2026-09-28T00:00:00-03:00', timezone: 'America/Fortaleza', results: [] } });
  });
  await entrarComo(page, 'gestor');
  await page.goto('/agenda');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar a agenda');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Nenhum compromisso neste período')).toBeVisible();
});
