from django.core.exceptions import PermissionDenied, ValidationError
from datetime import timedelta

from django.db import transaction
from django.db.models import QuerySet
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import exceptions, generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from demandas.anexos import adicionar_anexo, remover_anexo
from demandas.models import AnexoDemanda, Demanda, EventoDemanda, ImportacaoSei
from demandas.importacao_sei import interpretar_texto_sei
from demandas.identidade_sei import normalizar_numero_sei
from demandas.services import alterar_status_demanda, criar_demanda, editar_demanda
from demandas.serializers import (
    AlterarStatusSerializer, CriarComentarioSerializer, DemandaDetalheSerializer,
    AnexoDemandaSerializer, CamposImportacaoSeiSerializer, CriarImportacaoSeiSerializer,
    DemandaSerializer, EventoDemandaSerializer, GerenciarDemandaSerializer, ImportacaoSeiSerializer,
)


def demandas_permitidas(user):
    if not user.equipe_id:
        raise exceptions.PermissionDenied("O usuário não pertence a uma equipe.")
    queryset = Demanda.objects.filter(equipes_participantes=user.equipe_id).distinct()
    if user.perfil == "inspetor":
        return queryset.filter(responsavel=user)
    if user.perfil == "gestor":
        return queryset
    raise exceptions.PermissionDenied("Perfil sem acesso às demandas.")


def numero_sei_da_consulta(request):
    valor = request.query_params.get("sei_numero")
    if valor is None:
        return None
    if len(valor) > 80:
        raise exceptions.ValidationError({"sei_numero": "Informe no máximo 80 caracteres."})
    normalizado = normalizar_numero_sei(valor)
    if not normalizado:
        raise exceptions.ValidationError({"sei_numero": "Informe ao menos uma letra ou número."})
    return normalizado


class DemandasPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_page_number(self, request, paginator):
        raw = request.query_params.get(self.page_query_param, 1)
        try:
            value = int(raw)
        except (TypeError, ValueError) as exc:
            raise exceptions.ValidationError({"page": "Informe um inteiro positivo."}) from exc
        if value < 1:
            raise exceptions.ValidationError({"page": "Informe um inteiro positivo."})
        return value

    def get_page_size(self, request):
        raw = request.query_params.get(self.page_size_query_param)
        if raw is None:
            return self.page_size
        try:
            value = int(raw)
        except ValueError as exc:
            raise exceptions.ValidationError({"page_size": "Informe um inteiro entre 1 e 50."}) from exc
        if not 1 <= value <= self.max_page_size:
            raise exceptions.ValidationError({"page_size": "Informe um inteiro entre 1 e 50."})
        return value


