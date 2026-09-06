from datetime import datetime, timedelta
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

from agenda.models import Compromisso
from usuarios.models import Equipe, Usuario


class CompromissoModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe agenda")
        cls.outra = Equipe.objects.create(nome="Outra equipe agenda")
        cls.gestor = Usuario.objects.create_user(username="gestor.agenda", perfil="gestor", equipe=cls.equipe)
        cls.gestor_externo = Usuario.objects.create_user(username="gestor.agenda.externo", perfil="gestor", equipe=cls.outra)
        cls.inicio = datetime(2026, 9, 21, 9, tzinfo=ZoneInfo("America/Fortaleza"))

    def test_exige_fim_posterior_ao_inicio(self):
        with self.assertRaises(ValidationError):
            Compromisso.objects.create(
                titulo="Inválido", tipo="reuniao", inicio=self.inicio, fim=self.inicio,
                equipe=self.equipe, criador=self.gestor,
            )

    def test_exige_criador_da_mesma_equipe(self):
        with self.assertRaises(ValidationError):
            Compromisso.objects.create(
                titulo="Equipe inválida", tipo="atividade", inicio=self.inicio,
                fim=self.inicio + timedelta(hours=1), equipe=self.equipe, criador=self.gestor_externo,
            )

    def test_aceita_intervalo_consciente_valido(self):
        compromisso = Compromisso.objects.create(
            titulo="Reunião válida", tipo="reuniao", inicio=self.inicio,
            fim=self.inicio + timedelta(hours=1), equipe=self.equipe, criador=self.gestor,
        )
        self.assertTrue(compromisso.inicio.tzinfo is not None)


class CompromissoListagemTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe API agenda")
        cls.outra = Equipe.objects.create(nome="Outra equipe API agenda")
        cls.gestor = Usuario.objects.create_user(username="gestor.api.agenda", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.api.agenda", perfil="inspetor", equipe=cls.equipe)
        cls.segundo = Usuario.objects.create_user(username="segundo.api.agenda", perfil="inspetor", equipe=cls.equipe)
        cls.gestor_externo = Usuario.objects.create_user(username="externo.api.agenda", perfil="gestor", equipe=cls.outra)
        zone = ZoneInfo("America/Fortaleza")
        cls.inicio = datetime(2026, 9, 21, tzinfo=zone)
        cls.criar("Dentro", cls.inicio + timedelta(hours=9), cls.inicio + timedelta(hours=10), cls.equipe, cls.gestor, [cls.inspetor])
        cls.criar("Atravessa início", cls.inicio - timedelta(hours=1), cls.inicio + timedelta(hours=1), cls.equipe, cls.gestor, [cls.segundo])
        cls.criar("Termina no início", cls.inicio - timedelta(hours=2), cls.inicio, cls.equipe, cls.gestor, [cls.inspetor])
        cls.criar("Começa no fim", cls.inicio + timedelta(days=1), cls.inicio + timedelta(days=1, hours=1), cls.equipe, cls.gestor, [cls.inspetor])
        cls.criar("Outra equipe", cls.inicio + timedelta(hours=8), cls.inicio + timedelta(hours=9), cls.outra, cls.gestor_externo, [])

    @classmethod
    def criar(cls, titulo, inicio, fim, equipe, criador, participantes):
        compromisso = Compromisso.objects.create(titulo=titulo, tipo="reuniao", inicio=inicio, fim=fim, equipe=equipe, criador=criador)
        compromisso.participantes.set(participantes)

    def url(self, inicio=None, fim=None):
        params = {"inicio": (inicio or self.inicio).isoformat(), "fim": (fim or self.inicio + timedelta(days=1)).isoformat()}
        return f"/api/compromissos/?{urlencode(params)}"

    def test_gestor_recebe_sobreposicao_da_equipe_com_limites_semiabertos(self):
        self.client.force_authenticate(self.gestor)
        with self.assertNumQueries(2):
            response = self.client.get(self.url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["titulo"] for item in response.data["results"]], ["Atravessa início", "Dentro"])
        self.assertEqual(response.data["timezone"], "America/Fortaleza")
        self.assertTrue(response.data["results"][0]["inicio"].endswith("-03:00"))

    def test_inspetor_recebe_somente_compromissos_em_que_participa(self):
        self.client.force_authenticate(self.inspetor)
        response = self.client.get(self.url())
        self.assertEqual([item["titulo"] for item in response.data["results"]], ["Dentro"])

    def test_rejeita_parametros_ausentes_naive_invertidos_e_intervalo_longo(self):
        self.client.force_authenticate(self.gestor)
        queries = [
            "/api/compromissos/",
            "/api/compromissos/?inicio=2026-09-21T00:00:00&fim=2026-09-22T00:00:00",
            self.url(self.inicio + timedelta(days=1), self.inicio),
            self.url(self.inicio, self.inicio + timedelta(days=43)),
        ]
        for url in queries:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 400)

    def test_exige_sessao(self):
        self.assertEqual(self.client.get(self.url()).status_code, 401)

# Create your tests here.
