import type { DemandaDetalhe } from '../lib/demandas';

const etapas = [
  { status: 'pendente', label: 'Atribuição' },
  { status: 'aceita', label: 'Aceite' },
  { status: 'em_andamento', label: 'Execução' },
  { status: 'aguardando_avaliacao', label: 'Avaliação' },
  { status: 'concluida', label: 'Conclusão' },
];

export default function DemandaProgress({ demanda }: { demanda: DemandaDetalhe }) {
  const cancelada = demanda.status === 'cancelada';
  const correcao = demanda.status === 'em_correcao';
  const atual = correcao ? 2 : etapas.findIndex(item => item.status === demanda.status);
  const solicitacao = correcao ? demanda.historico.find(item => item.status_novo === 'em_correcao') : null;
  return <section className="demand-progress" aria-label="Etapas da demanda">
    <ol>{etapas.map((item, index) => <li key={item.status} className={cancelada ? '' : index < atual ? 'completed' : index === atual ? 'current' : ''} aria-current={!cancelada && index === atual ? 'step' : undefined}><span aria-hidden="true">{index + 1}</span>{correcao && index === atual ? 'Em correção' : item.label}</li>)}</ol>
    {correcao && <div className="correction-callout" role="note"><h2>Correções solicitadas</h2><p>{solicitacao?.texto || 'Consulte as orientações da gestão no histórico.'}</p>{solicitacao && <small>{solicitacao.autor.nome} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' }).format(new Date(solicitacao.criado_em))}</small>}<p>Após realizar os ajustes, descreva a entrega e envie novamente para avaliação.</p></div>}
    {demanda.status === 'aguardando_avaliacao' && <p className="stage-note">Entrega enviada. Aguardando aprovação ou solicitação de correções pela gestão.</p>}
    {demanda.status === 'concluida' && <p className="stage-note">Entrega aprovada pela gestão. Demanda concluída.</p>}
    {cancelada && <p className="stage-note">Demanda cancelada. Consulte o motivo no histórico.</p>}
  </section>;
}
