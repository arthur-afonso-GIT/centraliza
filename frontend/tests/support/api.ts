import type { Page } from '@playwright/test';

type Perfil = 'gestor' | 'inspetor';

export async function instalarApi(page: Page) {
  let perfil: Perfil | null = null;
  let demandStatus = 'pendente';
  const history: Array<Record<string, unknown>> = [];
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/auth/csrf/') return route.fulfill({ json: { csrfToken: 'token-de-teste' } });
    if (url.pathname === '/api/auth/login/') {
      const body = request.postDataJSON() as { username: string; password: string };
      if (body.password !== 'senha-de-teste') return route.fulfill({ status: 401, json: { detail: 'Credenciais inválidas.' } });
      perfil = body.username.includes('inspetor') ? 'inspetor' : 'gestor';
      return route.fulfill({ json: { id: perfil === 'gestor' ? 1 : 2, nome: perfil === 'gestor' ? 'Gestor de teste' : 'Inspetor de teste', perfil } });
    }
    if (url.pathname === '/api/auth/logout/') { perfil = null; return route.fulfill({ status: 204 }); }
    if (url.pathname === '/api/auth/me/') return perfil ? route.fulfill({ json: { id: perfil === 'gestor' ? 1 : 2, nome: perfil === 'gestor' ? 'Gestor de teste' : 'Inspetor de teste', perfil } }) : route.fulfill({ status: 401, json: { detail: 'Não autenticado.' } });
    if (url.pathname === '/api/usuarios/inspetores/') return perfil === 'gestor' ? route.fulfill({ json: { resultados: [{ id: 2, nome: 'Inspetor de teste' }, { id: 3, nome: 'Segundo inspetor' }] } }) : route.fulfill({ status: 403, json: {} });
    if (url.pathname === '/api/demandas/') {
      if (!perfil) return route.fulfill({ status: 401, json: { detail: 'Não autenticado.' } });
      if (request.method() === 'POST') {
        const body = request.postDataJSON() as Record<string, unknown>;
        return route.fulfill({ status: 201, json: { id: 90, ...body, origem: body.origem ?? '', status: 'pendente', responsavel: body.responsavel_id ? { id: body.responsavel_id, nome: 'Inspetor de teste' } : null, criada_em: '2026-09-14T12:00:00Z', atualizada_em: '2026-09-14T12:00:00Z', historico: [{ id: 90, tipo: 'demanda_criada', autor: { id: 1, nome: 'Gestor de teste' }, criado_em: '2026-09-14T12:00:00Z', status_anterior: '', status_novo: '', texto: 'Demanda criada pela gestão.' }] } });
      }
      await new Promise(resolve => setTimeout(resolve, 120));
      const segmento = url.searchParams.get('status');
      const critica = url.searchParams.get('critica') === 'true';
      const moved = segmento === 'pendente' && demandStatus !== 'pendente';
      const total = (perfil === 'gestor' ? (critica ? 4 : segmento === 'pendente' ? 9 : 5) : (critica ? 3 : segmento === 'pendente' ? 7 : 4)) - (moved ? 1 : 0);
      const current = Number(url.searchParams.get('page') ?? 1);
      const start = (current - 1) * 4;
      const results = Array.from({ length: Math.min(4, Math.max(0, total - start)) }, (_, index) => { const id = start + index + 1 + (moved ? 1 : 0); return { id, titulo: `Inspeção demonstrativa ${id}`, status: segmento ?? (index % 2 ? 'pendente' : 'em_andamento'), prioridade: 'alta', prazo: '2026-09-15', critica, responsavel: { id: 2, nome: 'Inspetor de teste' } }; });
      return route.fulfill({ json: { count: total, previous: current > 1 ? 'anterior' : null, next: start + 4 < total ? 'proxima' : null, results } });
    }
    const detail = url.pathname.match(/^\/api\/demandas\/(\d+)\/$/);
    if (detail) {
      if (!perfil) return route.fulfill({ status: 401, json: {} });
      if (detail[1] === '404') return route.fulfill({ status: 404, json: {} });
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON() as Record<string, unknown>;
        return route.fulfill({ json: { id: Number(detail[1]), titulo: body.titulo ?? 'Inspeção demonstrativa 1', descricao: body.descricao ?? 'Verificar condições de segurança e saúde no ambiente de trabalho.', origem: body.origem ?? 'MPT', status: demandStatus, prioridade: body.prioridade ?? 'alta', prazo: body.prazo ?? '2026-09-20', critica: body.critica ?? true, responsavel: body.responsavel_id ? { id: body.responsavel_id, nome: body.responsavel_id === 3 ? 'Segundo inspetor' : 'Inspetor de teste' } : null, criada_em: '2026-09-14T12:00:00Z', atualizada_em: '2026-09-14T13:00:00Z', historico: history } });
      }
      return route.fulfill({ json: { id: Number(detail[1]), titulo: 'Inspeção demonstrativa 1', descricao: 'Verificar condições de segurança e saúde no ambiente de trabalho.', origem: 'MPT', status: demandStatus, prioridade: 'alta', prazo: '2026-09-20', critica: true, responsavel: { id: 2, nome: 'Inspetor de teste' }, criada_em: '2026-09-14T12:00:00Z', atualizada_em: '2026-09-14T12:00:00Z', historico: history } });
    }
    const status = url.pathname.match(/^\/api\/demandas\/(\d+)\/status\/$/);
    if (status && request.method() === 'PATCH') {
      const previous = demandStatus;
      demandStatus = (request.postDataJSON() as { status: string }).status;
      history.unshift({ id: history.length + 1, tipo: 'status_alterado', autor: { id: 2, nome: 'Inspetor de teste' }, criado_em: '2026-09-14T13:00:00Z', status_anterior: previous, status_novo: demandStatus, texto: '' });
      return route.fulfill({ json: { id: Number(status[1]), titulo: 'Inspeção demonstrativa 1', descricao: 'Verificar condições de segurança e saúde no ambiente de trabalho.', origem: 'MPT', status: demandStatus, prioridade: 'alta', prazo: '2026-09-20', critica: true, responsavel: { id: 2, nome: 'Inspetor de teste' }, criada_em: '2026-09-14T12:00:00Z', atualizada_em: '2026-09-14T13:00:00Z', historico: history } });
    }
    const comment = url.pathname.match(/^\/api\/demandas\/(\d+)\/historico\/$/);
    if (comment && request.method() === 'POST') {
      const created = { id: history.length + 1, tipo: 'comentario', autor: { id: perfil === 'gestor' ? 1 : 2, nome: perfil === 'gestor' ? 'Gestor de teste' : 'Inspetor de teste' }, criado_em: '2026-09-14T14:00:00Z', status_anterior: '', status_novo: '', texto: (request.postDataJSON() as { texto: string }).texto };
      history.unshift(created);
      return route.fulfill({ status: 201, json: created });
    }
    if (url.pathname === '/api/compromissos/') {
      await new Promise(resolve => setTimeout(resolve, 80));
      return route.fulfill({ json: {
        inicio: url.searchParams.get('inicio'), fim: url.searchParams.get('fim'), timezone: 'America/Fortaleza',
        results: [
          { id: 1, titulo: 'Reunião de alinhamento', descricao: 'Revisão da equipe', tipo: 'reuniao', inicio: '2026-09-23T09:00:00-03:00', fim: '2026-09-23T10:00:00-03:00', participantes: [{ id: 2, nome: 'Inspetor de teste' }] },
          { id: 2, titulo: 'Visita técnica', descricao: 'Atividade externa', tipo: 'atividade', inicio: '2026-09-24T14:00:00-03:00', fim: '2026-09-24T16:00:00-03:00', participantes: [{ id: 2, nome: 'Inspetor de teste' }] },
        ],
      } });
    }
    if (url.pathname === '/api/avisos/') {
      if (!perfil) return route.fulfill({ status: 401, json: { detail: 'Não autenticado.' } });
      await new Promise(resolve => setTimeout(resolve, 80));
      return route.fulfill({ json: { resultados: [
        { id: 1, titulo: 'Plantão extraordinário', resumo: 'Mudança na escala desta sexta-feira.', categoria: 'urgente', autor: 'Gestor de teste', publicado_em: '2026-10-01T09:00:00-03:00' },
        { id: 2, titulo: 'Atualização de procedimento', resumo: 'Novo roteiro disponível para inspeções.', categoria: 'informativo', autor: 'Gestor de teste', publicado_em: '2026-09-30T09:00:00-03:00' },
      ] } });
    }
    const aviso = url.pathname.match(/^\/api\/avisos\/(\d+)\/$/);
    if (aviso) {
      if (!perfil) return route.fulfill({ status: 401, json: {} });
      if (aviso[1] === '404') return route.fulfill({ status: 404, json: {} });
      return route.fulfill({ json: { id: Number(aviso[1]), titulo: 'Plantão extraordinário', resumo: 'Mudança na escala desta sexta-feira.', conteudo: 'Consulte a nova escala e confirme sua disponibilidade com a gestão.', categoria: 'urgente', autor: 'Gestor de teste', publicado_em: '2026-10-01T09:00:00-03:00' } });
    }
    return route.fulfill({ status: 404 });
  });
}

export async function entrarComo(page: Page, perfil: Perfil) {
  await page.goto('/login');
  await page.getByLabel('Usuário').fill(perfil === 'gestor' ? 'demo.gestor.1' : 'demo.inspetor.1');
  await page.getByLabel('Senha').fill('senha-de-teste');
  await page.getByRole('button', { name: /^Entrar/ }).click();
}
