'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type SyntheticEvent } from 'react';
import { ArrowLeft, MessageSquare, Plus, RefreshCw, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, type User } from '../lib/auth';
import { EVENTO_LEITURA_CHAT, criarConversa, enviarMensagem, listarConversas, listarMembrosChat, obterConversa } from '../lib/conversas';
import { filtrosValidos, type FiltrosConversa, type ConversaFiltravel, type ParticipanteConversa } from '../lib/conversas-filtros';
import { aplicarLeitura, conciliarLeituras } from '../lib/conversas-leitura';
import { useConversaLeitura } from '../hooks/use-conversa-leitura';
import ConversasFiltros from './conversas-filtros';

const horario = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza',
}).format(new Date(value));

function combinarConversa(atual: ConversaFiltravel, nova: ConversaFiltravel, usuarioId: number): ConversaFiltravel {
  // Uma leitura iniciada antes de um envio pode chegar depois da confirmação.
  const mensagens = new Map(atual.mensagens.map(message => [message.id, message]));
  nova.mensagens.forEach(message => mensagens.set(message.id, message));
  const combinada = {
    ...nova,
    atualizada_em: atual.atualizada_em > nova.atualizada_em ? atual.atualizada_em : nova.atualizada_em,
    mensagens: [...mensagens.values()].sort((a, b) => a.criada_em.localeCompare(b.criada_em) || a.id - b.id),
  };
  // A leitura confirmada localmente não regride com uma resposta mais antiga.
  return aplicarLeitura(combinada, atual.ultima_mensagem_lida_id ?? 0, usuarioId);
}

