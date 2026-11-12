import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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

for (const perfil of ['gestor', 'inspetor'] as const) {
  test(`${perfil} recebe indicadores independentes e abre alta prioridade`, async ({ page }) => {
    await entrarComo(page, perfil);
    const indicadores = page.getByRole('region', { name: 'Indicadores do trabalho' });
    await expect(indicadores.getByRole('link')).toHaveCount(5);
    await expect(indicadores.getByRole('link', { name: /Demandas críticas/ }).locator('strong')).toHaveText(perfil === 'gestor' ? '4' : '2');
    const alta = indicadores.getByRole('link', { name: /Alta prioridade/ });
    await expect(alta.locator('strong')).toHaveText(perfil === 'gestor' ? '5' : '4');
    await expect(alta).toHaveAttribute('href', '/demandas?prioridade=alta');
    const consulta = page.waitForRequest(request => new URL(request.url()).searchParams.get('prioridade') === 'alta');
    await alta.click();
    const parametros = new URL((await consulta).url()).searchParams;
    expect(parametros.has('critica')).toBe(false);
    await expect(page.getByRole('tab', { name: 'Prioridade alta', exact: true })).toHaveAttribute('aria-selected', 'true');
  });
}

test('indicador sem demandas exibe zero e permite abrir a lista vazia', async ({ page }) => {
  await page.route('**/api/home/resumo/', route => route.fulfill({ json: {
    perfil: 'inspetor', gerado_em: '2026-11-04T12:00:00-03:00',
    indicadores: { atrasadas: 0, criticas: 0, alta_prioridade: 0, em_correcao: 0, nao_iniciadas: 0 },
    proximas_demandas: [], proximos_compromissos: [], avisos_ativos: [],
  } }));
  await page.route('**/api/demandas/?**', route => route.fulfill({ json: { count: 0, next: null, previous: null, results: [] } }));
  await entrarComo(page, 'inspetor');
  const alta = page.getByRole('link', { name: /Alta prioridade/ });
  await expect(alta.locator('strong')).toHaveText('0');
  await expect(alta).not.toHaveClass(/has-alert/);
  await alta.click();
  await expect(page.getByRole('heading', { name: 'Nenhuma demanda neste segmento' })).toBeVisible();
});

for (const width of [390, 1024, 1366]) {
  test(`cinco indicadores acessíveis sem transbordamento em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await entrarComo(page, 'gestor');
    await expect(page.getByRole('link', { name: /Alta prioridade/ })).toBeVisible();
    if (width <= 1100) {
      const grid = await page.locator('.indicator-grid').boundingBox();
      const ultimo = await page.locator('.indicator-card').nth(4).boundingBox();
      expect(grid).not.toBeNull();
      expect(ultimo).not.toBeNull();
      expect(Math.abs(grid!.width - ultimo!.width)).toBeLessThan(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(scan.violations.map(issue => issue.id)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`home-hu17-${width}.png`), fullPage: true });
  });
}
