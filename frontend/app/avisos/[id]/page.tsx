import { notFound } from 'next/navigation';
import Workspace from '../../../components/workspace';

export const metadata = { title: 'Detalhe do aviso | Centraliza VISAT' };

export default async function AvisoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const avisoId = Number(id);
  if (!Number.isInteger(avisoId) || avisoId < 1) notFound();
  return <Workspace page="avisos" avisoId={avisoId} />;
}
