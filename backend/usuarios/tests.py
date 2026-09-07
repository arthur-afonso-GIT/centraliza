from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

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


class ListaInspetoresTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe seleção")
        outra = Equipe.objects.create(nome="Outra equipe seleção")
        cls.gestor = Usuario.objects.create_user(username="gestor.selecao", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.selecao", first_name="Ana", perfil="inspetor", equipe=cls.equipe)
        Usuario.objects.create_user(username="inativo.selecao", perfil="inspetor", equipe=cls.equipe, is_active=False)
        Usuario.objects.create_user(username="externo.selecao", perfil="inspetor", equipe=outra)

    def test_gestor_recebe_somente_inspetores_ativos_da_equipe(self):
        self.client.force_authenticate(self.gestor)
        with self.assertNumQueries(1):
            response = self.client.get("/api/usuarios/inspetores/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resultados"], [{"id": self.inspetor.id, "nome": "Ana"}])

    def test_inspetor_e_sessao_ausente_sao_bloqueados(self):
        self.assertEqual(self.client.get("/api/usuarios/inspetores/").status_code, 401)
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.get("/api/usuarios/inspetores/").status_code, 403)
