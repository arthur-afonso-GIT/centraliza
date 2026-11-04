import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

for (const perfil of ['gestor', 'inspetor'] as const) {
  test(`${perfil} filtra alta prioridade e troca de segmento sem misturar criticidade`, async ({ page }) => {
    await entrarComo(page, perfil);
    await page.goto('/demandas');
    const requestPromise = page.waitForRequest(request => new URL(request.url()).searchParams.get('prioridade') === 'alta');
    await page.getByRole('tab', { name: 'Prioridade alta', exact: true }).click();
    const url = new URL((await requestPromise).url());
    expect(url.searchParams.has('critica')).toBe(false);
    expect(url.searchParams.get('page')).toBe('1');
    await expect(page.locator('.demand-card').first().getByText('Alta prioridade', { exact: true })).toBeVisible();
    await expect(page.locator('.demand-card .critical')).toHaveCount(0);
    if (perfil === 'gestor') {
      const nextPage = page.waitForRequest(request => {
        const params = new URL(request.url()).searchParams;
        return params.get('prioridade') === 'alta' && params.get('page') === '2';
      });
      await page.getByRole('button', { name: 'Próxima' }).click();
      await nextPage;
      await expect(page.getByText('Página 2 de 2')).toBeVisible();
    }
    const criticalRequest = page.waitForRequest(request => new URL(request.url()).searchParams.get('critica') === 'true');
    await page.getByRole('tab', { name: 'Críticas', exact: true }).click();
    const criticalUrl = new URL((await criticalRequest).url());
    expect(criticalUrl.searchParams.has('prioridade')).toBe(false);
    expect(criticalUrl.searchParams.get('page')).toBe('1');
  });
}

test('link direto de alta prioridade preserva os filtros avançados', async ({ page }) => {
  await entrarComo(page, 'gestor');
  const requestPromise = page.waitForRequest(request => {
    const params = new URL(request.url()).searchParams;
    return params.get('prioridade') === 'alta' && params.get('atrasada') === 'true';
  });
  await page.goto('/demandas?prioridade=alta&atrasada=true');
  await requestPromise;
  await expect(page.getByRole('tab', { name: 'Prioridade alta', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByText('Filtros avançados').click();
  const filtered = page.waitForRequest(request => {
    const params = new URL(request.url()).searchParams;
    return params.get('prioridade') === 'alta' && params.get('responsavel') === '2' && params.get('atrasada') === 'true';
  });
  await page.getByRole('combobox', { name: /^Responsável/ }).selectOption('2');
  await filtered;
  await expect(page.getByLabel('Somente atrasadas')).toBeChecked();
});

test('quatro combinações de criticidade e prioridade têm selos independentes no celular', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'inspetor');
  await page.route('**/api/demandas/?**', route => route.fulfill({ json: {
    count: 4, next: null, previous: null,
    results: [
      { critica: true, prioridade: 'media' },
      { critica: false, prioridade: 'alta' },
      { critica: true, prioridade: 'alta' },
      { critica: false, prioridade: 'baixa' },
    ].map((flags, index) => ({
      id: index + 1, titulo: `Combinação ${index + 1}`, sei_numero: '', status: 'pendente',
      prazo: '2026-11-20T18:00:00Z', atrasada: index === 2, responsavel: { id: 2, nome: 'Inspetor de teste' },
      equipes_ids: [1], equipes: [{ id: 1, nome: 'Equipe de teste' }], ...flags,
    })),
  } }));
  await page.goto('/demandas');
  const cards = page.locator('.demand-card');
  await expect(cards).toHaveCount(4);
  for (const [index, critica, alta] of [[0, true, false], [1, false, true], [2, true, true], [3, false, false]] as const) {
    await expect(cards.nth(index).locator('.critical')).toHaveCount(critica ? 1 : 0);
    await expect(cards.nth(index).getByText('Alta prioridade', { exact: true })).toHaveCount(alta ? 1 : 0);
  }
  await expect(cards.nth(2).getByText('Atrasada', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('sinalizadores-mobile.png'), fullPage: true });
  await page.getByRole('tab', { name: 'Críticas', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Prioridade alta', exact: true })).toBeFocused();
});

test('detalhe exibe criticidade e alta prioridade simultaneamente', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await expect(page.locator('.detail-actions .critical')).toHaveText('Crítica');
  await expect(page.locator('.detail-actions').getByText('Alta prioridade', { exact: true })).toBeVisible();
});
