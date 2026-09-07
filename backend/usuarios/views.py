from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from usuarios.models import Usuario


class CsrfView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Credenciais inválidas."}, status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        return Response({"id": user.id, "nome": user.nome, "perfil": user.perfil})


class MeView(APIView):
    def get(self, request):
        user = request.user
        return Response({"id": user.id, "nome": user.nome, "perfil": user.perfil})


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class InspetorListView(APIView):
    def get(self, request):
        user = request.user
        if user.perfil != "gestor" or not user.equipe_id:
            return Response({"detail": "Somente gestores podem consultar inspetores."}, status=status.HTTP_403_FORBIDDEN)
        inspetores = Usuario.objects.filter(
            equipe_id=user.equipe_id, perfil="inspetor", is_active=True,
        ).order_by("first_name", "last_name", "username", "id")
        return Response({"resultados": [{"id": item.id, "nome": item.nome} for item in inspetores]})
