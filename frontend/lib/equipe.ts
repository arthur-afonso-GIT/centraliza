import { ApiError, csrfToken, type Profile } from './auth';

export type MembroEquipe = {
  id: number; username: string; nome: string; first_name: string; last_name: string;
  email: string; perfil: Profile; is_active: boolean; pode_administrar_equipe: boolean;
};
export type Equipe = { id: number; nome: string; pode_administrar: boolean; membros: MembroEquipe[] };
export type DadosMembro = Partial<Omit<MembroEquipe, 'id' | 'nome' | 'username'>> & { username?: string; password?: string };

async function json<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  const body = await response.json().catch(() => ({})) as { detail?: string };
  throw new ApiError(response.status, body.detail ?? 'Não foi possível concluir a operação.');
}
export async function obterEquipe(signal?: AbortSignal) {
  return json<Equipe>(await fetch('/api/equipe/', { credentials: 'same-origin', signal }));
}
export async function criarMembro(dados: DadosMembro) {
  const token = await csrfToken();
  return json<MembroEquipe>(await fetch('/api/equipe/usuarios/', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token }, body: JSON.stringify(dados) }));
}
export async function atualizarMembro(id: number, dados: DadosMembro) {
  const token = await csrfToken();
  return json<MembroEquipe>(await fetch(`/api/equipe/usuarios/${id}/`, { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': token }, body: JSON.stringify(dados) }));
}