class DemandaListView(generics.ListAPIView):
    serializer_class = DemandaSerializer
    pagination_class = DemandasPagination
    http_method_names = ["get", "post", "head", "options"]

    def post(self, request):
        serializer = GerenciarDemandaSerializer(data=request.data, context={"request": request})
        serializer.fields["titulo"].required = True
        serializer.fields["prazo"].required = True
        serializer.is_valid(raise_exception=True)
        try:
            demanda = criar_demanda(usuario=request.user, dados=dict(serializer.validated_data))
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        demanda = demandas_permitidas(request.user).select_related("responsavel").prefetch_related("historico__autor").get(pk=demanda.pk)
        return Response(DemandaDetalheSerializer(demanda).data, status=status.HTTP_201_CREATED)

    def get_queryset(self) -> QuerySet[Demanda]:
        user = self.request.user
        queryset = demandas_permitidas(user).filter(
            status__in=[Demanda.Status.PENDENTE, Demanda.Status.EM_ANDAMENTO, Demanda.Status.AGUARDANDO_AVALIACAO, Demanda.Status.EM_CORRECAO],
        ).select_related("responsavel")

        status = self.request.query_params.get("status")
        if status is not None:
            if status not in [Demanda.Status.PENDENTE, Demanda.Status.EM_ANDAMENTO, Demanda.Status.AGUARDANDO_AVALIACAO, Demanda.Status.EM_CORRECAO]:
                raise exceptions.ValidationError({"status": "Informe um status ativo válido."})
            queryset = queryset.filter(status=status)

        critica = self.request.query_params.get("critica")
        if critica is not None:
            if critica not in ["true", "false"]:
                raise exceptions.ValidationError({"critica": "Use true ou false."})
            queryset = queryset.filter(critica=critica == "true")

        responsavel = self.request.query_params.get("responsavel")
        if responsavel is not None:
            if user.perfil != "gestor":
                raise exceptions.PermissionDenied("Somente gestores podem filtrar por responsável.")
            try:
                responsavel_id = int(responsavel)
            except ValueError as exc:
                raise exceptions.ValidationError({"responsavel": "Informe um ID inteiro positivo."}) from exc
            if responsavel_id < 1:
                raise exceptions.ValidationError({"responsavel": "Informe um ID inteiro positivo."})
            queryset = queryset.filter(responsavel_id=responsavel_id, responsavel__equipe_id=user.equipe_id)

        sem_responsavel = self.request.query_params.get("sem_responsavel")
        if sem_responsavel is not None:
            if user.perfil != "gestor":
                raise exceptions.PermissionDenied("Somente gestores podem consultar demandas sem responsável.")
            if sem_responsavel not in ["true", "false"]:
                raise exceptions.ValidationError({"sem_responsavel": "Use true ou false."})
            queryset = queryset.filter(responsavel__isnull=sem_responsavel == "true")

        limites = {}
        for parametro, lookup in (("prazo_de", "prazo__gte"), ("prazo_ate", "prazo__lte")):
            valor = self.request.query_params.get(parametro)
            if valor is not None:
                parsed = parse_date(valor)
                if parsed is None:
                    raise exceptions.ValidationError({parametro: "Informe uma data no formato AAAA-MM-DD."})
                limites[lookup] = parsed
        if limites.get("prazo__gte") and limites.get("prazo__lte") and limites["prazo__gte"] > limites["prazo__lte"]:
            raise exceptions.ValidationError({"prazo_ate": "O fim do período deve ser igual ou posterior ao início."})
        queryset = queryset.filter(**limites)

        atrasada = self.request.query_params.get("atrasada")
        if atrasada is not None:
            if atrasada not in ["true", "false"]:
                raise exceptions.ValidationError({"atrasada": "Use true ou false."})
            hoje = timezone.localdate()
            queryset = queryset.filter(prazo__lt=hoje) if atrasada == "true" else queryset.filter(prazo__gte=hoje)
        sei_numero = numero_sei_da_consulta(self.request)
        if sei_numero:
            queryset = queryset.filter(sei_numero_normalizado__icontains=sei_numero)
        return queryset.order_by("prazo", "id")


class DemandaSeiDuplicidadeView(APIView):
    def get(self, request):
        normalizado = numero_sei_da_consulta(request)
        if normalizado is None:
            raise exceptions.ValidationError({"sei_numero": "Informe o número do processo SEI."})
        queryset = demandas_permitidas(request.user).filter(
            sei_numero_normalizado=normalizado,
        ).order_by("id")[:10]
        return Response({
            "numero_normalizado": normalizado,
            "resultados": [
                {"id": item.id, "titulo": item.titulo, "status": item.status, "sei_numero": item.sei_numero}
                for item in queryset
            ],
        })


def exigir_gestor_importacao(user):
    if user.perfil != "gestor" or not user.equipe_id:
        raise exceptions.PermissionDenied("Somente gestores podem preparar importações do SEI nesta etapa.")


