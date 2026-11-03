from datetime import date

from rest_framework.test import APITestCase

from demandas.models import EventoDemanda
from demandas.tests import criar_demanda_teste
from usuarios.models import Equipe, Usuario


class ConcluirExecucaoTest(APITestCase):
    def setUp(self):
        self.equipe = Equipe.objects.create(nome="Equipe conclusão")
        self.gestor = Usuario.objects.create_user(username="gestor-conclusao", perfil="gestor", equipe=self.equipe)
        self.inspetor = Usuario.objects.create_user(username="inspetor-conclusao", perfil="inspetor", equipe=self.equipe)
        self.demanda = criar_demanda_teste(
            titulo="Conclusão", equipe=self.equipe, criador=self.gestor, responsavel=self.inspetor,
            prazo=date(2026, 12, 1), status="em_andamento",
        )
        self.url = f"/api/demandas/{self.demanda.pk}/status/"

    def concluir(self, texto="Vistoria realizada e relatório anexado."):
        self.client.force_authenticate(self.inspetor)
        return self.client.patch(self.url, {"status": "aguardando_avaliacao", "texto": texto}, format="json")

    def test_conclusao_registra_evento_com_resumo_e_autor(self):
        response = self.concluir()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "aguardando_avaliacao")
        self.assertEqual(response.data["status_disponiveis"], [])
        evento = EventoDemanda.objects.get(demanda=self.demanda, tipo="status_alterado")
        self.assertEqual((evento.status_anterior, evento.status_novo), ("em_andamento", "aguardando_avaliacao"))
        self.assertEqual(evento.autor, self.inspetor)
        self.assertEqual(evento.texto, "Vistoria realizada e relatório anexado.")

    def test_conclusao_exige_resumo(self):
        self.assertEqual(self.concluir(texto="   ").status_code, 400)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, "em_andamento")
        self.assertFalse(EventoDemanda.objects.filter(demanda=self.demanda).exists())

    def test_inspetor_nao_pula_a_avaliacao_do_gestor(self):
        self.client.force_authenticate(self.inspetor)
        response = self.client.patch(self.url, {"status": "concluida"}, format="json")
        self.assertIn(response.status_code, {400, 403})
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, "em_andamento")

    def test_demanda_concluida_sai_das_pendencias_do_inspetor(self):
        self.client.force_authenticate(self.inspetor)
        antes = self.client.get("/api/home/resumo/").data
        self.assertEqual([item["id"] for item in antes["proximas_demandas"]], [self.demanda.id])
        self.concluir()
        depois = self.client.get("/api/home/resumo/").data
        self.assertEqual(depois["proximas_demandas"], [])
        self.assertEqual(depois["indicadores"]["atrasadas"], 0)

    def test_gestor_continua_vendo_a_demanda_para_avaliar(self):
        self.concluir()
        self.client.force_authenticate(self.gestor)
        resumo = self.client.get("/api/home/resumo/").data
        self.assertEqual(resumo["indicadores"]["aguardando_avaliacao"], 1)
        self.assertEqual([item["id"] for item in resumo["proximas_demandas"]], [self.demanda.id])
        self.assertEqual(resumo["carga_inspetores"][0]["total"], 1)
