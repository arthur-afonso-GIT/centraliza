from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from demandas.models import Demanda, EventoDemanda


@transaction.atomic
def alterar_prioridade(*, demanda_id, usuario, prioridade):
    demanda = Demanda.objects.select_for_update().get(pk=demanda_id)
    if not usuario.equipe_id or not demanda.equipes_participantes.filter(pk=usuario.equipe_id).exists():
        raise Demanda.DoesNotExist
    if usuario.perfil != "inspetor" or demanda.responsavel_id != usuario.id:
        raise PermissionDenied("Somente o inspetor responsável pode alterar a prioridade por esta ação.")
    if demanda.status in {Demanda.Status.CONCLUIDA, Demanda.Status.CANCELADA}:
        raise ValidationError({"prioridade": "Demandas encerradas não permitem alterar a prioridade."})
    if prioridade not in Demanda.Prioridade.values:
        raise ValidationError({"prioridade": "Selecione uma prioridade válida."})
    if demanda.prioridade != prioridade:
        anterior = demanda.get_prioridade_display()
        demanda.prioridade = prioridade
        demanda.save(update_fields=["prioridade", "atualizada_em"])
        EventoDemanda.objects.create(
            demanda=demanda, autor=usuario, tipo=EventoDemanda.Tipo.DEMANDA_EDITADA,
            texto=f"Prioridade alterada de {anterior} para {demanda.get_prioridade_display()}.",
        )
    return demanda