def importacao_sei_permitida(request, pk, *, bloquear=False):
    exigir_gestor_importacao(request.user)
    queryset = ImportacaoSei.objects
    if bloquear:
        queryset = queryset.select_for_update()
    importacao = get_object_or_404(
        queryset, pk=pk, equipe_id=request.user.equipe_id, usuario=request.user,
    )
    if importacao.status in {ImportacaoSei.Status.CONFIRMADA, ImportacaoSei.Status.DESCARTADA}:
        raise exceptions.ValidationError({"detail": "Esta prévia já foi encerrada."})
    if importacao.expira_em <= timezone.now():
        importacao.status = ImportacaoSei.Status.DESCARTADA
        importacao.conteudo_bruto = ""
        importacao.descartada_em = timezone.now()
        importacao.save(update_fields=["status", "conteudo_bruto", "descartada_em"])
        raise exceptions.ValidationError({"detail": "Esta prévia expirou. Cole o texto novamente."})
    return importacao


class ImportacaoSeiListView(APIView):
    def post(self, request):
        exigir_gestor_importacao(request.user)
        serializer = CriarImportacaoSeiSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        texto = serializer.validated_data["texto"]
        campos, avisos, erros = interpretar_texto_sei(texto)
        importacao = ImportacaoSei.objects.create(
            equipe_id=request.user.equipe_id,
            usuario=request.user,
            status=ImportacaoSei.Status.COM_ERROS if erros else ImportacaoSei.Status.VALIDADA,
            conteudo_bruto=texto,
            campos=campos,
            avisos=avisos,
            erros=erros,
            expira_em=timezone.now() + timedelta(hours=24),
        )
        return Response(ImportacaoSeiSerializer(importacao).data, status=status.HTTP_201_CREATED)


