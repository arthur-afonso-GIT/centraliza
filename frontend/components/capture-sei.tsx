'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { User } from '../lib/auth';
import { ApiError } from '../lib/auth';
import { listarInspetores, salvarDemanda, solicitarParticipacao, verificarNumeroSei, type DadosDemanda, type Inspetor, type PossivelDuplicidadeSei } from '../lib/demandas';

const KEY = 'centraliza:captura-sei:v1';
type Capture = { version: 1; sei_numero: string; origem: string; aviso?: string };
const empty: DadosDemanda = { titulo: '', sei_numero: '', origem: '', descricao: '', prazo: '', prioridade: 'media', critica: false, responsavel_id: null, equipes_ids: [] };

function readCapture(): Capture | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (value?.version !== 1 || typeof value.sei_numero !== 'string' || typeof value.origem !== 'string') return null;
    return { version: 1, sei_numero: value.sei_numero.slice(0, 80), origem: value.origem.slice(0, 200), aviso: typeof value.aviso === 'string' ? value.aviso.slice(0, 300) : undefined };
  } catch { return null; }
}

export default function CaptureSei({ user }: { user: User }) {
  const router = useRouter();
  const [capture, setCapture] = useState<Capture | null>(null);
  const [ready, setReady] = useState(false);
  const [dados, setDados] = useState<DadosDemanda>(empty);
  const [inspetores, setInspetores] = useState<Inspetor[]>([]);
  const [duplicate, setDuplicate] = useState<PossivelDuplicidadeSei | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function receive() {
      const next = readCapture();
      setCapture(next); setReady(true);
      if (next) {
        setDados(current => ({ ...current, sei_numero: next.sei_numero, origem: next.origem }));
        setDuplicate(null); setRequested(false); setChecking(Boolean(next.sei_numero.trim()));
      }
    }
    receive();
    window.addEventListener('centraliza:captura-sei', receive);
    return () => window.removeEventListener('centraliza:captura-sei', receive);
  }, []);

  useEffect(() => {
    if (user.perfil !== 'gestor') return;
    const controller = new AbortController();
    listarInspetores(controller.signal).then(setInspetores).catch(() => setInspetores([]));
    return () => controller.abort();
  }, [user.perfil]);

  useEffect(() => {
    const number = dados.sei_numero.trim();
    if (!number) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      verificarNumeroSei(number, controller.signal).then(result => {
        const found = result.resultados[0] ?? null;
        if (found?.acessivel) { sessionStorage.removeItem(KEY); router.replace(`/demandas/${found.id}`); return; }
        setDuplicate(found);
      }).catch(reason => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError('Não foi possível verificar se este processo já existe.');
      }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [dados.sei_numero, router]);

  function field<K extends keyof DadosDemanda>(key: K, value: DadosDemanda[K]) {
    setDados(current => ({ ...current, [key]: value }));
    if (key === 'sei_numero') { setDuplicate(null); setRequested(false); setChecking(Boolean(String(value).trim())); }
    setError('');
  }

  async function request() {
    if (!duplicate) return;
    setBusy(true); setError('');
    try { await solicitarParticipacao(duplicate.id); setRequested(true); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Não foi possível solicitar participação.'); }
    finally { setBusy(false); }
  }

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (duplicate || checking) return;
    setBusy(true); setError('');
    try {
      const saved = await salvarDemanda(dados);
      sessionStorage.removeItem(KEY);
      router.replace(`/demandas/${saved.id}`);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'Não foi possível criar a demanda.'); }
    finally { setBusy(false); }
  }

  function cancel() { sessionStorage.removeItem(KEY); router.replace('/demandas'); }

  if (!ready) return <main id="conteudo" className="content"><output>Preparando captura…</output></main>;
  if (!capture) return <main id="conteudo" className="content capture-page"><h1>Nenhuma captura nesta aba</h1><p>Abra a página fictícia do SEI e use Enviar na extensão para iniciar uma nova captura.</p><button className="secondary" onClick={() => router.replace('/demandas')}>Voltar para demandas</button></main>;
  return <main id="conteudo" className="content capture-page"><span className="eyebrow">CAPTURA ASSISTIDA DO SEI</span><h1>Revise antes de criar a demanda</h1><p>Confira os campos identificados na página e complete as informações da atividade. Nada será salvo antes da sua confirmação.</p>
    {capture.aviso && <div className="form-warning" role="alert"><AlertTriangle size={17} />{capture.aviso}</div>}
    {user.perfil !== 'gestor' ? <div className="form-error" role="alert">Selecione uma equipe em que você seja gestor para criar a demanda.</div> : <form className="demand-form capture-form" onSubmit={submit}>
      {error && <div className="form-error" role="alert"><AlertTriangle size={17} />{error}</div>}
      {checking && <output className="form-note">Verificando o número SEI…</output>}
      {duplicate && <div className="form-warning" role="alert"><AlertTriangle size={17} /><div><strong>Demanda já cadastrada</strong><p>{duplicate.sei_numero} — {duplicate.titulo} · {duplicate.origem || 'Demandante não informado'}</p><button type="button" className="secondary" disabled={busy || requested} onClick={request}>{requested ? 'Participação solicitada' : 'Solicitar participação da equipe'}</button></div></div>}
      <label>Número do processo SEI<input required maxLength={80} value={dados.sei_numero} onChange={event => field('sei_numero', event.target.value)} /><small>Se não foi identificado com segurança, digite o número do processo manualmente. Não use o número do documento.</small></label>
      <label>Demandante (instituição)<input maxLength={200} value={dados.origem} onChange={event => field('origem', event.target.value)} /></label>
      <label>Título da demanda<input required maxLength={200} value={dados.titulo} onChange={event => field('titulo', event.target.value)} /></label>
      <label>Descrição<textarea value={dados.descricao} onChange={event => field('descricao', event.target.value)} /></label>
      <div className="form-row"><label>Prazo (horário de Fortaleza)<input required type="datetime-local" value={dados.prazo} onChange={event => field('prazo', event.target.value)} /></label><label>Prioridade<select value={dados.prioridade} onChange={event => field('prioridade', event.target.value as DadosDemanda['prioridade'])}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label></div>
      <label>Responsável<select value={dados.responsavel_id ?? ''} onChange={event => field('responsavel_id', event.target.value ? Number(event.target.value) : null)}><option value="">Não atribuída</option>{inspetores.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select><small>A atribuição aguardará o aceite do inspetor.</small></label>
      <label className="check-field"><input type="checkbox" checked={dados.critica} onChange={event => field('critica', event.target.checked)} />Demanda crítica</label>
      <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={cancel}>Cancelar captura</button><button className="primary" disabled={busy || checking || !!duplicate}>{busy ? 'Salvando…' : <><CheckCircle2 size={17} /> Criar demanda</>}</button></div>
    </form>}
  </main>;
}
