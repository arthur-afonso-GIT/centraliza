from django.urls import path
from django.http import JsonResponse

urlpatterns = [path("api/health/", lambda request: JsonResponse({"status": "ok"}))]
