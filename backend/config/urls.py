from django.http import JsonResponse
from django.urls import path

from demandas.views import DemandaAnexoDownloadView, DemandaAnexoListView, DemandaAnexoView, DemandaComentarioView, DemandaDetailView, DemandaListView, DemandaSeiDuplicidadeView, DemandaStatusView, ImportacaoSeiConfirmarView, ImportacaoSeiDetailView, ImportacaoSeiListView
from agenda.views import CompromissoDetailView, CompromissoListView
from avisos.views import AvisoDetailView, AvisoListView
from usuarios.views import CsrfView, EquipeDetailView, InspetorListView, LoginView, LogoutView, MeView, MembroEquipeDetailView, MembroEquipeListView

urlpatterns = [
    path("api/health/", lambda request: JsonResponse({"status": "ok"}), name="health"),
    path("api/auth/csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/usuarios/inspetores/", InspetorListView.as_view(), name="usuarios-inspetores"),
    path("api/equipe/", EquipeDetailView.as_view(), name="equipe-detail"),
    path("api/equipe/usuarios/", MembroEquipeListView.as_view(), name="equipe-usuarios-list"),
    path("api/equipe/usuarios/<int:pk>/", MembroEquipeDetailView.as_view(), name="equipe-usuarios-detail"),
    path("api/demandas/", DemandaListView.as_view(), name="demandas-list"),
    path("api/demandas/verificar-sei/", DemandaSeiDuplicidadeView.as_view(), name="demandas-verificar-sei"),
    path("api/importacoes/sei/", ImportacaoSeiListView.as_view(), name="importacoes-sei-list"),
    path("api/importacoes/sei/<int:pk>/", ImportacaoSeiDetailView.as_view(), name="importacoes-sei-detail"),
    path("api/importacoes/sei/<int:pk>/confirmar/", ImportacaoSeiConfirmarView.as_view(), name="importacoes-sei-confirmar"),
    path("api/demandas/<int:pk>/", DemandaDetailView.as_view(), name="demandas-detail"),
    path("api/demandas/<int:pk>/status/", DemandaStatusView.as_view(), name="demandas-status"),
    path("api/demandas/<int:pk>/historico/", DemandaComentarioView.as_view(), name="demandas-historico"),
    path("api/demandas/<int:pk>/anexos/", DemandaAnexoListView.as_view(), name="demandas-anexos"),
    path("api/demandas/<int:pk>/anexos/<int:anexo_id>/", DemandaAnexoView.as_view(), name="demandas-anexo"),
    path("api/demandas/<int:pk>/anexos/<int:anexo_id>/download/", DemandaAnexoDownloadView.as_view(), name="demandas-anexo-download"),
    path("api/compromissos/", CompromissoListView.as_view(), name="compromissos-list"),
    path("api/compromissos/<int:pk>/", CompromissoDetailView.as_view(), name="compromissos-detail"),
    path("api/avisos/", AvisoListView.as_view(), name="avisos-list"),
    path("api/avisos/<int:pk>/", AvisoDetailView.as_view(), name="avisos-detail"),
]
