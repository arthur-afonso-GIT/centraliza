import { notFound } from 'next/navigation';
import Workspace from '../../../components/workspace';

export const metadata = { title: 'Detalhe da demanda | Centraliza VISAT' };

export default async function DemandaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const demandId = Number(id);
  if (!Number.isInteger(demandId) || demandId < 1) notFound();
  return <Workspace page="demandas" demandId={demandId} />;
}
