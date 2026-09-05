import { notFound } from 'next/navigation';
import Workspace from '../../components/workspace';
export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!['login', 'agenda', 'avisos', 'demandas', 'chats'].includes(module)) notFound();
  return <Workspace key={module} page={module} />;
}
