import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test('inspetor cria conversa, envia mensagem e encontra pelo filtro', async ({ page }) => {
  await instalarApi(page);
  const conversations: Array<Record<string, unknown>> = [];
  await page.route('**/api/conversas/**', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/conversas/membros/') return route.fulfill({ json: { resultados: [{ id: 1, nome: 'Gestor de teste' }] } });
    if (url.pathname === '/api/conversas/' && request.method() === 'GET') return route.fulfill({ json: { resultados: conversations } });
    if (url.pathname === '/api/conversas/' && request.method() === 'POST') {
      const body = request.postDataJSON() as { titulo: string };
      const item = { id: 1, titulo: body.titulo, criada_em: '2026-11-18T12:00:00Z', atualizada_em: '2026-11-18T12:00:00Z', participantes: [{ id: 1, nome: 'Gestor de teste' }, { id: 2, nome: 'Inspetor de teste' }], mensagens: [] as Array<Record<string, unknown>> };
      conversations.push(item);
      return route.fulfill({ status: 201, json: item });
    }
    if (url.pathname === '/api/conversas/1/' && request.method() === 'GET') return route.fulfill({ json: conversations[0] });
    if (url.pathname === '/api/conversas/1/mensagens/' && request.method() === 'POST') {
      const body = request.postDataJSON() as { texto: string };
      const message = { id: 1, texto: body.texto, criada_em: '2026-11-18T12:01:00Z', autor_id: 2, autor_nome: 'Inspetor de teste' };
      (conversations[0].mensagens as Array<Record<string, unknown>>).push(message);
      return route.fulfill({ status: 201, json: message });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  await entrarComo(page, 'inspetor');
  await page.goto('/chats');
  await expect(page.getByText('Nenhuma conversa ainda')).toBeVisible();
  await page.getByRole('button', { name: 'Nova conversa' }).click();
  await page.getByLabel('Assunto').fill('Visita técnica');
  await page.getByLabel('Gestor de teste').check();
  await page.getByRole('button', { name: 'Criar conversa' }).click();
  await expect(page.getByRole('heading', { name: 'Visita técnica' })).toBeVisible();
  await page.getByLabel('Mensagem', { exact: true }).fill('Relatório enviado para análise.');
  await page.getByRole('button', { name: 'Enviar mensagem' }).click();
  await expect(page.getByText('Relatório enviado para análise.').last()).toBeVisible();
  await page.getByLabel('Palavra-chave').fill('relatorio');
  await expect(page.getByRole('button', { name: /Visita técnica/ })).toBeVisible();
});
