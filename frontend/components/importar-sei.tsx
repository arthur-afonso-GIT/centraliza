'use client';
import { useEffect, useState, type SyntheticEvent } from 'react';
import { AlertTriangle, ClipboardPaste, SearchCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ApiError } from '../lib/auth';
import {
  atualizarPreviaSei, confirmarPreviaSei, criarPreviaSei, descartarPreviaSei,
  listarInspetores, type CamposImportacaoSei, type DadosDemanda,
  type DemandaDetalhe, type ImportacaoSei, type Inspetor,
} from '../lib/demandas';

const dadosVazios: DadosDemanda = {
  titulo: '', sei_numero: '', descricao: '', origem: '', prioridade: 'media',
  prazo: '', critica: false, responsavel_id: null, equipes_ids: [],
};

export default function ImportarSei({ onSaved }: { onSaved: (item: DemandaDetalhe) => void }) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [previa, setPrevia] = useState<ImportacaoSei | null>(null);
  const [campos, setCampos] = useState<CamposImportacaoSei | null>(null);
  const [dados, setDados] = useState<DadosDemanda>(dadosVazios);
  const [inspetores, setInspetores] = useState<Inspetor[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    listarInspetores(controller.signal).then(setInspetores).catch(() => setInspetores([]));
    return () => controller.abort();
  }, [open]);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) {
      setTexto(''); setPrevia(null); setCampos(null); setDados(dadosVazios); setError('');
    }
  }

  function field(key: keyof DadosDemanda, value: string | boolean | number | null) {
    setDados(current => ({ ...current, [key]: value }));
  }

  function externalField(key: keyof CamposImportacaoSei, value: string) {
    setCampos(current => current ? { ...current, [key]: value || (key === 'data_autuacao' ? null : '') } : current);
  }

  async function interpret(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await criarPreviaSei(texto);
      setPrevia(result); setCampos(result.campos);
      setDados({ ...dadosVazios, titulo: result.campos.assunto, sei_numero: result.campos.sei_numero });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível interpretar o texto.');
    } finally { setBusy(false); }
  }

  async function confirm(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!previa || !campos) return;
    setBusy(true); setError('');
    try {
      const updated = await atualizarPreviaSei(previa.id, campos);
      setPrevia(updated);
      const saved = await confirmarPreviaSei(previa.id, { ...dados, sei_numero: campos.sei_numero });
      onSaved(saved); setOpen(false);
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Não foi possível confirmar a importação.');
    } finally { setBusy(false); }
  }

  async function discard() {
    if (previa) {
      setBusy(true);
      try { await descartarPreviaSei(previa.id); } catch { /* A prévia expira automaticamente. */ }
      finally { setBusy(false); }
    }
    setOpen(false);
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger className="secondary"><ClipboardPaste size={17} /> Importar do SEI</DialogTrigger>
    <DialogContent className="demand-dialog"><DialogHeader><DialogTitle>Importar dados do SEI</DialogTitle><DialogDescription>Use apenas texto autorizado e anonimizado durante o desenvolvimento. Nada será criado antes da confirmação.</DialogDescription></DialogHeader>
      {error && <div className="form-error" role="alert"><AlertTriangle size={17} />{error}</div>}
      {!previa ? <form className="demand-form" onSubmit={interpret}><label htmlFor="texto-sei">Texto copiado do SEI<textarea id="texto-sei" required maxLength={20000} value={texto} onChange={event => setTexto(event.target.value)} placeholder={'Número SEI: PROCESSO-FICTICIO-001\nAssunto: Inspeção demonstrativa\nTipo do Processo: Fiscalização\nUnidade: VISAT DEMONSTRAÇÃO\nData de Autuação: 14/09/2026'} /></label><p className="form-note">O interpretador atual reconhece um formato fictício de rótulo e valor. A compatibilidade institucional ainda será validada.</p><div className="form-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="primary" disabled={busy || !texto.trim()}>{busy ? 'Interpretando…' : <><SearchCheck size={17} /> Gerar prévia</>}</button></div></form> : campos && <form className="demand-form" onSubmit={confirm}>
        {previa.erros.length > 0 && <div className="form-error" role="alert"><AlertTriangle size={17} /><div><strong>Revise os campos</strong>{previa.erros.map(item => <p key={item}>{item}</p>)}</div></div>}
        {previa.avisos.length > 0 && <div className="form-warning"><AlertTriangle size={17} /><div>{previa.avisos.map(item => <p key={item}>{item}</p>)}</div></div>}
        {previa.possiveis_duplicidades.length > 0 && <div className="form-warning" role="alert"><AlertTriangle size={17} /><div><strong>Possível duplicidade</strong><p>Confira a demanda existente antes de confirmar.</p>{previa.possiveis_duplicidades.map(item => <a key={item.id} href={`/demandas/${item.id}`} target="_blank" rel="noreferrer">{item.sei_numero} — {item.titulo}</a>)}</div></div>}
        <fieldset><legend>Dados interpretados</legend><label>Número do processo SEI<input required maxLength={80} value={campos.sei_numero} onChange={event => externalField('sei_numero', event.target.value)} /></label><label>Assunto ou especificação<input maxLength={500} value={campos.assunto} onChange={event => { externalField('assunto', event.target.value); if (!dados.titulo) field('titulo', event.target.value); }} /></label><div className="form-row"><label>Tipo do processo<input maxLength={200} value={campos.tipo_processo} onChange={event => externalField('tipo_processo', event.target.value)} /></label><label>Unidade<input maxLength={200} value={campos.unidade} onChange={event => externalField('unidade', event.target.value)} /></label></div><label>Data de autuação<input type="date" value={campos.data_autuacao ?? ''} onChange={event => externalField('data_autuacao', event.target.value)} /></label></fieldset>
        <fieldset><legend>Dados da demanda</legend><label>Título<input required maxLength={200} value={dados.titulo} onChange={event => field('titulo', event.target.value)} /></label><label>Descrição<textarea value={dados.descricao} onChange={event => field('descricao', event.target.value)} /></label><div className="form-row"><label>Origem<input maxLength={200} value={dados.origem} onChange={event => field('origem', event.target.value)} /></label><label>Prazo<input required type="date" value={dados.prazo} onChange={event => field('prazo', event.target.value)} /></label></div><div className="form-row"><label>Prioridade<select value={dados.prioridade} onChange={event => field('prioridade', event.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label><label>Responsável<select value={dados.responsavel_id ?? ''} onChange={event => field('responsavel_id', event.target.value ? Number(event.target.value) : null)}><option value="">Não atribuída</option>{inspetores.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label></div><label className="check-field"><input type="checkbox" checked={dados.critica} onChange={event => field('critica', event.target.checked)} />Demanda crítica</label></fieldset>
        <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={discard}>Descartar prévia</button><button className="primary" disabled={busy}>{busy ? 'Confirmando…' : 'Confirmar e criar demanda'}</button></div>
      </form>}
    </DialogContent>
  </Dialog>;
}
