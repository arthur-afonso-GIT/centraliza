from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from avisos.models import Aviso
from usuarios.models import Equipe, Usuario


class AvisoModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe avisos")
        cls.outra = Equipe.objects.create(nome="Outra equipe avisos")
        cls.gestor = Usuario.objects.create_user(username="gestor.avisos", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.avisos", perfil="inspetor", equipe=cls.equipe)
        cls.gestor_externo = Usuario.objects.create_user(username="gestor.avisos.externo", perfil="gestor", equipe=cls.outra)
        cls.publicacao = datetime(2026, 10, 1, 9, tzinfo=ZoneInfo("America/Fortaleza"))

    def dados(self, autor=None, categoria="urgente"):
        return {
            "titulo": "Aviso de teste", "resumo": "Resumo do aviso", "conteudo": "Conteúdo completo.",
            "categoria": categoria, "equipe": self.equipe, "autor": autor or self.gestor,
            "publicado_em": self.publicacao,
        }

    def test_aceita_aviso_de_gestor_ativo_da_equipe(self):
        aviso = Aviso.objects.create(**self.dados())
        self.assertEqual(aviso.categoria, Aviso.Categoria.URGENTE)

    def test_rejeita_autor_inspetor(self):
        with self.assertRaises(ValidationError):
            Aviso.objects.create(**self.dados(autor=self.inspetor))

    def test_rejeita_autor_de_outra_equipe(self):
        with self.assertRaises(ValidationError):
            Aviso.objects.create(**self.dados(autor=self.gestor_externo))

    def test_rejeita_categoria_desconhecida(self):
        with self.assertRaises(ValidationError):
            Aviso.objects.create(**self.dados(categoria="geral"))


class SeedAvisosTest(TestCase):
    @override_settings(DEBUG=True)
    def test_carga_e_idempotente(self):
        for numero in (1, 2):
            equipe = Equipe.objects.create(nome=f"Equipe {numero}")
            Usuario.objects.create_user(username=f"demo.gestor.{numero}", perfil="gestor", equipe=equipe)

        call_command("seed_avisos", verbosity=0)
        call_command("seed_avisos", verbosity=0)

        self.assertEqual(Aviso.objects.count(), 8)
        self.assertEqual(Aviso.objects.filter(categoria="urgente").count(), 4)


class AvisoApiTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe API avisos")
        cls.outra = Equipe.objects.create(nome="Outra equipe API avisos")
        cls.gestor = Usuario.objects.create_user(username="gestor.api.avisos", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.api.avisos", perfil="inspetor", equipe=cls.equipe)
        cls.externo = Usuario.objects.create_user(username="gestor.api.avisos.externo", perfil="gestor", equipe=cls.outra)
        base = timezone.now()
        cls.informativo = cls.criar("Informativo recente", "informativo", cls.equipe, cls.gestor, base)
        cls.urgente_antigo = cls.criar("Urgente antigo", "urgente", cls.equipe, cls.gestor, base - timedelta(days=1))
        cls.urgente_novo = cls.criar("Urgente novo", "urgente", cls.equipe, cls.gestor, base)
        cls.aviso_externo = cls.criar("Aviso externo", "urgente", cls.outra, cls.externo, base)

    @classmethod
    def criar(cls, titulo, categoria, equipe, autor, publicado_em):
        return Aviso.objects.create(
            titulo=titulo, resumo=f"Resumo: {titulo}", conteudo=f"Conteúdo: {titulo}",
            categoria=categoria, equipe=equipe, autor=autor, publicado_em=publicado_em,
        )

    def test_feed_prioriza_urgentes_recentes_e_isola_equipe(self):
        self.client.force_authenticate(self.gestor)
        with self.assertNumQueries(1):
            response = self.client.get("/api/avisos/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["titulo"] for item in response.data["resultados"]],
            ["Urgente novo", "Urgente antigo", "Informativo recente"],
        )
        self.assertNotIn("conteudo", response.data["resultados"][0])
        self.assertTrue(response.data["resultados"][0]["publicado_em"].endswith("-03:00"))

    def test_inspetor_pode_consultar_feed_e_detalhe_da_equipe(self):
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.get("/api/avisos/").status_code, 200)
        with self.assertNumQueries(1):
            response = self.client.get(f"/api/avisos/{self.informativo.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["conteudo"], "Conteúdo: Informativo recente")

    def test_detalhe_de_outra_equipe_retorna_404(self):
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.get(f"/api/avisos/{self.aviso_externo.id}/").status_code, 404)

    def test_feed_e_detalhe_exigem_sessao(self):
        self.assertEqual(self.client.get("/api/avisos/").status_code, 401)
        self.assertEqual(self.client.get(f"/api/avisos/{self.informativo.id}/").status_code, 401)
