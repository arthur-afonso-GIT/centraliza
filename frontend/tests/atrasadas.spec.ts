import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { formatarAtraso } from '../lib/prazos';
import { entrarComo, instalarApi } from './support/api';

test('tempo de atraso respeita minutos, dias e deslocamentos de fuso', () => {
  const agora = Date.parse('2026-10-28T15:00:00Z');
  expect(formatarAtraso('2026-10-28T12:00:00-03:00', agora)).toBe('');
  expect(formatarAtraso('2026-10-28T11:59:59-03:00', agora)).toBe('menos de 1 minuto');
  expect(formatarAtraso('2026-10-28T11:59:00-03:00', agora)).toBe('1 minuto');
  expect(formatarAtraso('2026-10-28T10:30:00-03:00', agora)).toBe('1 hora e 30 minutos');
  expect(formatarAtraso('2026-10-26T10:00:00-03:00', agora)).toBe('2 dias e 2 horas');
  expect(formatarAtraso('2026-10-28', agora)).toBe('');
});

test.beforeEach(async ({ page }) => instalarApi(page));

test('inspetor filtra atrasadas de todos os estados e retorna às pendentes', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas');
  const req = page.waitForRequest(r => r.url().includes('/api/demandas/?atrasada=true'));
  await page.getByRole('tab', { name: 'Atrasadas', exact: true }).click();
  const url = new URL((await req).url());
  expect(url.searchParams.has('status')).toBe(false);
  await expect(page.locator('.demand-card-overdue')).toHaveCount(4);
  await expect(page.locator('.overdue-duration').first()).toContainText('Vencida há');
  const normal = page.waitForRequest(r => r.url().includes('/api/demandas/?status=pendente'));
  await page.getByRole('tab', { name: 'Pendentes', exact: true }).click();
  expect(new URL((await normal).url()).searchParams.has('atrasada')).toBe(false);
  await expect(page.locator('.demand-card-overdue')).toHaveCount(0);
});

test('atalho da home abre atrasadas e permite busca e paginação no celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'gestor');
  await page.goto('/demandas?atrasada=true');
  await expect(page.getByRole('tab', { name: 'Atrasadas', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.overdue-duration').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(v => v.id)).toEqual([]);
  await page.screenshot({ path: 'test-results/hu16-mobile.png', fullPage: true });
  const proxima = page.waitForRequest(r => r.url().includes('page=2'));
  await page.getByRole('button', { name: 'Próxima' }).click();
  expect(new URL((await proxima).url()).searchParams.get('atrasada')).toBe('true');
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  await page.getByLabel('Buscar por número SEI').fill('HU16');
  const req = page.waitForRequest(r => r.url().includes('sei_numero=HU16'));
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  expect(new URL((await req).url()).searchParams.get('atrasada')).toBe('true');
  await expect(page.getByText('Página 1 de 2')).toBeVisible();
});

test('detalhe mostra tempo de atraso e remove aviso após prorrogar prazo', async ({ page }) => {
  const demanda = { id: 1, titulo: 'Atrasada HU16', status: 'em_andamento', prioridade: 'media', prazo: '2026-10-26T12:00:00-03:00', atrasada: true, responsavel: { id: 2, nome: 'Inspetor de teste' }, equipes: [], historico: [], criada_em: '2026-10-20T12:00:00Z', atualizada_em: '2026-10-20T12:00:00Z' };
  await page.route('**/api/demandas/1/', route => route.fulfill({ json: demanda }));
  await page.route('**/api/demandas/1/prazo/', route => route.fulfill({ json: { ...demanda, prazo: '2099-12-01T17:00:00-03:00', atrasada: false } }));
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await expect(page.locator('.detail-overdue')).toContainText('Vencida há');
  await page.getByRole('button', { name: 'Alterar prazo', exact: true }).click();
  await page.getByLabel('Data e horário limite').fill('2099-12-01T17:00');
  await page.getByRole('button', { name: 'Salvar prazo', exact: true }).click();
  await expect(page.locator('.detail-overdue')).toHaveCount(0);
});

test('erro pode ser repetido e resultado vazio tem mensagem específica', async ({ page }) => {
  let falhar = true;
  await page.route('**/api/demandas/?*', route => {
    if (falhar) { falhar = false; return route.fulfill({ status: 500, json: {} }); }
    return route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } });
  });
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas?atrasada=true');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Nenhuma demanda atrasada encontrada')).toBeVisible();
});
