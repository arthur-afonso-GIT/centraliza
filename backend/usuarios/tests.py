from django.core.exceptions import ValidationError
from django.test import TestCase

from demandas.models import Demanda
from usuarios.models import Equipe, Usuario


class RegrasDoModeloTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe_a = Equipe.objects.create(nome="Equipe A")
        cls.equipe_b = Equipe.objects.create(nome="Equipe B")
        cls.gestor = Usuario.objects.create_user(
            username="gestor.a", perfil="gestor", equipe=cls.equipe_a
        )
        cls.inspetor = Usuario.objects.create_user(
            username="inspetor.a", perfil="inspetor", equipe=cls.equipe_a
        )
        cls.inspetor_b = Usuario.objects.create_user(
            username="inspetor.b", perfil="inspetor", equipe=cls.equipe_b
        )

    def criar_demanda(self, **alteracoes):
        dados = {
            "titulo": "Inspeção de teste",
            "prazo": "2026-09-15",
            "equipe": self.equipe_a,
            "criador": self.gestor,
            "responsavel": self.inspetor,
        }
        dados.update(alteracoes)
        return Demanda(**dados)

    def test_aceita_inspetor_da_mesma_equipe(self):
        demanda = self.criar_demanda()
        demanda.save()
        self.assertEqual(demanda.responsavel, self.inspetor)

    def test_aceita_demanda_sem_responsavel(self):
        demanda = self.criar_demanda(responsavel=None)
        demanda.save()
        self.assertIsNone(demanda.responsavel)

    def test_rejeita_responsavel_de_outra_equipe(self):
        demanda = self.criar_demanda(responsavel=self.inspetor_b)
        with self.assertRaisesMessage(ValidationError, "equipe da demanda"):
            demanda.save()

    def test_rejeita_gestor_como_responsavel(self):
        demanda = self.criar_demanda(responsavel=self.gestor)
        with self.assertRaisesMessage(ValidationError, "Atribua a demanda a um inspetor"):
            demanda.save()

    def test_criticidade_independe_do_status(self):
        demanda = self.criar_demanda(status="pendente", critica=True)
        demanda.save()
        self.assertEqual(demanda.status, "pendente")
        self.assertTrue(demanda.critica)
