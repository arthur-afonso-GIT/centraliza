import os
from datetime import date, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from demandas.models import Demanda
from usuarios.models import Equipe, Usuario


class Command(BaseCommand):
    help = "Prepara contas e demandas fictícias sem apagar registros existentes."

    def add_arguments(self, parser):
        parser.add_argument("--total", type=int, choices=[30, 1000], default=30)

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("A carga fictícia só pode ser executada em desenvolvimento.")
        password = os.environ.get("CENTRALIZA_DEMO_PASSWORD")
        if not password or len(password) < 12:
            raise CommandError("Defina CENTRALIZA_DEMO_PASSWORD com pelo menos 12 caracteres.")
        equipes = [Equipe.objects.get_or_create(nome=f"VISAT Demonstração {i}")[0] for i in (1, 2)]
        contas = []
        for i, equipe in enumerate(equipes, 1):
            usuarios = []
            for perfil, sufixo in [("gestor", "gestor"), ("inspetor", "inspetor"), ("inspetor", "inspetor2")]:
                username = f"demo.{sufixo}.{i}"
                user, created = Usuario.objects.get_or_create(username=username, defaults={"perfil": perfil, "equipe": equipe, "first_name": f"{sufixo.capitalize()} de teste {i}"})
                if not created and (user.equipe_id != equipe.id or user.perfil != perfil):
                    raise CommandError(f"Conta {username} possui configuração diferente; nenhuma alteração aplicada.")
                if created:
                    user.set_password(password)
                    user.save()
                usuarios.append(user)
            contas.append(usuarios)
        for i in range(options["total"]):
            grupo = i % 2
            gestor, inspetor, segundo = contas[grupo]
            Demanda.objects.get_or_create(referencia_demo=f"seed-v1-{i:04d}", defaults={
                "titulo": f"Inspeção demonstrativa {i + 1:04d}",
                "descricao": "Registro fictício para desenvolvimento e validação da listagem.",
                "status": ["pendente", "em_andamento", "concluida", "cancelada"][(i // 2) % 4],
                "prioridade": ["baixa", "media", "alta"][i % 3],
                "prazo": date(2026, 9, 7) + timedelta(days=i % 30),
                "critica": i % 3 == 0,
                "equipe": equipes[grupo], "criador": gestor,
                "responsavel": None if i % 5 == 0 else inspetor if i % 3 else segundo,
            })
        self.stdout.write(self.style.SUCCESS(f"Carga preparada: {options['total']} referências fictícias; registros anteriores preservados."))
