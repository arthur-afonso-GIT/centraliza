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
        with self.assertNumQueries(2):
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
        with self.assertNumQueries(2):
            response = self.client.get(f"/api/avisos/{self.informativo.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["conteudo"], "Conteúdo: Informativo recente")

    def test_detalhe_de_outra_equipe_retorna_404(self):
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.get(f"/api/avisos/{self.aviso_externo.id}/").status_code, 404)

    def test_feed_e_detalhe_exigem_sessao(self):
        self.assertEqual(self.client.get("/api/avisos/").status_code, 401)
        self.assertEqual(self.client.get(f"/api/avisos/{self.informativo.id}/").status_code, 401)


class GerenciamentoAvisosTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe gestão avisos")
        cls.outra = Equipe.objects.create(nome="Outra gestão avisos")
        cls.gestor = Usuario.objects.create_user(username="gestor.gerencia.avisos", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.gerencia.avisos", perfil="inspetor", equipe=cls.equipe)
        cls.segundo = Usuario.objects.create_user(username="segundo.gerencia.avisos", perfil="inspetor", equipe=cls.equipe)
        cls.externo = Usuario.objects.create_user(username="externo.gerencia.avisos", perfil="inspetor", equipe=cls.outra)

    def payload(self, **changes):
        agora = timezone.now()
        data = {
            "titulo": "Novo comunicado", "resumo": "Resumo operacional", "conteudo": "Conteúdo completo do comunicado.",
            "categoria": "urgente", "publicado_em": agora.isoformat(), "expira_em": (agora + timedelta(days=2)).isoformat(),
            "destinatario_ids": [self.inspetor.id],
        }
        data.update(changes)
        return data

    def test_gestor_publica_edita_e_cancela_aviso_direcionado(self):
        self.client.force_authenticate(self.gestor)
        criado = self.client.post("/api/avisos/", self.payload(), format="json")
        self.assertEqual(criado.status_code, 201)
        self.assertEqual(criado.data["destinatarios"][0]["id"], self.inspetor.id)
        atualizado = self.client.patch(f"/api/avisos/{criado.data['id']}/", {"titulo": "Comunicado revisado", "destinatario_ids": []}, format="json")
        self.assertEqual(atualizado.status_code, 200)
        self.assertEqual(atualizado.data["titulo"], "Comunicado revisado")
        self.assertEqual(atualizado.data["destinatarios"], [])
        self.assertEqual(self.client.delete(f"/api/avisos/{criado.data['id']}/").status_code, 204)
        self.assertFalse(any(item["id"] == criado.data["id"] for item in self.client.get("/api/avisos/").data["resultados"]))
        aviso = Aviso.objects.get(pk=criado.data["id"])
        self.assertEqual(aviso.cancelado_por, self.gestor)

    def test_inspetor_ve_aviso_geral_ou_destinado_a_ele_durante_vigencia(self):
        self.client.force_authenticate(self.gestor)
        direcionado = self.client.post("/api/avisos/", self.payload(), format="json").data
        self.client.post("/api/avisos/", self.payload(titulo="Para outro", destinatario_ids=[self.segundo.id]), format="json")
        self.client.post("/api/avisos/", self.payload(titulo="Futuro", publicado_em=(timezone.now() + timedelta(days=1)).isoformat(), expira_em=(timezone.now() + timedelta(days=2)).isoformat()), format="json")
        self.client.force_authenticate(self.inspetor)
        response = self.client.get("/api/avisos/")
        self.assertEqual([item["id"] for item in response.data["resultados"]], [direcionado["id"]])

    def test_rejeita_vigencia_e_destinatario_invalidos(self):
        agora = timezone.now()
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.post("/api/avisos/", self.payload(publicado_em=agora.isoformat(), expira_em=(agora - timedelta(hours=1)).isoformat()), format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/avisos/", self.payload(destinatario_ids=[self.externo.id]), format="json").status_code, 400)

    def test_inspetor_nao_gerencia_e_equipe_externa_nao_edita(self):
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.post("/api/avisos/", self.payload(), format="json").status_code, 403)
        self.client.force_authenticate(self.gestor)
        criado = self.client.post("/api/avisos/", self.payload(), format="json").data
        gestor_externo = Usuario.objects.create_user(username="gestor.externo.gerencia.avisos", perfil="gestor", equipe=self.outra)
        self.client.force_authenticate(gestor_externo)
        self.assertEqual(self.client.patch(f"/api/avisos/{criado['id']}/", {"titulo": "Indevido"}, format="json").status_code, 404)
