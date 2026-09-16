from django.utils.functional import SimpleLazyObject


class EquipeAtivaMiddleware:
    """Applies the authenticated user's selected active team to the request."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = request.user
        if user.is_authenticated:
            selected = request.session.get("equipe_ativa_id")
            memberships = user.vinculos_equipe.filter(ativo=True).select_related("equipe")
            membership = memberships.filter(equipe_id=selected).first() if selected else None
            if membership is None:
                membership = memberships.first()
                if membership:
                    request.session["equipe_ativa_id"] = membership.equipe_id
            if membership:
                user.equipe_id = membership.equipe_id
                user._state.fields_cache["equipe"] = membership.equipe
                user.perfil = membership.papel
                user.pode_administrar_equipe = membership.pode_administrar
        return self.get_response(request)
