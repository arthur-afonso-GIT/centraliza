from dataclasses import dataclass

from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from demandas.models import Demanda, EventoDemanda


@dataclass(frozen=True)
class RegraTransicao:
    perfil: str
    exige_texto: bool = False


REGRAS = {
    (Demanda.Status.PENDENTE, Demanda.Status.EM_ANDAMENTO): RegraTransicao("inspetor"),
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
    anterior = demanda.status
    demanda.status = novo_status
    demanda.save(update_fields=["status", "atualizada_em"])
    EventoDemanda.objects.create(
        demanda=demanda, tipo=EventoDemanda.Tipo.STATUS_ALTERADO, autor=usuario,
        status_anterior=anterior, status_novo=novo_status, texto=texto,
    )
    return demanda
