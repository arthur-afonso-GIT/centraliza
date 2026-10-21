from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.db import connection
from unittest.mock import patch

from django.utils import timezone
from rest_framework.test import APITestCase

from demandas.models import Demanda
from demandas.tests import criar_demanda_teste
from usuarios.models import Equipe, Usuario


class PrazoDemandaTest(APITestCase):
    def setUp(self):
        self.equipe = Equipe.objects.create(nome="Prazos")
        self.gestor = Usuario.objects.create_user(username="gestor.prazo", perfil="gestor", equipe=self.equipe)
        self.inspetor = Usuario.objects.create_user(username="inspetor.prazo", perfil="inspetor", equipe=self.equipe)
        self.outro = Usuario.objects.create_user(username="outro.prazo", perfil="inspetor", equipe=self.equipe)
        self.demanda = criar_demanda_teste(titulo="Prazo", equipe=self.equipe, criador=self.gestor, responsavel=self.inspetor, prazo="2026-10-30")
        self.url = f"/api/demandas/{self.demanda.pk}/prazo/"

    def alterar(self, user, **dados):
        self.client.force_authenticate(user)
        return self.client.patch(self.url, dados or {"prazo": "2026-10-30T17:00:00-03:00"}, format="json")

    def test_gestor_e_responsavel_salvam_e_persistem_com_historico(self):
        for user, hora in [(self.gestor, "17"), (self.inspetor, "18")]:
            with self.subTest(perfil=user.perfil):
                response = self.alterar(user, prazo=f"2026-10-30T{hora}:00:00-03:00")
                self.assertEqual(response.status_code, 200, response.data)
                self.demanda.refresh_from_db()
                self.assertEqual(timezone.localtime(self.demanda.prazo).hour, int(hora))
                evento = self.demanda.historico.first()
                self.assertEqual(evento.autor_id, user.pk)
                self.assertIn("Prazo alterado de", evento.texto)
                detalhe = self.client.get(f"/api/demandas/{self.demanda.pk}/")
                self.assertEqual(detalhe.data["prazo"], response.data["prazo"])

    def test_outro_inspetor_e_gestor_externo_nao_alteram(self):
        externa = Equipe.objects.create(nome="Externa")
        gestor = Usuario.objects.create_user(username="externo.prazo", perfil="gestor", equipe=externa)
        for user in [self.outro, gestor]:
            self.assertEqual(self.alterar(user).status_code, 404)
        self.assertFalse(self.demanda.historico.exists())

    def test_encerradas_bloqueadas_para_ambos(self):
        for status in ["concluida", "cancelada"]:
            Demanda.objects.filter(pk=self.demanda.pk).update(status=status)
            for user in [self.gestor, self.inspetor]:
                self.assertEqual(self.alterar(user).status_code, 400)

    def test_validacao_e_isolamento_dos_campos(self):
        for dados in [{}, {"prazo": "2026-10-30"}, {"prazo": None}, {"prazo": "invalido"}, {"prazo": "2026-10-30T17:00:00-03:00", "titulo": "Invadido"}]:
            self.client.force_authenticate(self.inspetor)
            self.assertEqual(self.client.patch(self.url, dados, format="json").status_code, 400)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.titulo, "Prazo")

    def test_exige_autenticacao(self):
        self.assertEqual(self.client.patch(self.url, {"prazo": "2026-10-30T17:00:00-03:00"}, format="json").status_code, 401)

    def test_mesmo_prazo_nao_duplica_historico(self):
        self.alterar(self.inspetor)
        self.alterar(self.inspetor)
        self.assertEqual(self.demanda.historico.count(), 1)

    def test_atraso_por_horario_filtro_por_dia_e_dashboard(self):
        agora = timezone.now().replace(hour=15, minute=0, second=0, microsecond=0)
        self.client.force_authenticate(self.gestor)
        for delta, esperada in [(-1, True), (1, False)]:
            Demanda.objects.filter(pk=self.demanda.pk).update(prazo=agora + timedelta(hours=delta))
            with patch("django.utils.timezone.now", return_value=agora):
                detalhe = self.client.get(f"/api/demandas/{self.demanda.pk}/")
                self.assertEqual(detalhe.data["atrasada"], esperada)
                lista = self.client.get("/api/demandas/?atrasada=true")
                self.assertEqual(lista.data["count"], int(esperada))
                home = self.client.get("/api/home/resumo/")
                self.assertEqual(home.data["indicadores"]["atrasadas"], int(esperada))
                dia = timezone.localtime(agora).date().isoformat()
                filtrada = self.client.get(f"/api/demandas/?prazo_de={dia}&prazo_ate={dia}")
                self.assertEqual(filtrada.data["count"], 1)

    def test_data_legada_preserva_fim_do_dia(self):
        self.assertEqual(timezone.localtime(self.demanda.prazo).strftime("%Y-%m-%d %H:%M"), "2026-10-30 23:59")


    def test_filtro_inclui_dia_local_inteiro_sem_conversao_de_fuso_no_banco(self):
        self.client.force_authenticate(self.gestor)
        inicio = datetime(2026, 10, 30, tzinfo=ZoneInfo("America/Fortaleza"))
        for instante, esperado in [
            (inicio - timedelta(microseconds=1), 0),
            (inicio, 1),
            (inicio + timedelta(days=1) - timedelta(microseconds=1), 1),
            (inicio + timedelta(days=1), 0),
        ]:
            with self.subTest(instante=instante):
                Demanda.objects.filter(pk=self.demanda.pk).update(prazo=instante)
                with patch.object(connection.ops, "datetime_cast_date_sql", side_effect=AssertionError("Conversão de data no banco proibida")):
                    response = self.client.get("/api/demandas/?prazo_de=2026-10-30&prazo_ate=2026-10-30")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["count"], esperado)

    def test_filtros_abertos_e_datas_invalidas(self):
        self.client.force_authenticate(self.gestor)
        for query in ["prazo_de=2026-10-30", "prazo_ate=2026-10-30"]:
            self.assertEqual(self.client.get(f"/api/demandas/?{query}").data["count"], 1)
        for query in ["prazo_de=2026-02-30", "prazo_ate=9999-12-31", "prazo_de=2026-10-31&prazo_ate=2026-10-30"]:
            self.assertEqual(self.client.get(f"/api/demandas/?{query}").status_code, 400)
