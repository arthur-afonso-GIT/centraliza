from rest_framework.authentication import SessionAuthentication as DRFSessionAuthentication


class SessionAuthentication(DRFSessionAuthentication):
    def authenticate_header(self, request):
        # Identifica ausência de sessão como 401, preservando 403 para CSRF/permissão.
        return "Session"
