export type Profile = 'gestor' | 'inspetor';
export type User = { id: string; nome: string; perfil: Profile };
const SESSION_KEY = 'centraliza.demo.session';
const USERS: Record<Profile, User> = {
  gestor: { id: 'demo-gestor', nome: 'Gestor de demonstração', perfil: 'gestor' },
  inspetor: { id: 'demo-inspetor', nome: 'Inspetor de demonstração', perfil: 'inspetor' },
};
// Adaptador de demonstração. Não autoriza acesso a dados reais.
export async function obterUsuarioAtual(): Promise<User | null> {
  await new Promise(resolve => setTimeout(resolve, 250));
  const perfil = sessionStorage.getItem(SESSION_KEY);
  return perfil === 'gestor' || perfil === 'inspetor' ? USERS[perfil] : null;
}
export async function entrar(perfil: Profile): Promise<User> {
  sessionStorage.setItem(SESSION_KEY, perfil);
  return USERS[perfil];
}
export async function sair(): Promise<void> { sessionStorage.removeItem(SESSION_KEY); }
