'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError } from '../lib/auth';
import { obterAviso, type AvisoDetalhe } from '../lib/avisos';

const data = (value: string) => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Fortaleza' }).format(new Date(value));

export default function AvisoDetail({ id }: { id: number }) {
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  const [item, setItem] = useState<AvisoDetalhe | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    obterAviso(id, controller.signal).then(setItem).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      const status = reason instanceof ApiError ? reason.status : 500;
      if (status === 401) router.replace('/login'); else setError(status);
    });
    return () => controller.abort();
  }, [id, attempt, router]);
  useEffect(() => { if (item) ref.current?.focus({ preventScroll: true }); }, [item]);
  if (!item && !error) return <main id="conteudo" className="content detail-state" tabIndex={-1}><output><span className="spinner" /> Carregando aviso…</output></main>;
  if (error) return <main id="conteudo" className="content detail-state" tabIndex={-1} role="alert"><AlertTriangle size={38} /><h1>{error === 404 ? 'Aviso indisponível' : 'Não foi possível carregar'}</h1><p>{error === 404 ? 'O aviso não existe ou não pertence à sua equipe.' : 'Verifique a conexão com a API e tente novamente.'}</p>{error !== 404 && <button className="secondary" onClick={() => { setError(null); setAttempt(value => value + 1); }}><RotateCcw size={17} /> Tentar novamente</button>}<Link href="/avisos">Voltar aos avisos</Link></main>;
  if (!item) return null;
  return <main ref={ref} id="conteudo" className="content notice-detail" tabIndex={-1}><Link className="back-link" href="/avisos"><ArrowLeft size={18} /> Voltar aos avisos</Link><article><span className={`notice-tag ${item.categoria}`}>{item.categoria === 'urgente' ? 'Urgente' : 'Informativo'}</span><h1>{item.titulo}</h1><p className="notice-byline">Publicado por {item.autor} em <time dateTime={item.publicado_em}>{data(item.publicado_em)}</time></p><p className="notice-summary">{item.resumo}</p><div className="notice-body">{item.conteudo}</div></article></main>;
}