export default function ConversasWorkspace({ user }: { user: User }) {
  const router = useRouter();
  const [conversas, setConversas] = useState<ConversaFiltravel[] | null>(null);
  const [filtros, setFiltros] = useState<FiltrosConversa>({});
  const [pesquisando, setPesquisando] = useState(false);
  const [cursorLista, setCursorLista] = useState<string | null>(null);
  const [listaExpandida, setListaExpandida] = useState(false);
  const [maisConversas, setMaisConversas] = useState(false);
  const consultaAtual = useRef(0);
  const [aberta, setAberta] = useState<ConversaFiltravel | null>(null);
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [cursorHistorico, setCursorHistorico] = useState<string | null>(null);
  const [maisMensagens, setMaisMensagens] = useState(false);
  const historicoVersao = useRef(0);
  const prepend = useRef<{ height: number; top: number } | null>(null);
  const [membros, setMembros] = useState<ParticipanteConversa[]>([]);
  const [selecionadaId, setSelecionadaId] = useState<number | null>(null);
  const [mostrarConversa, setMostrarConversa] = useState(false);
  const [criando, setCriando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [participanteIds, setParticipanteIds] = useState<number[]>([]);
  // Draft and retry identity belong to the conversation, including after switching threads.
  const [rascunhos, setRascunhos] = useState<Record<number, string>>({});
  const envios = useRef<Record<number, { texto: string; clientId: string }>>({});
  const envioEmCurso = useRef(false);
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [errosEnvio, setErrosEnvio] = useState<Record<number, string>>({});
  const [estadoAtualizacao, setEstadoAtualizacao] = useState('');
  const [erroAtualizacao, setErroAtualizacao] = useState('');
  const atualizarRef = useRef<() => void>(() => {});
  const listaRef = useRef<HTMLOListElement>(null);
  const noFim = useRef(true);
  const [novasMensagens, setNovasMensagens] = useState(false);
  const ultimaMensagem = useRef<number | undefined>(undefined);
  const rascunho = selecionadaId === null ? '' : rascunhos[selecionadaId] ?? '';
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const criacoesLocais = useRef(0);
  const confirmarLeitura = useCallback((id: number, cursor: number, naoLidas?: number) => {
    setConversas(items => items?.map(c => c.id === id ? aplicarLeitura(c, cursor, user.id, naoLidas) : c) ?? null);
    setAberta(c => c?.id === id ? aplicarLeitura(c, cursor, user.id, naoLidas) : c);
    window.dispatchEvent(new Event(EVENTO_LEITURA_CHAT));
  }, [user.id]);

  useEffect(() => {
    const controller = new AbortController();
    const versao = ++consultaAtual.current;
    const timer = window.setTimeout(() => {
      setCursorLista(null); setListaExpandida(false);
      if (!filtrosValidos(filtros)) { setConversas([]); setPesquisando(false); return; }
      setPesquisando(true);
      Promise.all([listarConversas(controller.signal, filtros), listarMembrosChat(controller.signal)])
        .then(([page, team]) => {
          if (controller.signal.aborted || versao !== consultaAtual.current) return;
          setConversas(anteriores => conciliarLeituras(anteriores, page.resultados, user.id)); setCursorLista(page.proximo_cursor ?? null); setMembros(team); setErro('');
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
          else setErro('Não foi possível carregar as conversas. Tente novamente.');
        }).finally(() => { if (!controller.signal.aborted) setPesquisando(false); });
    }, filtros.palavraChave ? 300 : 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [router, tentativa, filtros, user.id]);

  async function carregarConversas() {
    if (!cursorLista || maisConversas || pesquisando) return;
    const versao = consultaAtual.current;
    setMaisConversas(true);
    try {
      const page = await listarConversas(AbortSignal.timeout(15000), { ...filtros, cursor: cursorLista });
      if (versao !== consultaAtual.current) return;
      setConversas(items => [...new Map([...(items ?? []), ...page.resultados].map(c => [c.id, c])).values()]);
      setCursorLista(page.proximo_cursor); setListaExpandida(true); setErro('');
    } catch { if (versao === consultaAtual.current) setErro('Não foi possível carregar mais conversas. Tente novamente.'); }
    finally { setMaisConversas(false); }
  }

  useEffect(() => {
    const alvo = Number(new URLSearchParams(window.location.search).get('conversa'));
    if (!Number.isSafeInteger(alvo) || alvo <= 0) return;
    const controller = new AbortController();
    obterConversa(alvo, controller.signal).then(conversa => {
      if (controller.signal.aborted) return;
      setAberta(conversa); setSelecionadaId(alvo); setMostrarConversa(true);
    }).catch(reason => {
      if (!controller.signal.aborted) setErro(reason instanceof ApiError && [403, 404].includes(reason.status)
        ? 'Esta conversa não está disponível.' : 'Não foi possível abrir a conversa do aviso.');
    });
    return () => controller.abort();
  }, []);

  const listaCarregada = conversas !== null;
  useEffect(() => {
    if (!listaCarregada || listaExpandida || pesquisando || !filtrosValidos(filtros)) return;
    const controller = new AbortController();
    let timer: number;

    async function atualizarLista() {
      const criacoesAntesDaConsulta = criacoesLocais.current;
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]);
        const pagina = await listarConversas(signal, filtros);
        const novas = pagina.resultados;
        // A resposta pode ter sido gerada antes da criação de uma conversa local.
        if (controller.signal.aborted || criacoesAntesDaConsulta !== criacoesLocais.current) return;
        setCursorLista(pagina.proximo_cursor ?? null);
        setConversas(items => {
          const atuaisPorId = new Map(items?.map(item => [item.id, item]));
          return novas.map(nova => {
            const atual = atuaisPorId.get(nova.id);
            return atual ? combinarConversa(atual, nova, user.id) : nova;
          });
        });
      } catch (reason) {
        if (!controller.signal.aborted && reason instanceof ApiError && reason.status === 401) {
          router.replace('/login');
        }
      } finally {
        if (!controller.signal.aborted) timer = window.setTimeout(atualizarLista, 30000);
      }
    }

    timer = window.setTimeout(atualizarLista, 30000);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [listaCarregada, router, filtros, listaExpandida, pesquisando, user.id]);

  const selecionada = aberta;
  const receberConversa = useCallback((nova: ConversaFiltravel) => {
    setAberta(atual => atual?.id === nova.id ? combinarConversa(atual, nova, user.id) : atual);
  }, [user.id]);
  const { erroLeitura, tentarLeitura } = useConversaLeitura(selecionada, mostrarConversa && !buscaAplicada, confirmarLeitura);

  function selecionar(id: number) {
    if (id === selecionadaId && mostrarConversa) return;
    noFim.current = true;
    ultimaMensagem.current = undefined;
    setNovasMensagens(false);
    setErroAtualizacao('');
    setEstadoAtualizacao('');
    historicoVersao.current++;
    setBuscaHistorico(''); setBuscaAplicada(''); setCursorHistorico(null);
    setAberta(conversas?.find(c => c.id === id) ?? null);
    setSelecionadaId(id);
    setMostrarConversa(true);
    setErro('');
  }

  useEffect(() => {
    if (selecionadaId === null || !mostrarConversa) return;
    const controller = new AbortController();
    let timer: number;
    let emCurso = false;
    let inicial = true;
    let ultimoId = 0;
    const versao = ++historicoVersao.current;
    async function atualizar() {
      if (emCurso || controller.signal.aborted) return;
      window.clearTimeout(timer);
      emCurso = true;
      setEstadoAtualizacao('Atualizando mensagensââ‚¬¦');
      try {
        let cursor: string | null = null;
        const apos = ultimoId;
        do {
          const nova: ConversaFiltravel = await obterConversa(selecionadaId!, controller.signal,
            { palavraChave: buscaAplicada, ...(inicial || buscaAplicada ? {} : { apos }), cursor });
          if (controller.signal.aborted || versao !== historicoVersao.current) return;
          if (inicial || buscaAplicada) setCursorHistorico(nova.proximo_cursor ?? null);
          if (buscaAplicada) setAberta(nova);
          else receberConversa(nova);
          for (const m of nova.mensagens) ultimoId = Math.max(ultimoId, m.id);
          cursor = !inicial && !buscaAplicada ? nova.proximo_cursor ?? null : null;
        } while (cursor);
        inicial = false;
        if (controller.signal.aborted) return;
        setErroAtualizacao('');
        setEstadoAtualizacao(buscaAplicada ? 'Resultado da busca no histórico. Limpe a busca para acompanhar mensagens novas.' : 'Mensagens atualizadas. Atualização automática a cada 15 segundos.');
      } catch (reason) {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
        if (reason instanceof ApiError && [403, 404].includes(reason.status)) { setAberta(null); setSelecionadaId(null); setTentativa(v => v + 1); }
        setErroAtualizacao('Não foi possível atualizar as mensagens. Tente novamente.');
        setEstadoAtualizacao('');
      } finally {
        emCurso = false;
        if (!controller.signal.aborted && !buscaAplicada) timer = window.setTimeout(atualizar, 15000);
      }
    }
    atualizarRef.current = atualizar;
    void atualizar();
    return () => { controller.abort(); window.clearTimeout(timer); atualizarRef.current = () => {}; };
  }, [selecionadaId, mostrarConversa, receberConversa, router, buscaAplicada]);

  useLayoutEffect(() => {
    const lista = listaRef.current;
    const ultima = selecionada?.mensagens.at(-1)?.id;
    if (lista && prepend.current) {
      lista.scrollTop = prepend.current.top + lista.scrollHeight - prepend.current.height;
      prepend.current = null;
    } else if (lista && noFim.current) lista.scrollTop = lista.scrollHeight;
    else if (ultima !== ultimaMensagem.current) setNovasMensagens(true);
    ultimaMensagem.current = ultima;
  }, [selecionada?.mensagens, selecionadaId, mostrarConversa]);

  async function criar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!titulo.trim() || !participanteIds.length || busy) return;
    setBusy(true); setErro('');
    try {
      const nova = await criarConversa(titulo.trim(), participanteIds);
      criacoesLocais.current++;
      setConversas(items => [nova, ...(items ?? []).filter(item => item.id !== nova.id)]);
      selecionar(nova.id); setAberta(nova); setCriando(false);
      setTitulo(''); setParticipanteIds([]);
    } catch (reason) { setErro(reason instanceof Error ? reason.message : 'Não foi possível criar a conversa.'); }
    finally { setBusy(false); }
  }
  async function enviar(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selecionada || !rascunho.trim() || envioEmCurso.current) return;
    const id = selecionada.id;
    const texto = rascunho.trim();
    const envio = envios.current[id]?.texto === texto ? envios.current[id] : { texto, clientId: crypto.randomUUID() };
    envios.current[id] = envio;
    envioEmCurso.current = true;
    setEnviandoId(id);
    setErrosEnvio(items => ({ ...items, [id]: '' }));
    try {
      const mensagem = await enviarMensagem(id, texto, envio.clientId);
      setAberta(item => !item || item.id !== id ? item : {
        ...item, mensagens: [...item.mensagens.filter(m => m.id !== mensagem.id), mensagem]
          .sort((a,b) => a.criada_em.localeCompare(b.criada_em) || a.id-b.id), atualizada_em: mensagem.criada_em,
      });
      setConversas(items => items?.map(c => c.id === id ? { ...c, ultima_mensagem: mensagem.texto } : c) ?? null);
      setRascunhos(items => ({ ...items, [id]: '' }));
      delete envios.current[id];
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 401) router.replace('/login');
      setErrosEnvio(items => ({ ...items, [id]: 'Não foi possível confirmar o envio. Seu texto foi preservado.' }));
    } finally { envioEmCurso.current = false; setEnviandoId(null); }
  }
  async function carregarHistorico() {
    if (!selecionadaId || !cursorHistorico || maisMensagens) return;
    const versao = historicoVersao.current;
    setMaisMensagens(true);
    try {
      const nova = await obterConversa(selecionadaId, undefined, { palavraChave: buscaAplicada, cursor: cursorHistorico });
      if (versao !== historicoVersao.current) return;
      const lista = listaRef.current;
      if (lista) prepend.current = { height: lista.scrollHeight, top: lista.scrollTop };
      receberConversa(nova); setCursorHistorico(nova.proximo_cursor ?? null); setErroAtualizacao('');
    } catch { if (versao === historicoVersao.current) setErroAtualizacao('Não foi possível carregar mensagens anteriores. Tente novamente.'); }
    finally { setMaisMensagens(false); }
  }
  function alternarParticipante(id: number) {
    setParticipanteIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id]);
  }

  if (!conversas && !erro) return <section className="chats-loading"><span className="spinner" /><p>Carregando conversasââ‚¬¦</p></section>;
  if (!conversas) return <section className="chats-loading" role="alert"><p>{erro}</p><button className="secondary" onClick={() => { setErro(''); setTentativa(value => value + 1); }}>Tentar novamente</button></section>;

  return <section className={`chats-layout${mostrarConversa ? ' show-conversation' : ''}`} aria-label="Conversas da equipe">
    <div className="chats-sidebar">
      <div className="chats-sidebar-heading"><div><h2>Conversas</h2><span>{conversas.length} conversa{conversas.length === 1 ? '' : 's'}</span></div><button className="secondary" onClick={() => setCriando(value => !value)}><Plus size={17} /> Nova conversa</button></div>
      {criando && <form className="chats-create" onSubmit={criar}>
        <label htmlFor="conversa-titulo">Assunto<input id="conversa-titulo" maxLength={160} required value={titulo} onChange={event => setTitulo(event.target.value)} placeholder="Ex.: Visita ao estabelecimento" /></label>
        <fieldset><legend>Participantes</legend>{membros.length ? membros.map(member => <label key={member.id}><input type="checkbox" checked={participanteIds.includes(member.id)} onChange={() => alternarParticipante(member.id)} />{member.nome}</label>) : <p>Não há outros integrantes ativos nesta equipe.</p>}</fieldset>
        <div className="chats-create-actions"><button className="primary" disabled={busy || !titulo.trim() || !participanteIds.length}>Criar conversa</button><button type="button" className="secondary" onClick={() => setCriando(false)}>Cancelar</button></div>
      </form>}
      <ConversasFiltros conversas={conversas} selecionada={selecionadaId} onSelecionar={selecionar} filtros={filtros} onFiltros={setFiltros} membros={membros} carregando={pesquisando} />
      {cursorLista && <button className="secondary" disabled={maisConversas || pesquisando} onClick={carregarConversas}>{maisConversas ? 'Carregandoââ‚¬¦' : 'Carregar mais conversas'}</button>}
      {listaExpandida && <button className="secondary" onClick={() => setTentativa(v => v+1)}>Atualizar lista</button>}
    </div>
    <div className="chats-thread">
      {selecionada ? <>
        <header className="chats-thread-heading"><button className="chats-back" onClick={() => { setMostrarConversa(false); setSelecionadaId(null); }} aria-label="Voltar para conversas"><ArrowLeft size={20} /></button><div><h2>{selecionada.titulo}</h2><p>{selecionada.participantes.map(item => item.nome).join(', ')}</p></div><button className="chats-refresh" onClick={() => atualizarRef.current()} aria-label="Atualizar mensagens"><RefreshCw size={18} /></button></header>
        <output className="chats-sync">{estadoAtualizacao}</output>
        {erroLeitura && <div className="chats-error" role="alert">Não foi possível registrar a leitura. <button className="secondary" onClick={tentarLeitura}>Tentar novamente</button></div>}
        {erroAtualizacao && <div className="chats-error" role="alert">{erroAtualizacao} <button className="secondary" onClick={() => atualizarRef.current()}>Tentar atualizar novamente</button></div>}
        <form className="chats-composer" onSubmit={event => { event.preventDefault(); if (buscaHistorico.trim() === buscaAplicada) { atualizarRef.current(); return; } historicoVersao.current++; setCursorHistorico(null); setAberta(c => c ? { ...c, mensagens: [] } : null); setBuscaAplicada(buscaHistorico.trim()); }}><label htmlFor="busca-historico">Buscar no histórico</label><div><input id="busca-historico" type="search" maxLength={200} value={buscaHistorico} onChange={e => setBuscaHistorico(e.target.value)} /><button className="secondary">Buscar mensagens</button></div></form>
        {cursorHistorico && <button className="secondary" disabled={maisMensagens} onClick={carregarHistorico}>{maisMensagens ? 'Carregandoââ‚¬¦' : 'Carregar mensagens anteriores'}</button>}
        <ol ref={listaRef} onScroll={() => { const lista = listaRef.current; if (lista) { noFim.current = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 48; if (noFim.current) setNovasMensagens(false); } }} className="chats-messages" aria-label="Mensagens">{selecionada.mensagens.length ? selecionada.mensagens.map(message => <li key={message.id} className={message.autor_id === user.id ? 'mine' : ''}><strong>{message.autor_id === user.id ? 'Você' : message.autor_nome}</strong><p>{message.texto}</p><time dateTime={message.criada_em}>{horario(message.criada_em)}</time></li>) : <li className="chats-no-messages">Nenhuma mensagem ainda. Envie a primeira para iniciar a conversa.</li>}</ol>
        {novasMensagens && <button className="secondary" onClick={() => { const lista = listaRef.current; if (lista) lista.scrollTop = lista.scrollHeight; noFim.current = true; setNovasMensagens(false); }}>Ver novas mensagens</button>}
        {errosEnvio[selecionada.id] && <p className="chats-error" role="alert">{errosEnvio[selecionada.id]}</p>}
        {enviandoId === selecionada.id && <output className="chats-sync">Enviando mensagemââ‚¬¦</output>}
        <form className="chats-composer" onSubmit={enviar}><label htmlFor="mensagem-conversa">Mensagem</label><div><textarea id="mensagem-conversa" maxLength={4000} rows={2} value={rascunho} disabled={enviandoId === selecionada.id} onChange={event => setRascunhos(items => ({ ...items, [selecionada.id]: event.target.value }))} placeholder="Escreva uma mensagem para a equipe" /><button className="primary" disabled={enviandoId !== null || !rascunho.trim()} aria-label={errosEnvio[selecionada.id] ? "Tentar enviar novamente" : "Enviar mensagem"}><Send size={18} /><span>{enviandoId === selecionada.id ? "Enviandoââ‚¬¦" : errosEnvio[selecionada.id] ? "Tentar novamente" : "Enviar"}</span></button></div></form>
      </> : <div className="chats-blank"><MessageSquare size={34} /><h2>{conversas.length ? 'Escolha uma conversa' : 'Nenhuma conversa ainda'}</h2><p>{conversas.length ? 'Selecione uma conversa da lista para ler e responder.' : 'Crie uma conversa para trocar mensagens com integrantes da equipe.'}</p></div>}
      {erro && <p className="chats-error" role="alert">{erro}</p>}
    </div>
  </section>;
}
