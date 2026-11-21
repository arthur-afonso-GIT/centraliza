import os

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from usuarios.models import Equipe, Usuario, VinculoEquipe


class Command(BaseCommand):
    help = "Cria o primeiro gestor e sua equipe quando as variáveis de bootstrap estão definidas."

    @transaction.atomic
    def handle(self, *args, **options):
        username = os.getenv("CENTRALIZA_BOOTSTRAP_USERNAME", "").strip()
        password = os.getenv("CENTRALIZA_BOOTSTRAP_PASSWORD", "")
        team_name = os.getenv("CENTRALIZA_BOOTSTRAP_TEAM_NAME", "Equipe VISAT").strip()

        if not username and not password:
            self.stdout.write("Bootstrap do gestor não configurado; seguindo sem alterações.")
            return
        if not username or not password:
            raise CommandError("Defina CENTRALIZA_BOOTSTRAP_USERNAME e CENTRALIZA_BOOTSTRAP_PASSWORD juntos.")
        if len(password) < 12 or password.casefold() == username.casefold():
            raise CommandError("A senha inicial deve ter pelo menos 12 caracteres e diferir do usuário.")
        if not team_name:
            raise CommandError("O nome da equipe inicial não pode ficar vazio.")

        existing = Usuario.objects.filter(username=username).first()
        if existing:
            has_admin_link = VinculoEquipe.objects.filter(
                usuario=existing, equipe=existing.equipe, papel=VinculoEquipe.Papel.GESTOR,
                pode_administrar=True, ativo=True,
            ).exists()
            if existing.perfil != Usuario.Perfil.GESTOR or not existing.pode_administrar_equipe or not has_admin_link:
                raise CommandError("O usuário inicial já existe sem permissão de gestor administrador.")
            self.stdout.write("Gestor inicial já existe; senha preservada.")
            return
        if Usuario.objects.exists():
            raise CommandError("Já existem contas; crie novos gestores pelo fluxo de administração da equipe.")

        equipe, _ = Equipe.objects.get_or_create(nome=team_name)
        usuario = Usuario(username=username, perfil=Usuario.Perfil.GESTOR, equipe=equipe, pode_administrar_equipe=True)
        try:
            usuario.full_clean(exclude=["password"])
        except ValidationError as exc:
            raise CommandError(f"Dados do gestor inicial inválidos: {exc}") from exc
        usuario.set_password(password)
        usuario.save()
        VinculoEquipe.objects.create(
            usuario=usuario, equipe=equipe, papel=VinculoEquipe.Papel.GESTOR,
            pode_administrar=True, ativo=True,
        )
        self.stdout.write(self.style.SUCCESS("Gestor inicial e equipe criados."))
