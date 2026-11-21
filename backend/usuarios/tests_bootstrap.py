from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from usuarios.models import Equipe, Usuario, VinculoEquipe


class BootstrapManagerTest(TestCase):
    def test_cria_gestor_uma_vez_e_preserva_senha(self):
        environment = {
            "CENTRALIZA_BOOTSTRAP_USERNAME": "gestor.inicial",
            "CENTRALIZA_BOOTSTRAP_PASSWORD": "SenhaForteDeTeste2026",
            "CENTRALIZA_BOOTSTRAP_TEAM_NAME": "Equipe Inicial",
        }
        with patch.dict("os.environ", environment):
            call_command("bootstrap_manager")
            user = Usuario.objects.get(username="gestor.inicial")
            self.assertTrue(user.check_password(environment["CENTRALIZA_BOOTSTRAP_PASSWORD"]))
            self.assertTrue(user.pode_administrar_equipe)
            self.assertEqual(user.equipe.nome, "Equipe Inicial")
            self.assertTrue(VinculoEquipe.objects.filter(usuario=user, equipe=user.equipe, papel="gestor", pode_administrar=True, ativo=True).exists())
            call_command("bootstrap_manager")
        self.assertEqual(Usuario.objects.count(), 1)
        self.assertEqual(Equipe.objects.count(), 1)

    def test_sem_variaveis_nao_altera_banco(self):
        with patch.dict("os.environ", {"CENTRALIZA_BOOTSTRAP_USERNAME": "", "CENTRALIZA_BOOTSTRAP_PASSWORD": ""}):
            call_command("bootstrap_manager")
        self.assertFalse(Usuario.objects.exists())

    def test_recusa_criar_outro_gestor_quando_ja_existem_contas(self):
        Usuario.objects.create_user(username="existente", password="SenhaForteDeTeste2026")
        with patch.dict("os.environ", {"CENTRALIZA_BOOTSTRAP_USERNAME": "novo.gestor", "CENTRALIZA_BOOTSTRAP_PASSWORD": "SenhaForteDeTeste2026"}):
            with self.assertRaises(CommandError):
                call_command("bootstrap_manager")
        self.assertFalse(Usuario.objects.filter(username="novo.gestor").exists())
