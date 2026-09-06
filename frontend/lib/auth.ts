export type Profile = 'gestor' | 'inspetor';
export type User = { id: number; nome: string; perfil: Profile };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function cookie(name: string) {
  return document.cookie.split('; ').find(item => item.startsWith(`${name}=`))?.split('=')[1];
}

async function responseJson<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => ({})) as { detail?: string };
  throw new ApiError(response.status, body.detail ?? 'Não foi possível concluir a operação.');
}

async function csrfToken() {
  const current = cookie('centraliza_csrftoken');
  if (current) return decodeURIComponent(current);
  const response = await fetch('/api/auth/csrf/', { credentials: 'same-origin' });
  return (await responseJson<{ csrfToken: string }>(response)).csrfToken;
}

export async function obterUsuarioAtual(): Promise<User | null> {
  const response = await fetch('/api/auth/me/', { credentials: 'same-origin' });
  if (response.status === 401 || response.status === 403) return null;
  return responseJson<User>(response);
}

export async function entrar(username: string, password: string): Promise<User> {
  const token = await csrfToken();
  const response = await fetch('/api/auth/login/', {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token },
    body: JSON.stringify({ username, password }),
  });
  return responseJson<User>(response);
}

export async function sair(): Promise<void> {
  const token = await csrfToken();
  const response = await fetch('/api/auth/logout/', {
    method: 'POST', credentials: 'same-origin', headers: { 'X-CSRFToken': token },
  });
  if (!response.ok) throw new ApiError(response.status, 'Não foi possível encerrar a sessão.');
}
