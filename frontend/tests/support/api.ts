import type { Page } from '@playwright/test';

type Perfil = 'gestor' | 'inspetor';

export async function instalarApi(page: Page) {
  let perfil: Perfil | null = null;
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
    if (url.pathname === '/api/demandas/') {
      if (!perfil) return route.fulfill({ status: 401, json: { detail: 'Não autenticado.' } });
      await new Promise(resolve => setTimeout(resolve, 120));
      const segmento = url.searchParams.get('status');
      const critica = url.searchParams.get('critica') === 'true';
      const total = perfil === 'gestor' ? (critica ? 4 : segmento === 'pendente' ? 9 : 5) : (critica ? 3 : segmento === 'pendente' ? 7 : 4);
      const current = Number(url.searchParams.get('page') ?? 1);
      const start = (current - 1) * 4;
      const results = Array.from({ length: Math.min(4, Math.max(0, total - start)) }, (_, index) => ({ id: start + index + 1, titulo: `Inspeção demonstrativa ${start + index + 1}`, status: segmento ?? (index % 2 ? 'pendente' : 'em_andamento'), prioridade: 'alta', prazo: '2026-09-15', critica, responsavel: { id: 2, nome: 'Inspetor de teste' } }));
      return route.fulfill({ json: { count: total, previous: current > 1 ? 'anterior' : null, next: start + 4 < total ? 'proxima' : null, results } });
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
