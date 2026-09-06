import statistics
import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext

from demandas.models import Demanda
from usuarios.models import Usuario


class Command(BaseCommand):
    help = "Mede localmente a listagem paginada de demandas com uma conta gestora fictícia."

    def add_arguments(self, parser):
        parser.add_argument("--requests", type=int, default=30)
        parser.add_argument("--warmup", type=int, default=5)
        parser.add_argument("--username", default="demo.gestor.1")

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("O benchmark só pode ser executado em desenvolvimento.")
        if options["requests"] < 1 or options["warmup"] < 0:
            raise CommandError("Use requests maior que zero e warmup não negativo.")
        try:
            user = Usuario.objects.get(username=options["username"], perfil="gestor")
        except Usuario.DoesNotExist as exc:
            raise CommandError("Execute seed_demo antes do benchmark.") from exc

        client = Client()
        client.force_login(user)
        path = "/api/demandas/?status=pendente&page=1&page_size=20"
        for _ in range(options["warmup"]):
            client.get(path)

        durations = []
        query_counts = []
        for _ in range(options["requests"]):
            started = time.perf_counter()
            with CaptureQueriesContext(connection) as captured:
                response = client.get(path)
            durations.append((time.perf_counter() - started) * 1000)
            query_counts.append(len(captured))
            if response.status_code != 200:
                raise CommandError(f"A API respondeu {response.status_code} durante a medição.")

        ordered = sorted(durations)
        p95 = ordered[max(0, int(len(ordered) * 0.95 + 0.9999) - 1)]
        self.stdout.write(f"registros={Demanda.objects.count()}")
        self.stdout.write(f"visiveis_filtrados={response.data['count']}")
        self.stdout.write(f"requisicoes={len(durations)} aquecimento={options['warmup']}")
        self.stdout.write(f"media_ms={statistics.mean(durations):.2f} p95_ms={p95:.2f} max_ms={max(durations):.2f}")
        self.stdout.write(f"consultas_por_requisicao={min(query_counts)}-{max(query_counts)}")
