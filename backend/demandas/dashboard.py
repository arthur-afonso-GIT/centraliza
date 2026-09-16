from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import exceptions
from rest_framework.response import Response
from rest_framework.views import APIView

from agenda.models import Compromisso
from agenda.serializers import CompromissoSerializer
from avisos.models import Aviso
from avisos.serializers import AvisoFeedSerializer
from demandas.models import Demanda
from demandas.serializers import DemandaSerializer
from demandas.views import demandas_permitidas
from usuarios.models import Usuario


STATUS_ATIVOS = (
    Demanda.Status.PENDENTE,
    Demanda.Status.EM_ANDAMENTO,
    Demanda.Status.AGUARDANDO_AVALIACAO,
    Demanda.Status.EM_CORRECAO,
)


class ResumoHomeView(APIView):
    def get(self, request):
        user = request.user
        if not user.equipe_id or user.perfil not in {Usuario.Perfil.GESTOR, Usuario.Perfil.INSPETOR}:
            raise exceptions.PermissionDenied("Sua conta não possui acesso a uma equipe.")
        hoje = timezone.localdate()
        agora = timezone.now()
        demandas = demandas_permitidas(user).filter(status__in=STATUS_ATIVOS)
        base = {
            "perfil": user.perfil,
            "gerado_em": agora,
            "indicadores": {
                "atrasadas": demandas.filter(prazo__lt=hoje).count(),
                "criticas": demandas.filter(critica=True).count(),
            },
        }
        if user.perfil == Usuario.Perfil.GESTOR:
            base["indicadores"].update({
                "sem_responsavel": demandas.filter(responsavel__isnull=True).count(),
                "aguardando_avaliacao": demandas.filter(status=Demanda.Status.AGUARDANDO_AVALIACAO).count(),
            })
            carga = Usuario.objects.filter(
                equipe_id=user.equipe_id, perfil=Usuario.Perfil.INSPETOR, is_active=True,
            ).annotate(
                total=Count("demandas_atribuidas", filter=Q(demandas_atribuidas__status__in=STATUS_ATIVOS)),
            ).order_by("first_name", "last_name", "username", "id")
            base["carga_inspetores"] = [{"id": item.id, "nome": item.nome, "total": item.total} for item in carga]
        else:
            base["indicadores"].update({
                "em_correcao": demandas.filter(status=Demanda.Status.EM_CORRECAO).count(),
                "nao_iniciadas": demandas.filter(status=Demanda.Status.PENDENTE).count(),
            })
        base["proximas_demandas"] = DemandaSerializer(
            demandas.select_related("responsavel").order_by("prazo", "id")[:5], many=True,
        ).data
        compromissos = Compromisso.objects.filter(
            equipe_id=user.equipe_id, cancelado_em__isnull=True, inicio__gte=agora, inicio__lt=agora + timedelta(days=14),
        ).prefetch_related("participantes")
        if user.perfil == Usuario.Perfil.INSPETOR:
            compromissos = compromissos.filter(participantes=user)
        base["proximos_compromissos"] = CompromissoSerializer(compromissos.order_by("inicio", "id").distinct()[:5], many=True).data
        avisos = Aviso.objects.filter(
            equipe_id=user.equipe_id, cancelado_em__isnull=True, publicado_em__lte=agora,
        ).filter(Q(expira_em__isnull=True) | Q(expira_em__gt=agora)).select_related("autor").prefetch_related("destinatarios")
        if user.perfil == Usuario.Perfil.INSPETOR:
            avisos = avisos.filter(Q(destinatarios=user) | Q(destinatarios__isnull=True))
        base["avisos_ativos"] = AvisoFeedSerializer(avisos.order_by("-publicado_em", "-id").distinct()[:3], many=True).data
        return Response(base)
