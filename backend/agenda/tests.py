from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.test import TestCase

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

# Create your tests here.