class ImportacaoSeiDetailView(APIView):
    def get(self, request, pk):
        return Response(ImportacaoSeiSerializer(importacao_sei_permitida(request, pk)).data)

    def patch(self, request, pk):
        importacao = importacao_sei_permitida(request, pk)
        serializer = CamposImportacaoSeiSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        campos = {**importacao.campos}
        for campo, valor in serializer.validated_data.items():
            campos[campo] = valor.isoformat() if hasattr(valor, "isoformat") else valor
        completo = CamposImportacaoSeiSerializer(data=campos)
        completo.is_valid(raise_exception=True)
        importacao.campos = campos
        importacao.erros = []
        importacao.avisos = [] if campos.get("assunto") else ["Assunto ou especificação não identificado; informe um título na confirmação."]
        importacao.status = ImportacaoSei.Status.VALIDADA
        importacao.save(update_fields=["campos", "erros", "avisos", "status"])
        return Response(ImportacaoSeiSerializer(importacao).data)

    def delete(self, request, pk):
        importacao = importacao_sei_permitida(request, pk)
        importacao.status = ImportacaoSei.Status.DESCARTADA
        importacao.conteudo_bruto = ""
        importacao.descartada_em = timezone.now()
        importacao.save(update_fields=["status", "conteudo_bruto", "descartada_em"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ImportacaoSeiConfirmarView(APIView):
    @transaction.atomic
    def post(self, request, pk):
        importacao = importacao_sei_permitida(request, pk, bloquear=True)
        if importacao.status != ImportacaoSei.Status.VALIDADA:
            raise exceptions.ValidationError({"detail": "Corrija os erros da prévia antes de confirmar."})
        serializer = GerenciarDemandaSerializer(data=request.data, context={"request": request})
        serializer.fields["titulo"].required = True
        serializer.fields["prazo"].required = True
        serializer.is_valid(raise_exception=True)
        dados = dict(serializer.validated_data)
        dados["sei_numero"] = str(importacao.campos["sei_numero"])
        try:
            demanda = criar_demanda(usuario=request.user, dados=dados)
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        importacao.status = ImportacaoSei.Status.CONFIRMADA
        importacao.demanda = demanda
        importacao.conteudo_bruto = ""
        importacao.confirmada_em = timezone.now()
        importacao.save(update_fields=["status", "demanda", "conteudo_bruto", "confirmada_em"])
        demanda = demandas_permitidas(request.user).select_related("responsavel").prefetch_related("historico__autor").get(pk=demanda.pk)
        return Response(DemandaDetalheSerializer(demanda).data, status=status.HTTP_201_CREATED)


class DemandaDetailView(generics.RetrieveAPIView):
    serializer_class = DemandaDetalheSerializer

    def get_queryset(self):
        return demandas_permitidas(self.request.user).select_related("responsavel").prefetch_related("historico__autor")

    def patch(self, request, pk):
        demanda = get_object_or_404(demandas_permitidas(request.user).select_related("responsavel"), pk=pk)
        serializer = GerenciarDemandaSerializer(data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        try:
            editar_demanda(demanda=demanda, usuario=request.user, dados=dict(serializer.validated_data))
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        except ValidationError as exc:
            raise exceptions.ValidationError(exc.message_dict) from exc
        return Response(DemandaDetalheSerializer(self.get_queryset().get(pk=pk)).data)


class DemandaStatusView(APIView):
    def patch(self, request, pk):
        serializer = AlterarStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            demanda = alterar_status_demanda(
                demanda_id=pk, usuario=request.user,
                novo_status=serializer.validated_data["status"],
                texto=serializer.validated_data.get("texto", ""),
            )
        except Demanda.DoesNotExist:
            raise exceptions.NotFound() from None
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        except ValidationError as exc:
            raise exceptions.ValidationError(exc.message_dict) from exc
        demanda = demandas_permitidas(request.user).select_related("responsavel").prefetch_related("historico__autor").get(pk=pk)
        return Response(DemandaDetalheSerializer(demanda).data)


class DemandaComentarioView(APIView):
    def post(self, request, pk):
        demanda = get_object_or_404(demandas_permitidas(request.user), pk=pk)
        serializer = CriarComentarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        evento = EventoDemanda.objects.create(
            demanda=demanda, tipo=EventoDemanda.Tipo.COMENTARIO,
            autor=request.user, texto=serializer.validated_data["texto"],
        )
        return Response(EventoDemandaSerializer(evento).data, status=status.HTTP_201_CREATED)


class DemandaAnexoListView(APIView):
    def get_demanda(self, request, pk):
        return get_object_or_404(demandas_permitidas(request.user), pk=pk)

    def get(self, request, pk):
        demanda = self.get_demanda(request, pk)
        anexos = demanda.anexos.filter(removido_em__isnull=True).select_related("autor")
        return Response({"resultados": AnexoDemandaSerializer(anexos, many=True).data})

    def post(self, request, pk):
        demanda = self.get_demanda(request, pk)
        arquivo = request.FILES.get("arquivo")
        if arquivo is None:
            raise exceptions.ValidationError({"arquivo": "Selecione um arquivo."})
        try:
            anexo = adicionar_anexo(demanda=demanda, usuario=request.user, arquivo=arquivo)
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        except ValidationError as exc:
            raise exceptions.ValidationError(exc.message_dict) from exc
        return Response(AnexoDemandaSerializer(anexo).data, status=status.HTTP_201_CREATED)


class DemandaAnexoView(APIView):
    def get_anexo(self, request, pk, anexo_id):
        demanda = get_object_or_404(demandas_permitidas(request.user), pk=pk)
        return get_object_or_404(AnexoDemanda.objects.select_related("demanda", "autor"), pk=anexo_id, demanda=demanda, removido_em__isnull=True)

    def delete(self, request, pk, anexo_id):
        anexo = self.get_anexo(request, pk, anexo_id)
        try:
            remover_anexo(anexo=anexo, usuario=request.user)
        except PermissionDenied as exc:
            raise exceptions.PermissionDenied(str(exc)) from exc
        return Response(status=status.HTTP_204_NO_CONTENT)


class DemandaAnexoDownloadView(DemandaAnexoView):
    def get(self, request, pk, anexo_id):
        anexo = self.get_anexo(request, pk, anexo_id)
        response = FileResponse(anexo.arquivo.open("rb"), as_attachment=True, filename=anexo.nome_original, content_type=anexo.mime_type)
        response["X-Content-Type-Options"] = "nosniff"
        return response
