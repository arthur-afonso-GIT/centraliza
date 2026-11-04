import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { entrarComo, instalarApi } from './support/api';

const anterior = {
  id: 1, titulo: 'Inspeção do período anterior', descricao: 'Descrição preservada', sei_numero: 'SEI-ANTIGO', origem: 'MPT',
  status: 'em_andamento', prioridade: 'alta', prazo: '2026-09-20', critica: false, atrasada: false,
  responsavel: { id: 2, nome: 'Inspetor de teste' }, equipes_ids: [1], equipes: [{ id: 1, nome: 'Equipe de teste' }],
  criada_em: '2026-09-14T12:00:00Z', atualizada_em: '2026-09-14T13:00:00Z',
  somente_leitura: true, consulta_encerrada_em: '2026-09-15T15:00:00Z',
  historico: [{ id: 1, tipo: 'comentario', autor: { id: 2, nome: 'Inspetor de teste' }, criado_em: '2026-09-14T13:00:00Z', texto: 'Registro anterior à transferência', status_anterior: '', status_novo: '' }],
};

test.beforeEach(async ({ page }) => {
  await instalarApi(page);
  await page.route('**/api/demandas/1/', route => route.fulfill({ json: anterior }));
  await page.route('**/api/demandas/consultas-anteriores/**', route => {
    const numero = new URL(route.request().url()).searchParams.get('sei_numero');
    const results = !numero || numero === 'SEI-ANTIGO' ? [anterior] : [];
    return route.fulfill({ json: { count: results.length, next: null, previous: null, results } });
  });
  await page.route('**/api/demandas/1/anexos/', route => route.fulfill({ json: { resultados: [
    { id: 1, nome_original: 'anterior.pdf', tamanho: 20, mime_type: 'application/pdf', autor: anterior.responsavel,
      criado_em: '2026-09-14T13:00:00Z', download_url: '/api/demandas/1/anexos/1/download/' },
  ] } }));
});

test('consulta anterior oferece histórico e download sem controles de escrita', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await expect(page.getByRole('heading', { name: 'Consulta anterior — somente leitura' })).toBeVisible();
  await expect(page.getByText('Registro anterior à transferência')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Baixar anterior.pdf' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Enviar para avaliação|Aceitar demanda|Iniciar demanda|Registrar comentário|Remover anterior|Alterar prazo|Alterar prioridade|Editar demanda|Cancelar demanda/ })).toHaveCount(0);
  await expect(page.locator('textarea, input[type="file"]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Consulta anterior — somente leitura' })).toBeVisible();
});

test('inspetor descobre a consulta na lista e busca por SEI preservado', async ({ page }) => {
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas');
  await page.getByRole('tab', { name: 'Consultas anteriores' }).click();
  await expect(page.getByRole('heading', { name: anterior.titulo })).toBeVisible();
  await page.getByRole('link', { name: 'Ver detalhes' }).click();
  await expect(page.getByRole('heading', { name: 'Consulta anterior — somente leitura' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar às consultas anteriores' }).click();
  await expect(page.getByRole('tab', { name: 'Consultas anteriores' })).toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('Buscar por número SEI').fill('SEI-NOVO');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page.getByText('Nenhuma demanda neste segmento')).toBeVisible();
});

test('gestor não recebe aba pessoal de consultas anteriores', async ({ page }) => {
  await entrarComo(page, 'gestor');
  await page.goto('/demandas');
  await expect(page.getByRole('tab', { name: 'Pendentes', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Consultas anteriores' })).toHaveCount(0);
});

test('consulta anterior é acessível e cabe na tela do celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'inspetor');
  await page.goto('/demandas/1');
  await expect(page.getByRole('heading', { name: 'Consulta anterior — somente leitura' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(scan.violations.map(issue => issue.id)).toEqual([]);
});
