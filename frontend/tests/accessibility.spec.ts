import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

test.beforeEach(async ({ page }) => instalarApi(page));

for (const width of [390, 1366]) {
  test(`acessibilidade e largura das páginas em ${width}px`, async ({
    page,
  }, testInfo) => {
    // A primeira compilação local pode demorar mais em máquinas Windows.
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await expect(
      page.getByRole('button', { name: /^Entrar/ }),
    ).toBeVisible({ timeout: 15_000 });
    for (const route of [
      '/login',
      '/',
      '/agenda',
      '/avisos',
      '/demandas',
      '/chats',
    ]) {
      if (route === '/') {
        await page.getByLabel('Usuário').fill('demo.gestor.1');
        await page.getByLabel('Senha').fill('senha-de-teste');
        await page.getByRole('button', { name: /^Entrar/ }).click();
      } else if (route !== '/login') {
        await page.goto(route);
      }
      if (route !== '/login')
        await expect(page.locator('#conteudo')).toBeVisible();
      const label = route === '/' ? 'home' : route.slice(1);
      await page.screenshot({
        path: testInfo.outputPath(`${label}-${width}.png`),
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        scan.violations.map((issue) => ({
          id: issue.id,
          nodes: issue.nodes.map((node) => ({
            target: node.target,
            reason: node.failureSummary,
          })),
        })),
        `Problemas em ${route}, ${width}px`,
      ).toEqual([]);
    }
  });
}

test('foco acompanha a navegação e volta ao botão ao fechar o item atual', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'inspetor');
  await expect(page.locator('#conteudo')).toBeFocused();
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Home', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused();
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Agenda', exact: true })
    .click();
  await expect(page.locator('#conteudo')).toBeFocused();
  await expect(page).toHaveTitle('Agenda | Centraliza VISAT');
});
