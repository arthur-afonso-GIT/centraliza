from datetime import datetime
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.test import TestCase, override_settings

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
