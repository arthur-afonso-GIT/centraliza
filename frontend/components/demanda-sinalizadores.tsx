import { AlertTriangle } from 'lucide-react';
import type { DemandaResumo } from '../lib/demandas';

export default function DemandaSinalizadores({ critica, prioridade }: Pick<DemandaResumo, 'critica' | 'prioridade'>) {
  return <>
    {critica && <span className="critical"><AlertTriangle size={15} aria-hidden="true" /> Crítica</span>}
    {prioridade === 'alta' && <span className="high-priority">Alta prioridade</span>}
  </>;
}
