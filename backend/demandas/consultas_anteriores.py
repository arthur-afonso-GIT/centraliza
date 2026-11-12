from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from demandas.models import AnexoDemanda, ConsultaAnteriorDemanda
from demandas.serializers import AnexoDemandaSerializer, DemandaDetalheSerializer


def preservar_consulta(demanda):
    """Chamado sob o bloqueio da demanda, antes de qualquer edição da transferência."""
    if not demanda.responsavel_id:
        return
    ConsultaAnteriorDemanda.objects.update_or_create(
        demanda=demanda, usuario_id=demanda.responsavel_id,
        defaults={
            "equipe_id": demanda.equipe_id,
            "encerrada_em": timezone.now(),
            "sei_numero_normalizado": demanda.sei_numero_normalizado,
            "dados": DemandaDetalheSerializer(demanda).data,
            "anexos": AnexoDemandaSerializer(
                demanda.anexos.filter(removido_em__isnull=True).select_related("autor"), many=True,
            ).data,
        },
    )


def consultas_permitidas(usuario):
    if usuario.perfil != "inspetor" or not usuario.equipe_id:
        raise PermissionDenied("Consulta anterior disponível somente para inspetores vinculados a uma equipe.")
    # Compatibilidade com contas legadas sem vínculos: seguem a equipe principal.
    # Havendo vínculos cadastrados, a revogação não pode cair nesse fallback.
    if usuario.vinculos_equipe.exists() and not usuario.vinculos_equipe.filter(
        equipe_id=usuario.equipe_id, ativo=True, papel="inspetor",
    ).exists():
        return ConsultaAnteriorDemanda.objects.none()
    return ConsultaAnteriorDemanda.objects.filter(
        usuario=usuario, equipe_id=usuario.equipe_id, equipe__arquivada=False,
        demanda__equipes_participantes=usuario.equipe_id,
    ).exclude(demanda__responsavel=usuario).distinct()


def detalhe_anterior(consulta):
    return {**consulta.dados, "somente_leitura": True, "consulta_encerrada_em": consulta.encerrada_em}


def anexos_anteriores(consulta):
    # A remoção revoga o download; nenhum metadado posterior é devolvido.
    ids = [item["id"] for item in consulta.anexos]
    ativos = set(AnexoDemanda.objects.filter(
        demanda_id=consulta.demanda_id, id__in=ids, removido_em__isnull=True,
    ).values_list("id", flat=True))
    return [item for item in consulta.anexos if item["id"] in ativos]
