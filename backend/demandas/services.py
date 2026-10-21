from dataclasses import dataclass
from datetime import timedelta

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from demandas.models import Demanda, EventoDemanda, SolicitacaoParticipacao
from django.utils import timezone


@dataclass(frozen=True)
class RegraTransicao:
    perfil: str
    exige_texto: bool = False


REGRAS = {
    (Demanda.Status.PENDENTE, Demanda.Status.ACEITA): RegraTransicao("inspetor"),
    (Demanda.Status.ACEITA, Demanda.Status.EM_ANDAMENTO): RegraTransicao("inspetor"),
    (Demanda.Status.ACEITA, Demanda.Status.CANCELADA): RegraTransicao("gestor", True),
    (Demanda.Status.EM_ANDAMENTO, Demanda.Status.AGUARDANDO_AVALIACAO): RegraTransicao("inspetor", True),
    (Demanda.Status.EM_CORRECAO, Demanda.Status.AGUARDANDO_AVALIACAO): RegraTransicao("inspetor", True),
    (Demanda.Status.AGUARDANDO_AVALIACAO, Demanda.Status.CONCLUIDA): RegraTransicao("gestor"),
    (Demanda.Status.AGUARDANDO_AVALIACAO, Demanda.Status.EM_CORRECAO): RegraTransicao("gestor", True),
    (Demanda.Status.PENDENTE, Demanda.Status.CANCELADA): RegraTransicao("gestor", True),
    (Demanda.Status.EM_ANDAMENTO, Demanda.Status.CANCELADA): RegraTransicao("gestor", True),
    (Demanda.Status.AGUARDANDO_AVALIACAO, Demanda.Status.CANCELADA): RegraTransicao("gestor", True),
    (Demanda.Status.EM_CORRECAO, Demanda.Status.CANCELADA): RegraTransicao("gestor", True),
}


@transaction.atomic
def alterar_status_demanda(*, demanda_id: int, usuario, novo_status: str, texto: str = "") -> Demanda:
    demanda = Demanda.objects.select_for_update().filter(equipe_id=usuario.equipe_id).get(pk=demanda_id)
    if usuario.perfil == "inspetor" and demanda.responsavel_id != usuario.id:
        raise Demanda.DoesNotExist
    regra = REGRAS.get((demanda.status, novo_status))
    if not regra:
        raise ValidationError({"status": "Transição de status não permitida."})
    if usuario.perfil != regra.perfil:
        raise PermissionDenied("Seu perfil não pode executar esta transição.")
    texto = texto.strip()
    if regra.exige_texto and not texto:
        raise ValidationError({"texto": "Informe a justificativa ou o resumo desta transição."})
    if novo_status == Demanda.Status.ACEITA:
        texto = "Recebimento e responsabilidade confirmados pelo inspetor."
    anterior = demanda.status
    demanda.status = novo_status
    demanda.save(update_fields=["status", "atualizada_em"])
    EventoDemanda.objects.create(
        demanda=demanda, tipo=EventoDemanda.Tipo.STATUS_ALTERADO, autor=usuario,
        status_anterior=anterior, status_novo=novo_status, texto=texto,
    )
    return demanda


@transaction.atomic
def criar_demanda(*, usuario, dados: dict) -> Demanda:
    if usuario.perfil != "gestor" or not usuario.equipe_id:
        raise PermissionDenied("Somente gestores vinculados a uma equipe podem criar demandas.")
    responsavel = dados.pop("responsavel_id", None)
    equipes_ids = dados.pop("equipes_ids", None) or [usuario.equipe_id]
    if usuario.equipe_id not in equipes_ids:
        equipes_ids.append(usuario.equipe_id)
    demanda = Demanda.objects.create(**dados, equipe_id=usuario.equipe_id, criador=usuario, responsavel=responsavel)
    demanda.equipes_participantes.set(equipes_ids)
    identificacao = f" Processo SEI: {demanda.sei_numero}." if demanda.sei_numero else ""
    EventoDemanda.objects.create(demanda=demanda, tipo=EventoDemanda.Tipo.DEMANDA_CRIADA, autor=usuario, texto=f"Demanda criada pela gestão.{identificacao}")
    if responsavel:
        EventoDemanda.objects.create(demanda=demanda, tipo=EventoDemanda.Tipo.RESPONSAVEL_ALTERADO, autor=usuario, texto=f"Responsável definido: {responsavel.nome}.")
    return demanda


