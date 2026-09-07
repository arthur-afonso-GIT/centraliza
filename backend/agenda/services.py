from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from agenda.models import Compromisso


class ConflitoAgenda(Exception):
    def __init__(self, compromissos):
        self.compromissos = compromissos


def exigir_gestor(usuario):
    if usuario.perfil != "gestor" or not usuario.equipe_id:
        raise PermissionDenied("Somente gestores podem gerenciar compromissos.")


def validar_intervalo(inicio, fim):
    if inicio is None or fim is None or fim <= inicio:
        raise ValidationError({"fim": "O fim deve ser posterior ao início."})


def buscar_conflitos(*, equipe_id, participantes, inicio, fim, ignorar_id=None):
    ids = [participante.id for participante in participantes]
    queryset = Compromisso.objects.filter(
        equipe_id=equipe_id, cancelado_em__isnull=True, participantes__id__in=ids,
        inicio__lt=fim, fim__gt=inicio,
    ).exclude(pk=ignorar_id).distinct().order_by("inicio", "id")
    return list(queryset)


@transaction.atomic
def salvar_compromisso(*, usuario, dados, compromisso=None):
    exigir_gestor(usuario)
    atual = compromisso
    if atual and atual.cancelado_em:
        raise ValidationError({"detail": "Um compromisso cancelado não pode ser editado."})
    inicio = dados.get("inicio", atual.inicio if atual else None)
    fim = dados.get("fim", atual.fim if atual else None)
    participantes = dados.get("participantes", list(atual.participantes.all()) if atual else [])
    validar_intervalo(inicio, fim)
    conflitos = buscar_conflitos(
        equipe_id=usuario.equipe_id, participantes=participantes, inicio=inicio, fim=fim,
        ignorar_id=atual.id if atual else None,
    )
    if conflitos:
        raise ConflitoAgenda(conflitos)
    if atual is None:
        atual = Compromisso(equipe_id=usuario.equipe_id, criador=usuario)
    for campo in ("titulo", "descricao", "tipo", "inicio", "fim", "demanda"):
        if campo in dados:
            setattr(atual, campo, dados[campo])
    atual.save()
    atual.participantes.set(participantes)
    return atual


@transaction.atomic
def cancelar_compromisso(*, compromisso, usuario):
    exigir_gestor(usuario)
    if compromisso.cancelado_em:
        raise ValidationError({"detail": "O compromisso já foi cancelado."})
    compromisso.cancelado_em = timezone.now()
    compromisso.cancelado_por = usuario
    compromisso.save(update_fields=["cancelado_em", "cancelado_por", "atualizado_em"])
    return compromisso
