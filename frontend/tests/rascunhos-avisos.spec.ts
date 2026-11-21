import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';
import type { RascunhoAviso } from '../lib/avisos';

for (const perfil of ['inspetor', 'gestor'] as const) {
  test(`${perfil} salva e revisa rascunho após recarregar sem publicar`, async ({ page }) => {
    test.setTimeout(60000);
    await instalarApi(page);
    let drafts: RascunhoAviso[] = [];
    let failSave = false;
    const publicationRequests: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/avisos/') publicationRequests.push(request.url());
    });
    await page.route('**/api/avisos/rascunhos/**', async route => {
      const request = route.request();
      if (request.method() === 'GET') return route.fulfill({ json: drafts });
      if (failSave) return route.fulfill({ status: 503, json: { detail: 'Falha temporária ao salvar.' } });
      const body = request.postDataJSON() as Pick<RascunhoAviso, 'titulo' | 'conteudo'>;
      const saved = { id: 1, ...body, criado_em: '2026-11-21T13:00:00Z', atualizado_em: '2026-11-21T13:10:00Z' };
      drafts = [saved];
      return route.fulfill({ status: request.method() === 'POST' ? 201 : 200, json: saved });
    });
    await entrarComo(page, perfil);
    await page.goto('/avisos');
    await page.getByRole('button', { name: 'Meus rascunhos', exact: true }).click();
    await page.getByRole('button', { name: 'Novo rascunho', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Título', { exact: true }).fill('Comunicado em preparação');
    await dialog.getByLabel('Conteúdo', { exact: true }).fill('Primeira versão privada.');
    await dialog.getByRole('button', { name: 'Salvar rascunho' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Rascunho salvo.', { exact: false })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: 'Meus rascunhos', exact: true }).click();
    await page.getByRole('button', { name: 'Revisar rascunho: Comunicado em preparação', exact: true }).click();
    await expect(dialog.getByLabel('Conteúdo', { exact: true })).toHaveValue('Primeira versão privada.');
    await dialog.getByLabel('Conteúdo', { exact: true }).fill('Texto revisado e ainda privado.');
    failSave = true;
    await dialog.getByRole('button', { name: 'Salvar rascunho' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Falha temporária ao salvar.');
    await expect(dialog.getByLabel('Conteúdo', { exact: true })).toHaveValue('Texto revisado e ainda privado.');
    failSave = false;
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
    await dialog.getByRole('button', { name: 'Salvar rascunho' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Texto revisado e ainda privado.', { exact: true })).toBeVisible();
    expect(publicationRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/rascunhos-${perfil}.png`, fullPage: true });
  });
}

test('permite tentar novamente quando a lista de rascunhos falha', async ({ page }) => {
  await instalarApi(page);
  let failed = true;
  await page.route('**/api/avisos/rascunhos/', route => failed
    ? route.fulfill({ status: 503, json: { detail: 'Falha ao carregar rascunhos.' } })
    : route.fulfill({ json: [] }));
  await entrarComo(page, 'inspetor');
  await page.goto('/avisos');
  await page.getByRole('button', { name: 'Meus rascunhos', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Falha ao carregar rascunhos.');
  failed = false;
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Você ainda não tem rascunhos.', { exact: false })).toBeVisible();
});