@transaction.atomic
def solicitar_participacao(*, demanda_id: int, usuario) -> SolicitacaoParticipacao:
    if usuario.perfil != "gestor" or not usuario.equipe_id:
        raise PermissionDenied("Somente gestores vinculados a uma equipe podem solicitar participação.")
    demanda = Demanda.objects.select_for_update().get(pk=demanda_id)
    if demanda.equipes_participantes.filter(pk=usuario.equipe_id).exists():
        raise ValidationError({"detail": "Sua equipe já participa desta demanda."})
    solicitacao = SolicitacaoParticipacao.objects.select_for_update().filter(demanda=demanda, equipe_id=usuario.equipe_id).first()
    if solicitacao:
        if solicitacao.status == SolicitacaoParticipacao.Status.PENDENTE:
            return solicitacao
        if solicitacao.status == SolicitacaoParticipacao.Status.APROVADA:
            raise ValidationError({"detail": "Esta participação já foi aprovada."})
        solicitacao.status = SolicitacaoParticipacao.Status.PENDENTE
        solicitacao.solicitante = usuario
        solicitacao.criada_em = timezone.now()
        solicitacao.decidida_em = None
        solicitacao.decidida_por = None
        solicitacao.save(update_fields=["status", "solicitante", "criada_em", "decidida_em", "decidida_por"])
        return solicitacao
    return SolicitacaoParticipacao.objects.create(demanda=demanda, equipe_id=usuario.equipe_id, solicitante=usuario)


@transaction.atomic
def decidir_participacao(*, solicitacao_id: int, usuario, aprovar: bool) -> SolicitacaoParticipacao:
    if usuario.perfil != "gestor" or not usuario.equipe_id:
        raise PermissionDenied("Somente gestores de equipes participantes podem decidir solicitações.")
    # O bloqueio da demanda serializa decisões e pedidos para a mesma demanda.
    solicitacao_base = SolicitacaoParticipacao.objects.only("demanda_id").get(pk=solicitacao_id)
    demanda = Demanda.objects.select_for_update().get(pk=solicitacao_base.demanda_id)
    solicitacao = SolicitacaoParticipacao.objects.select_for_update().select_related("equipe", "solicitante").get(pk=solicitacao_id)
    if not demanda.equipes_participantes.filter(pk=usuario.equipe_id).exists():
        raise PermissionDenied("Sua equipe não participa desta demanda.")
    if solicitacao.status != SolicitacaoParticipacao.Status.PENDENTE:
        raise ValidationError({"detail": "Esta solicitação já foi decidida."})
    solicitacao.status = SolicitacaoParticipacao.Status.APROVADA if aprovar else SolicitacaoParticipacao.Status.RECUSADA
    solicitacao.decidida_em = timezone.now()
    solicitacao.decidida_por = usuario
    solicitacao.save(update_fields=["status", "decidida_em", "decidida_por"])
    if aprovar:
        demanda.equipes_participantes.add(solicitacao.equipe)
    EventoDemanda.objects.create(
        demanda=demanda, tipo=EventoDemanda.Tipo.DEMANDA_EDITADA, autor=usuario,
        texto=f"Participação da equipe {solicitacao.equipe.nome} {'aprovada' if aprovar else 'recusada'} por {usuario.nome}.",
    )
    return solicitacao


