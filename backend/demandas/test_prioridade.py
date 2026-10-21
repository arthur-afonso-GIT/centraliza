from datetime import date
from unittest.mock import patch

from rest_framework.test import APITestCase

from demandas.models import Demanda
from demandas.prioridade import alterar_prioridade
from demandas.tests import criar_demanda_teste
from usuarios.models import Equipe, Usuario


class PrioridadeDemandaTest(APITestCase):
    def setUp(self):
        self.equipe = Equipe.objects.create(nome="Equipe HU4")
        self.gestor = Usuario.objects.create_user(username="gestor-hu4", perfil="gestor", equipe=self.equipe)
        self.inspetor = Usuario.objects.create_user(username="inspetor-hu4", perfil="inspetor", equipe=self.equipe)
        self.outro = Usuario.objects.create_user(username="outro-hu4", perfil="inspetor", equipe=self.equipe)
        self.demanda = criar_demanda_teste(titulo="HU4", equipe=self.equipe, criador=self.gestor, responsavel=self.inspetor, prazo=date(2026, 12, 1))
        self.url = f"/api/demandas/{self.demanda.pk}/prioridade/"
        self.client.force_authenticate(self.inspetor)

    def test_altera_niveis_persiste_e_registra_autor_e_valores(self):
        for nivel in ["alta", "baixa", "media"]:
            anterior = self.demanda.get_prioridade_display()
            response = self.client.patch(self.url, {"prioridade": nivel}, format="json")
            self.assertEqual(response.status_code, 200)
            self.demanda.refresh_from_db()
            self.assertEqual(self.demanda.prioridade, nivel)
            evento = self.demanda.historico.first()
            self.assertEqual(evento.autor_id, self.inspetor.pk)
            self.assertEqual(evento.texto, f"Prioridade alterada de {anterior} para {self.demanda.get_prioridade_display()}.")
            self.assertEqual(self.client.get(f"/api/demandas/{self.demanda.pk}/").data["prioridade"], nivel)

    def test_repeticao_nao_cria_evento(self):
        self.client.patch(self.url, {"prioridade": "alta"}, format="json")
        self.client.patch(self.url, {"prioridade": "alta"}, format="json")
        self.assertEqual(self.demanda.historico.count(), 1)

    def test_permite_todos_os_estados_ativos(self):
        for estado in ["pendente", "aceita", "em_andamento", "aguardando_avaliacao", "em_correcao"]:
            self.demanda.status = estado
            self.demanda.prioridade = "media"
            self.demanda.save()
            self.assertEqual(self.client.patch(self.url, {"prioridade": "alta"}, format="json").status_code, 200)

    def test_nao_atribuida_e_sem_csrf(self):
        self.demanda.responsavel = None
        self.demanda.save()
        self.assertEqual(self.client.patch(self.url, {"prioridade": "alta"}, format="json").status_code, 404)
        from rest_framework.test import APIClient
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.inspetor)
        self.assertEqual(client.patch(self.url, {"prioridade": "alta"}, format="json").status_code, 403)

    def test_rejeita_encerradas_e_payloads_invalidos(self):
        for payload in [{}, {"prioridade": "urgente"}, {"prioridade": None}, {"prioridade": "alta", "titulo": "Outro"}]:
            self.assertEqual(self.client.patch(self.url, payload, format="json").status_code, 400)
        for estado in ["concluida", "cancelada"]:
            self.demanda.status = estado
            self.demanda.save()
            self.assertEqual(self.client.patch(self.url, {"prioridade": "alta"}, format="json").status_code, 400)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.prioridade, "media")
        self.assertFalse(self.demanda.historico.exists())

    def test_permissoes_e_campos_protegidos(self):
        self.assertEqual(self.client.patch(f"/api/demandas/{self.demanda.pk}/", {"titulo": "Outro"}, format="json").status_code, 403)
        self.client.force_authenticate(self.outro)
        self.assertEqual(self.client.patch(self.url, {"prioridade": "alta"}, format="json").status_code, 404)
        externa = Equipe.objects.create(nome="Externa")
        self.outro.equipe = externa
        self.outro.save()
        self.assertEqual(self.client.patch(self.url, {"prioridade": "alta"}, format="json").status_code, 404)
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.patch(self.url, {"prioridade": "alta"}, format="json").status_code, 403)
        # A edição já existente do gestor continua funcionando.
        self.assertEqual(self.client.patch(f"/api/demandas/{self.demanda.pk}/", {"prioridade": "alta"}, format="json").status_code, 200)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.patch(self.url, {"prioridade": "baixa"}, format="json").status_code, 401)

    def test_falha_no_historico_desfaz_alteracao(self):
        with patch("demandas.prioridade.EventoDemanda.objects.create", side_effect=RuntimeError("falha")):
            with self.assertRaises(RuntimeError):
                alterar_prioridade(demanda_id=self.demanda.pk, usuario=self.inspetor, prioridade="alta")
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.prioridade, "media")
