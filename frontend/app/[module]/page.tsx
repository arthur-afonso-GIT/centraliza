import { notFound } from 'next/navigation';
import Workspace from '../../components/workspace';
import { modules } from '../../lib/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const title =
    module === 'login'
      ? 'Entrar'
      : (modules.find((item) => item.id === module)?.title ??
        'Página não encontrada');
  return { title: `${title} | Centraliza VISAT` };
}
export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  if (!['login', 'agenda', 'avisos', 'demandas', 'chats'].includes(module))
    notFound();
  return <Workspace key={module} page={module} />;
}
