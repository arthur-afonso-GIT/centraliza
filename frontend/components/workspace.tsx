'use client';
import { ShieldCheck } from 'lucide-react';
import { useSession } from '../hooks/use-session';
import LoginScreen from './login-screen';
import ModuleContent from './module-content';
import WorkspaceLayout from './workspace-layout';
import DemandaDetail from './demanda-detail';
import AvisoDetail from './aviso-detail';

export default function Workspace({ page, demandId, avisoId }: { page: string; demandId?: number; avisoId?: number }) {
  const session = useSession(page);
  if (session.error)
    return (
      <main className="standalone" role="alert">
        <ShieldCheck size={40} />
        <h1>Não foi possível acessar a sessão</h1>
        <p>
          Verifique suas credenciais e se a API está disponível, depois tente
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
      {demandId ? <DemandaDetail id={demandId} user={session.user} /> : avisoId ? <AvisoDetail id={avisoId} /> : <ModuleContent page={page} user={session.user} />}
    </WorkspaceLayout>
  );
}
