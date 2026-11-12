'use client';
import { useEffect, useState } from 'react';
import { formatarAtraso, formatarPrazo } from '../lib/prazos';

export default function TempoAtraso({ prazo }: { prazo: string }) {
  const [agora, setAgora] = useState(0);
  useEffect(() => {
    const inicial = setTimeout(() => setAgora(Date.now()), 0);
    const timer = setInterval(() => setAgora(Date.now()), 60000);
    return () => { clearTimeout(inicial); clearInterval(timer); };
  }, []);
  const atraso = formatarAtraso(prazo, agora);
  return <span className="overdue-duration" title={`Prazo: ${formatarPrazo(prazo)}`}>
    {atraso ? `Vencida há ${atraso}` : 'Prazo vencido'}
  </span>;
}
