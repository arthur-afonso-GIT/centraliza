import { ApiError, type Profile } from './auth';
import type { Compromisso } from './agenda';
import type { AvisoFeed } from './avisos';
import type { DemandaResumo } from './demandas';

export type ResumoHome = {
  perfil: Profile;
  gerado_em: string;
  indicadores: Record<string, number>;
  carga_inspetores?: Array<{ id: number; nome: string; total: number }>;
  proximas_demandas: DemandaResumo[];
  proximos_compromissos: Compromisso[];
  avisos_ativos: AvisoFeed[];
};

export async function obterResumoHome(signal?: AbortSignal) {
  const response = await fetch('/api/home/resumo/', { credentials: 'same-origin', signal });
  if (!response.ok) throw new ApiError(response.status, 'Não foi possível carregar o resumo do seu trabalho.');
  return response.json() as Promise<ResumoHome>;
}
