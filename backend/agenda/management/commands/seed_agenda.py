from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from agenda.models import Compromisso
from usuarios.models import Usuario


class Command(BaseCommand):
    help = "Prepara compromissos fictícios para validar dia, semana e mês."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("A carga fictícia só pode ser executada em desenvolvimento.")
        zone = ZoneInfo("America/Fortaleza")
        for equipe_numero in (1, 2):
            try:
                gestor = Usuario.objects.get(username=f"demo.gestor.{equipe_numero}")
                inspetor = Usuario.objects.get(username=f"demo.inspetor.{equipe_numero}")
                segundo = Usuario.objects.get(username=f"demo.inspetor2.{equipe_numero}")
            except Usuario.DoesNotExist as exc:
                raise CommandError("Execute seed_demo antes de seed_agenda.") from exc
            base = datetime(2026, 9, 21, 8, tzinfo=zone)
            specs = [
                ("Reunião de alinhamento", "reuniao", 0, 1, [inspetor, segundo]),
                ("Inspeção programada", "atividade", 1, 3, [inspetor]),
                ("Discussão de caso", "reuniao", 2, 6, [segundo]),
                ("Visita técnica", "atividade", 4, 2, [inspetor, segundo]),
                ("Plantão noturno", "atividade", 5, 15, [inspetor]),
                ("Planejamento mensal", "reuniao", 9, 1, [inspetor, segundo]),
            ]
            for indice, (titulo, tipo, dias, hora, participantes) in enumerate(specs):
                inicio = base + timedelta(days=dias, hours=hora)
                duracao = timedelta(hours=10 if titulo == "Plantão noturno" else 1)
                compromisso, _ = Compromisso.objects.get_or_create(
                    referencia_demo=f"agenda-v1-{equipe_numero}-{indice}",
                    defaults={
                        "titulo": titulo, "descricao": "Compromisso fictício para validação da agenda.",
                        "tipo": tipo, "inicio": inicio, "fim": inicio + duracao,
                        "equipe": gestor.equipe, "criador": gestor,
                    },
                )
                compromisso.participantes.set(participantes)
        self.stdout.write(self.style.SUCCESS("Agenda fictícia preparada: 12 compromissos."))