@transaction.atomic
def editar_demanda(*, demanda: Demanda, usuario, dados: dict) -> Demanda:
    demanda = Demanda.objects.select_for_update().get(pk=demanda.pk)
    if usuario.perfil != "gestor" or demanda.equipe_id != usuario.equipe_id:
        raise PermissionDenied("Somente gestores da equipe podem editar a demanda.")
    if demanda.status in {Demanda.Status.CONCLUIDA, Demanda.Status.CANCELADA}:
        raise ValidationError({"status": "Demandas encerradas não podem ser editadas."})
    versao = dados.pop("atualizada_em", None)
    if versao is not None and versao != demanda.atualizada_em:
        raise PrazoDesatualizado("A demanda foi atualizada por outra pessoa. Recarregue antes de salvar.")
    versao_anterior = demanda.atualizada_em
    mudou = False
    prazo_anterior = demanda.prazo
    marcador = object()
    responsavel = dados.pop("responsavel_id", marcador)
    equipes_ids = dados.pop("equipes_ids", marcador)
    alterados = []
    for campo, valor in dados.items():
        if getattr(demanda, campo) != valor:
            setattr(demanda, campo, valor)
            alterados.append(campo)
    if alterados:
        mudou = True
        demanda.save(update_fields=[*alterados, "atualizada_em"])
        EventoDemanda.objects.create(demanda=demanda, tipo=EventoDemanda.Tipo.DEMANDA_EDITADA, autor=usuario, texto=f"Campos atualizados: {', '.join(alterados)}." + (
            f" Prazo alterado de {timezone.localtime(prazo_anterior):%d/%m/%Y às %H:%M} para {timezone.localtime(demanda.prazo):%d/%m/%Y às %H:%M} (America/Fortaleza)."
            if "prazo" in alterados else ""
        ))
    if responsavel is not marcador and demanda.responsavel_id != (responsavel.id if responsavel else None):
        mudou = True
        anterior = demanda.responsavel.nome if demanda.responsavel_id else "não atribuído"
        status_anterior = demanda.status
        demanda.responsavel = responsavel
        demanda.status = Demanda.Status.PENDENTE
        demanda.save(update_fields=["responsavel", "status", "atualizada_em"])
        if status_anterior != Demanda.Status.PENDENTE:
            EventoDemanda.objects.create(
                demanda=demanda, tipo=EventoDemanda.Tipo.STATUS_ALTERADO, autor=usuario,
                status_anterior=status_anterior, status_novo=Demanda.Status.PENDENTE,
                texto="Atribuição alterada. É necessário o aceite do novo responsável." if responsavel else "Responsável removido. Aguardando nova atribuição.",
            )
        novo = responsavel.nome if responsavel else "não atribuído"
        EventoDemanda.objects.create(demanda=demanda, tipo=EventoDemanda.Tipo.RESPONSAVEL_ALTERADO, autor=usuario, texto=f"Responsável alterado de {anterior} para {novo}.")
    if equipes_ids is not marcador:
        if demanda.equipe_id not in equipes_ids:
            equipes_ids = [*equipes_ids, demanda.equipe_id]
        atuais = set(demanda.equipes_participantes.values_list("id", flat=True))
        novos = set(equipes_ids)
        if atuais != novos:
            mudou = True
            demanda.equipes_participantes.set(equipes_ids)
            EventoDemanda.objects.create(demanda=demanda, tipo=EventoDemanda.Tipo.DEMANDA_EDITADA, autor=usuario, texto="Equipes participantes atualizadas.")
    if mudou:
        demanda.atualizada_em = max(timezone.now(), versao_anterior + timedelta(microseconds=1))
        Demanda.objects.filter(pk=demanda.pk).update(atualizada_em=demanda.atualizada_em)
    return demanda


class PrazoDesatualizado(ValidationError):
    pass


@transaction.atomic
def alterar_prazo_demanda(*, demanda_id: int, usuario, prazo, atualizada_em=None) -> Demanda:
    demanda = Demanda.objects.select_for_update().get(pk=demanda_id)
    if not usuario.equipe_id or not demanda.equipes_participantes.filter(pk=usuario.equipe_id).exists():
        raise Demanda.DoesNotExist
    if usuario.perfil == "inspetor":
        if demanda.responsavel_id != usuario.id:
            raise Demanda.DoesNotExist
    elif usuario.perfil != "gestor":
        raise PermissionDenied("Seu perfil não pode alterar prazos.")
    if demanda.status in {Demanda.Status.CONCLUIDA, Demanda.Status.CANCELADA}:
        raise ValidationError({"prazo": "Demandas encerradas não podem ter o prazo alterado."})
    if atualizada_em is not None and demanda.atualizada_em != atualizada_em:
        raise PrazoDesatualizado("A demanda foi atualizada por outra pessoa. Recarregue antes de salvar o prazo.")
    if demanda.prazo != prazo:
        anterior = timezone.localtime(demanda.prazo).strftime("%d/%m/%Y às %H:%M")
        novo = timezone.localtime(prazo).strftime("%d/%m/%Y às %H:%M")
        demanda.prazo = prazo
        # Mesmo com relógio de baixa resolução, cada edição recebe nova versão.
        demanda.atualizada_em = max(timezone.now(), demanda.atualizada_em + timedelta(microseconds=1))
        # O prazo foi validado pela API e a autorização pela equipe ativa acima.
        # Atualiza somente estes campos, sem revalidar vínculos históricos do
        # criador/responsável contra suas equipes principais atuais.
        Demanda.objects.filter(pk=demanda.pk).update(prazo=prazo, atualizada_em=demanda.atualizada_em)
        EventoDemanda.objects.create(
            demanda=demanda, tipo=EventoDemanda.Tipo.DEMANDA_EDITADA, autor=usuario,
            texto=f"Prazo alterado de {anterior} para {novo} (America/Fortaleza).",
        )
    return demanda
