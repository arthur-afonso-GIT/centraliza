'use client';
import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';
import { ArrowLeft, MessageSquare, Plus, RefreshCw, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, type User } from '../lib/auth';
import { criarConversa, enviarMensagem, listarConversas, listarMembrosChat } from '../lib/conversas';
import type { ConversaFiltravel, ParticipanteConversa } from '../lib/conversas-filtros';
import { aplicarLeitura, conciliarLeituras } from '../lib/conversas-leitura';
import { useConversaLeitura } from '../hooks/use-conversa-leitura';
import ConversasFiltros from './conversas-filtros';

const horario = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza',
}).format(new Date(value));

export default function ConversasWorkspace({ user }: { user: User }) {
  const router = useRouter();
  const [conversas, setConversas] = useState<ConversaFiltravel[] | null>(null);
  const [membros, setMembros] = useState<ParticipanteConversa[]>([]);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null);
  const [mostrarConversa, setMostrarConversa] = useState(false);
  const [criando, setCriando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [participanteIds, setParticipanteIds] = useState<number[]>([]);
  const [rascunho, setRascunho] = useState('');
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const receberLista = useCallback((items: ConversaFiltravel[]) => {
    setConversas(anteriores => conciliarLeituras(anteriores, items, user.id));
  }, [user.id]);
  const confirmarLeitura = useCallback((id: number, cursor: number) => {
    setConversas(items => items?.map(c => c.id === id ? aplicarLeitura(c, cursor, user.id) : c) ?? null);
  }, [user.id]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([listarConversas(controller.signal), listarMembrosChat(controller.signal)])
      .then(([items, team]) => { receberLista(items); setMembros(team); setErro(''); })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
        else setErro('Não foi possível carregar as conversas. Tente novamente.');
      });
    const timer = window.setInterval(() => {
      listarConversas(controller.signal).then(receberLista).catch(() => {});
    }, 15000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [router, tentativa, receberLista]);

  const selecionada = conversas?.find(item => item.id === selecionadaId) ?? null;
  const { erroLeitura, tentarLeitura } = useConversaLeitura(selecionada, mostrarConversa, confirmarLeitura);
  async function atualizar() {
    try { receberLista(await listarConversas()); setErro(''); }
    catch (reason) { setErro(reason instanceof Error ? reason.message : 'Não foi possível atualizar as conversas.'); }
  }
  async function criar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!titulo.trim() || !participanteIds.length || busy) return;
    setBusy(true); setErro('');
    try {
      const nova = await criarConversa(titulo.trim(), participanteIds);
      setConversas(items => [nova, ...(items ?? [])]);
      setSelecionadaId(nova.id); setMostrarConversa(true); setCriando(false);
      setTitulo(''); setParticipanteIds([]);
    } catch (reason) { setErro(reason instanceof Error ? reason.message : 'Não foi possível criar a conversa.'); }
    finally { setBusy(false); }
  }
  async function enviar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selecionada || !rascunho.trim() || busy) return;
    setBusy(true); setErro('');
    try {
      await enviarMensagem(selecionada.id, rascunho.trim());
      setRascunho('');
      await atualizar();
    } catch (reason) { setErro(reason instanceof Error ? reason.message : 'Não foi possível enviar a mensagem.'); }
    finally { setBusy(false); }
  }
  function alternarParticipante(id: number) {
    setParticipanteIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
  }

  if (!conversas && !erro) return <section className="chats-loading"><span className="spinner" /><p>Carregando conversas…</p></section>;
  if (!conversas) return <section className="chats-loading" role="alert"><p>{erro}</p><button className="secondary" onClick={() => { setErro(''); setTentativa(value => value + 1); }}>Tentar novamente</button></section>;

  return <section className={`chats-layout${mostrarConversa ? ' show-conversation' : ''}`} aria-label="Conversas da equipe">
    <div className="chats-sidebar">
      <div className="chats-sidebar-heading"><div><h2>Conversas</h2><span>{conversas.length} conversa{conversas.length === 1 ? '' : 's'}</span></div><button className="secondary" onClick={() => setCriando(value => !value)}><Plus size={17} /> Nova conversa</button></div>
      {criando && <form className="chats-create" onSubmit={criar}>
        <label htmlFor="conversa-titulo">Assunto<input id="conversa-titulo" maxLength={160} required value={titulo} onChange={event => setTitulo(event.target.value)} placeholder="Ex.: Visita ao estabelecimento" /></label>
        <fieldset><legend>Participantes</legend>{membros.length ? membros.map(member => <label key={member.id}><input type="checkbox" checked={participanteIds.includes(member.id)} onChange={() => alternarParticipante(member.id)} />{member.nome}</label>) : <p>Não há outros integrantes ativos nesta equipe.</p>}</fieldset>
        <div className="chats-create-actions"><button className="primary" disabled={busy || !titulo.trim() || !participanteIds.length}>Criar conversa</button><button type="button" className="secondary" onClick={() => setCriando(false)}>Cancelar</button></div>
      </form>}
      <ConversasFiltros conversas={conversas} selecionada={selecionadaId} onSelecionar={id => { setSelecionadaId(id); setMostrarConversa(true); setErro(''); }} />
    </div>
    <div className="chats-thread">
      {selecionada ? <>
        <header className="chats-thread-heading"><button className="chats-back" onClick={() => { setMostrarConversa(false); setSelecionadaId(null); }} aria-label="Voltar para conversas"><ArrowLeft size={20} /></button><div><h2>{selecionada.titulo}</h2><p>{selecionada.participantes.map(item => item.nome).join(', ')}</p></div><button className="chats-refresh" onClick={atualizar} aria-label="Atualizar mensagens"><RefreshCw size={18} /></button></header>
        {erroLeitura && <div className="chats-error" role="alert">Não foi possível registrar a leitura. <button className="secondary" onClick={tentarLeitura}>Tentar novamente</button></div>}
        <ol className="chats-messages" aria-label="Mensagens">{selecionada.mensagens.length ? selecionada.mensagens.map(message => <li key={message.id} className={message.autor_id === user.id ? 'mine' : ''}><strong>{message.autor_id === user.id ? 'Você' : message.autor_nome}</strong><p>{message.texto}</p><time dateTime={message.criada_em}>{horario(message.criada_em)}</time></li>) : <li className="chats-no-messages">Nenhuma mensagem ainda. Envie a primeira para iniciar a conversa.</li>}</ol>
        <form className="chats-composer" onSubmit={enviar}><label htmlFor="mensagem-conversa">Mensagem</label><div><textarea id="mensagem-conversa" maxLength={4000} rows={2} value={rascunho} onChange={event => setRascunho(event.target.value)} placeholder="Escreva uma mensagem para a equipe" /><button className="primary" disabled={busy || !rascunho.trim()} aria-label="Enviar mensagem"><Send size={18} /><span>Enviar</span></button></div></form>
      </> : <div className="chats-blank"><MessageSquare size={34} /><h2>{conversas.length ? 'Escolha uma conversa' : 'Nenhuma conversa ainda'}</h2><p>{conversas.length ? 'Selecione uma conversa da lista para ler e responder.' : 'Crie uma conversa para trocar mensagens com integrantes da equipe.'}</p></div>}
      {erro && <p className="chats-error" role="alert">{erro}</p>}
    </div>
  </section>;
}
