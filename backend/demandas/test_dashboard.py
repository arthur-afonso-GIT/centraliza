from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from agenda.models import Compromisso
from avisos.models import Aviso
from demandas.models import Demanda
from usuarios.models import Equipe, Usuario


class ResumoHomeTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe painel")
        cls.outra = Equipe.objects.create(nome="Outra equipe painel")
        cls.gestor = Usuario.objects.create_user(username="gestor.painel", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.painel", first_name="Iara", perfil="inspetor", equipe=cls.equipe)
        cls.outro = Usuario.objects.create_user(username="outro.painel", perfil="inspetor", equipe=cls.outra)
        hoje = timezone.localdate()
        cls.atrasada = Demanda.objects.create(titulo="Atrasada", prazo=hoje - timedelta(days=1), critica=True, equipe=cls.equipe, criador=cls.gestor, responsavel=cls.inspetor)
        Demanda.objects.create(titulo="Sem responsável", prazo=hoje + timedelta(days=2), equipe=cls.equipe, criador=cls.gestor)
        Demanda.objects.create(titulo="Avaliar", prazo=hoje + timedelta(days=3), status="aguardando_avaliacao", equipe=cls.equipe, criador=cls.gestor, responsavel=cls.inspetor)
        Demanda.objects.create(titulo="Externa", prazo=hoje - timedelta(days=1), equipe=cls.outra, criador=cls.outro, responsavel=cls.outro)
        compromisso = Compromisso.objects.create(titulo="Reunião próxima", tipo="reuniao", inicio=timezone.now() + timedelta(days=1), fim=timezone.now() + timedelta(days=1, hours=1), equipe=cls.equipe, criador=cls.gestor)
        compromisso.participantes.add(cls.inspetor)
        aviso = Aviso.objects.create(titulo="Aviso vigente", resumo="Resumo", conteudo="Conteúdo", categoria="informativo", equipe=cls.equipe, autor=cls.gestor, publicado_em=timezone.now() - timedelta(hours=1))
        aviso.destinatarios.add(cls.inspetor)

    def test_gestor_recebe_resumo_da_equipe(self):
        self.client.force_authenticate(self.gestor)
        response = self.client.get("/api/home/resumo/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["indicadores"], {"atrasadas": 1, "criticas": 1, "sem_responsavel": 1, "aguardando_avaliacao": 1})
        self.assertEqual(response.data["carga_inspetores"], [{"id": self.inspetor.id, "nome": "Iara", "total": 2}])
        self.assertEqual(len(response.data["proximos_compromissos"]), 1)
        self.assertEqual(len(response.data["avisos_ativos"]), 1)

    def test_inspetor_recebe_apenas_seu_resumo(self):
        self.client.force_authenticate(self.inspetor)
        response = self.client.get("/api/home/resumo/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["indicadores"]["atrasadas"], 1)
        self.assertEqual(response.data["indicadores"]["nao_iniciadas"], 1)
        self.assertNotIn("carga_inspetores", response.data)
        self.assertEqual({item["id"] for item in response.data["proximas_demandas"]}, {self.atrasada.id, self.atrasada.id + 2})

    def test_exige_sessao(self):
        self.assertEqual(self.client.get("/api/home/resumo/").status_code, 401)
