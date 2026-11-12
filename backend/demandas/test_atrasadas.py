from datetime import datetime, timedelta, timezone as dt_timezone
from unittest.mock import patch

from rest_framework.test import APITestCase

from demandas.models import Demanda
from demandas.tests import criar_demanda_teste
from usuarios.models import Equipe, Usuario


class DemandasAtrasadasTest(APITestCase):
    def setUp(self):
        self.agora = datetime(2026, 10, 28, 15, tzinfo=dt_timezone.utc)
        self.equipe = Equipe.objects.create(nome="HU16")
        self.gestor = Usuario.objects.create_user(username="gestor16", perfil="gestor", equipe=self.equipe)
        self.inspetor = Usuario.objects.create_user(username="inspetor16", perfil="inspetor", equipe=self.equipe)
        self.outro = Usuario.objects.create_user(username="outro16", perfil="inspetor", equipe=self.equipe)
        self.client.force_authenticate(self.inspetor)
        self.clock = patch("django.utils.timezone.now", return_value=self.agora)
        self.clock.start()
        self.addCleanup(self.clock.stop)

    def criar(self, **dados):
        base = dict(titulo="HU16", equipe=self.equipe, criador=self.gestor,
                    responsavel=self.inspetor, prazo=self.agora - timedelta(hours=2))
        base.update(dados)
        return criar_demanda_teste(**base)

    def test_reune_estados_ativos_e_exclui_encerradas_e_outros_responsaveis(self):
        esperados = []
        for status in Demanda.Status.values:
            demanda = self.criar(status=status)
            if status not in {"concluida", "cancelada"}:
                esperados.append(demanda.pk)
        self.criar(responsavel=self.outro)
        self.criar(responsavel=None)
        response = self.client.get("/api/demandas/?atrasada=true")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([d["id"] for d in response.data["results"]], esperados)
        self.assertTrue(all(d["atrasada"] for d in response.data["results"]))

    def test_limite_exato_do_prazo_e_fuso(self):
        vencida = self.criar(prazo="2026-10-28T11:59:59-03:00")
        self.criar(prazo="2026-10-28T12:00:00-03:00")
        self.criar(prazo="2026-10-28T12:00:01-03:00")
        response = self.client.get("/api/demandas/?atrasada=true")
        self.assertEqual([d["id"] for d in response.data["results"]], [vencida.pk])

    def test_mais_antigas_primeiro_com_paginacao_e_busca(self):
        recente = self.criar(sei_numero="HU16-RECENTE")
        antiga = self.criar(prazo=self.agora - timedelta(days=3), sei_numero="HU16-ANTIGA")
        response = self.client.get("/api/demandas/?atrasada=true&page_size=1")
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["results"][0]["id"], antiga.pk)
        segunda = self.client.get("/api/demandas/?atrasada=true&page_size=1&page=2")
        self.assertEqual(segunda.data["results"][0]["id"], recente.pk)
        busca = self.client.get("/api/demandas/?atrasada=true&sei_numero=ANTIGA")
        self.assertEqual(busca.data["count"], 1)

    def test_equipe_sem_participacao_nao_expoe_demanda_e_prazo_prorrogado_sai_da_lista(self):
        demanda = self.criar()
        demanda.equipes_participantes.clear()
        self.assertEqual(self.client.get("/api/demandas/?atrasada=true").data["count"], 0)
        demanda.equipes_participantes.add(self.equipe)
        response = self.client.patch(f"/api/demandas/{demanda.pk}/prazo/", {
            "prazo": "2026-10-29T12:00:00-03:00", "atualizada_em": demanda.atualizada_em.isoformat(),
        }, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data["atrasada"])
        self.assertEqual(self.client.get("/api/demandas/?atrasada=true").data["count"], 0)
