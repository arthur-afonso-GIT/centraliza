from datetime import date

from rest_framework.test import APITestCase

from demandas.models import EventoDemanda
from demandas.tests import criar_demanda_teste
from usuarios.models import Equipe, Usuario


class AlterarStatusDemandaTest(APITestCase):
    def setUp(self):
        self.equipe = Equipe.objects.create(nome="Equipe status")
        self.gestor = Usuario.objects.create_user(username="gestor-status", perfil="gestor", equipe=self.equipe)
        self.inspetor = Usuario.objects.create_user(username="inspetor-status", perfil="inspetor", equipe=self.equipe)
        self.outro = Usuario.objects.create_user(username="outro-status", perfil="inspetor", equipe=self.equipe)
        self.demanda = criar_demanda_teste(titulo="Status", equipe=self.equipe, criador=self.gestor, responsavel=self.inspetor, prazo=date(2026, 12, 1))
        self.detalhe = f"/api/demandas/{self.demanda.pk}/"
        self.url = f"{self.detalhe}status/"

    def test_detalhe_informa_opcoes_do_inspetor_em_cada_etapa(self):
        self.client.force_authenticate(self.inspetor)
        esperado = {
            "pendente": [{"status": "aceita", "exige_texto": False}],
            "aceita": [{"status": "em_andamento", "exige_texto": False}],
            "em_andamento": [{"status": "aguardando_avaliacao", "exige_texto": True}],
            "em_correcao": [{"status": "aguardando_avaliacao", "exige_texto": True}],
            "aguardando_avaliacao": [],
            "concluida": [],
            "cancelada": [],
        }
        for status, opcoes in esperado.items():
            with self.subTest(status=status):
                self.demanda.status = status
                self.demanda.save(update_fields=["status"])
                self.assertEqual(self.client.get(self.detalhe).data["status_disponiveis"], opcoes)

    def test_opcoes_respeitam_perfil(self):
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.get(self.detalhe).data["status_disponiveis"], [{"status": "cancelada", "exige_texto": True}])
        self.demanda.responsavel = self.outro
        self.demanda.save(update_fields=["responsavel"])
        self.client.force_authenticate(self.outro)
        self.assertEqual(len(self.client.get(self.detalhe).data["status_disponiveis"]), 1)
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.get(self.detalhe).status_code, 404)

    def test_resposta_traz_nova_situacao_e_proximas_opcoes(self):
        self.client.force_authenticate(self.inspetor)
        response = self.client.patch(self.url, {"status": "aceita"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "aceita")
        self.assertEqual(response.data["status_disponiveis"], [{"status": "em_andamento", "exige_texto": False}])
        self.assertEqual(response.data["historico"][0]["status_novo"], "aceita")
        response = self.client.patch(self.url, {"status": "em_andamento"}, format="json")
        self.assertEqual(response.data["status"], "em_andamento")
        self.assertTrue(response.data["status_disponiveis"][0]["exige_texto"])
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, "em_andamento")
        self.assertEqual(EventoDemanda.objects.filter(demanda=self.demanda, tipo="status_alterado").count(), 2)

    def test_opcao_fora_da_lista_e_recusada_sem_alterar(self):
        self.client.force_authenticate(self.inspetor)
        for status in ["concluida", "cancelada", "em_andamento", "invalido"]:
            with self.subTest(status=status):
                self.assertIn(self.client.patch(self.url, {"status": status}, format="json").status_code, {400, 403})
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, "pendente")
        self.assertFalse(EventoDemanda.objects.filter(demanda=self.demanda).exists())
