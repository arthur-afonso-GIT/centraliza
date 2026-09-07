from django.http import JsonResponse
from django.urls import path

from demandas.views import DemandaAnexoDownloadView, DemandaAnexoListView, DemandaAnexoView, DemandaComentarioView, DemandaDetailView, DemandaListView, DemandaStatusView
from agenda.views import CompromissoDetailView, CompromissoListView
from avisos.views import AvisoDetailView, AvisoListView
from usuarios.views import CsrfView, InspetorListView, LoginView, LogoutView, MeView

urlpatterns = [
    path("api/health/", lambda request: JsonResponse({"status": "ok"}), name="health"),
    path("api/auth/csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/usuarios/inspetores/", InspetorListView.as_view(), name="usuarios-inspetores"),
    path("api/demandas/", DemandaListView.as_view(), name="demandas-list"),
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
