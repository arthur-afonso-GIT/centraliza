from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from avisos.models import Aviso
from usuarios.models import Usuario


class Command(BaseCommand):
    help = "Prepara avisos fictícios para validar o feed e o detalhe."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("A carga fictícia só pode ser executada em desenvolvimento.")
        zone = ZoneInfo("America/Fortaleza")
        base = datetime(2026, 10, 1, 9, tzinfo=zone)
        specs = [
            ("Plantão extraordinário", "Mudança na escala desta sexta-feira.", "Consulte a nova escala e confirme sua disponibilidade com a gestão.", "urgente", 0),
            ("Atualização de procedimento", "Novo roteiro disponível para inspeções.", "O roteiro revisado deve ser usado nas próximas atividades externas.", "informativo", 1),
            ("Prazo para relatórios", "Relatórios pendentes devem ser enviados até quinta-feira.", "Revise suas demandas em andamento e envie os registros dentro do prazo.", "urgente", 2),
            ("Reunião mensal", "A pauta da reunião mensal foi publicada.", "A reunião tratará dos resultados do mês e das prioridades seguintes.", "informativo", 3),
        ]
        for equipe_numero in (1, 2):
            try:
                gestor = Usuario.objects.get(username=f"demo.gestor.{equipe_numero}")
            except Usuario.DoesNotExist as exc:
                raise CommandError("Execute seed_demo antes de seed_avisos.") from exc
            for indice, (titulo, resumo, conteudo, categoria, horas) in enumerate(specs):
                Aviso.objects.update_or_create(
                    referencia_demo=f"avisos-v1-{equipe_numero}-{indice}",
                    defaults={
                        "titulo": titulo,
                        "resumo": resumo,
                        "conteudo": conteudo,
                        "categoria": categoria,
                        "equipe": gestor.equipe,
                        "autor": gestor,
                        "publicado_em": base - timedelta(hours=horas),
                    },
                )
        self.stdout.write(self.style.SUCCESS("Avisos fictícios preparados: 8 avisos."))
