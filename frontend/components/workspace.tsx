'use client';
import { ShieldCheck } from 'lucide-react';
import { useSession } from '../hooks/use-session';
import LoginScreen from './login-screen';
import ModuleContent from './module-content';
import WorkspaceLayout from './workspace-layout';

export default function Workspace({ page }: { page: string }) {
  const session = useSession(page);
  if (session.error)
    return (
      <main className="standalone" role="alert">
        <ShieldCheck size={40} />
        <h1>Não foi possível acessar a sessão</h1>
        <p>
          Verifique se o navegador permite armazenamento para este site e tente
          novamente.
        </p>
        <button className="primary" onClick={session.retry}>
          Tentar novamente
        </button>
      </main>
    );
  if (session.loading)
    return (
      <main className="standalone">
        <span className="spinner" />
        <output>Preparando seu espaço de trabalho…</output>
      </main>
    );
  if (page === 'login')
    return <LoginScreen busy={session.busy} login={session.login} />;
  if (!session.user) return null;
  return (
    <WorkspaceLayout
      page={page}
      user={session.user}
      busy={session.busy}
      logout={session.logout}
    >
      <ModuleContent page={page} user={session.user} />
    </WorkspaceLayout>
  );
}
