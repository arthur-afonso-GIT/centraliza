import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

for (const width of [390, 1366]) {
  test(`aceite separado da execução e visível para o gestor em ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await entrarComo(page, 'gestor');
    await page.goto('/demandas/1');
    await expect(page.getByText('A demanda foi atribuída a Inspetor de teste.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aceitar demanda' })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('gestor-aguardando.png'), fullPage: true });
    if (width < 760) await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('button', { name: 'Sair' }).click();
    await entrarComo(page, 'inspetor');
    await page.goto('/demandas/1');
    await expect(page.getByRole('button', { name: 'Iniciar demanda' })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('inspetor-aguardando.png'), fullPage: true });
    await page.getByRole('button', { name: 'Aceitar demanda' }).click();
    await expect(page.locator('.detail-actions .status')).toHaveText('Aceita');
    await expect(page.getByText('Aguardando aceite → Aceita')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Iniciar demanda' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aceitar demanda' })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('inspetor-aceita.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(scan.violations.map(issue => issue.id)).toEqual([]);
    if (width < 760) await page.getByRole('button', { name: 'Abrir menu' }).click();
    await page.getByRole('button', { name: 'Sair' }).click();
    await entrarComo(page, 'gestor');
    await page.goto('/demandas/1');
    await expect(page.locator('.detail-actions .status')).toHaveText('Aceita');
    await expect(page.getByText('Inspetor de teste aceitou a demanda.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar demanda' })).toHaveCount(0);
  });
}
