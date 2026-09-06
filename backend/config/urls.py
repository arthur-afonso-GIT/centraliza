from django.http import JsonResponse
from django.urls import path

from demandas.views import DemandaListView
from usuarios.views import CsrfView, LoginView, LogoutView, MeView

urlpatterns = [
    path("api/health/", lambda request: JsonResponse({"status": "ok"}), name="health"),
    path("api/auth/csrf/", CsrfView.as_view(), name="auth-csrf"),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/demandas/", DemandaListView.as_view(), name="demandas-list"),
]
