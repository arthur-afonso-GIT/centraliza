import { expect, test } from '@playwright/test';
import { entrarComo, instalarApi } from './support/api';

test('exibe não lidas, marca a conversa aberta e mantém leitura após recarregar', async ({ page }) => {
  await instalarApi(page);
  let cursor = 0;
  const mensagens = [
    { id: 1, texto: 'Mensagem recebida', criada_em: '2026-11-18T12:01:00Z', autor_id: 1, autor_nome: 'Gestor de teste' },
    { id: 2, texto: 'Minha mensagem', criada_em: '2026-11-18T12:02:00Z', autor_id: 2, autor_nome: 'Inspetor de teste' },
  ];
  await page.route('**/api/conversas/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/conversas/membros/') return route.fulfill({ json: { resultados: [] } });
    if (path === '/api/conversas/1/leitura/' && route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { mensagem_id: number };
      cursor = Math.max(cursor, body.mensagem_id);
      return route.fulfill({ json: { ultima_mensagem_lida_id: cursor } });
    }
    if (path === '/api/conversas/') return route.fulfill({ json: { resultados: [{
      id: 1, titulo: 'Visita técnica', criada_em: '2026-11-18T12:00:00Z', atualizada_em: '2026-11-18T12:02:00Z',
      participantes: [{ id: 1, nome: 'Gestor de teste' }, { id: 2, nome: 'Inspetor de teste' }],
      mensagens, ultima_mensagem_lida_id: cursor, nao_lidas: mensagens.filter(m => m.id > cursor && m.autor_id !== 2).length,
    }] } });
    return route.fulfill({ status: 404 });
  });
  await entrarComo(page, 'inspetor');
  await page.goto('/chats');
  const conversa = page.getByRole('button', { name: /Visita técnica/ });
  await expect(conversa).toContainText('1 mensagem não lida');
  expect(cursor).toBe(0);
  await conversa.click();
  await expect(page.getByRole('list', { name: 'Mensagens' })).toContainText('Mensagem recebida');
  await expect.poll(() => cursor).toBe(2);
  await expect(conversa).not.toContainText('mensagem não lida');
  await page.reload();
  await expect(conversa).toBeVisible();
  await expect(conversa).not.toContainText('mensagem não lida');
});
