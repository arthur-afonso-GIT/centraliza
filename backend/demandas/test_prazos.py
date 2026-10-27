from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from threading import Barrier
from zoneinfo import ZoneInfo

from django.db import close_old_connections, connection, connections
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase, skipUnlessDBFeature
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


    def test_entradas_hostis_nao_geram_erro_interno_ou_alteracao(self):
        self.client.force_authenticate(self.inspetor)
        inicial = self.demanda.prazo
        valores = [None, "", {}, [], True, 123, "2026-02-30T17:00:00-03:00", "2026-10-30T25:00:00-03:00", "2026-10-30T17:00:00+24:00", "9999-12-31T23:59:00-03:00", "0001-01-01T00:00:00+14:00", "<script>alert(1)</script>"]
        for valor in valores:
            with self.subTest(valor=valor):
                response = self.client.patch(self.url, {"prazo": valor}, format="json")
                self.assertEqual(response.status_code, 400)
        for body in [[], [1], "prazo", 10, None]:
            with self.subTest(body=body):
                response = self.client.patch(self.url, body, format="json")
                self.assertEqual(response.status_code, 400)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.prazo, inicial)
        self.assertFalse(self.demanda.historico.exists())

    def test_mesmo_instante_em_utc_nao_cria_evento(self):
        self.alterar(self.inspetor, prazo="2026-10-30T17:00:00-03:00")
        self.alterar(self.inspetor, prazo="2026-10-30T20:00:00Z")
        self.assertEqual(self.demanda.historico.count(), 1)

    def test_versao_desatualizada_nao_sobrescreve_outra_edicao(self):
        self.client.force_authenticate(self.gestor)
        versao = self.demanda.atualizada_em.isoformat()
        primeira = self.alterar(self.inspetor, prazo="2026-10-30T18:00:00-03:00", atualizada_em=versao)
        self.assertEqual(primeira.status_code, 200)
        segunda = self.alterar(self.gestor, prazo="2026-10-30T19:00:00-03:00", atualizada_em=versao)
        self.assertEqual(segunda.status_code, 409)
        self.demanda.refresh_from_db()
        self.assertEqual(timezone.localtime(self.demanda.prazo).hour, 18)
        self.assertEqual(self.demanda.historico.count(), 1)

    def test_historico_e_prazo_sao_atomicos(self):
        self.client.force_authenticate(self.inspetor)
        inicial = self.demanda.prazo
        with patch("demandas.services.EventoDemanda.objects.create", side_effect=RuntimeError("Falha simulada de escrita")):
            with self.assertRaises(RuntimeError):
                self.client.patch(self.url, {"prazo": "2026-10-30T17:00:00-03:00"}, format="json")
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.prazo, inicial)
        self.assertFalse(self.demanda.historico.exists())

    def test_retirada_de_acesso_ou_troca_de_responsavel_bloqueia_edicao(self):
        self.demanda.equipes_participantes.clear()
        self.assertEqual(self.alterar(self.inspetor).status_code, 404)
        self.demanda.equipes_participantes.add(self.equipe)
        Demanda.objects.filter(pk=self.demanda.pk).update(responsavel=self.outro)
        self.assertEqual(self.alterar(self.inspetor).status_code, 404)

    def test_gestor_participante_pode_editar_inspetor_nao_responsavel_nao(self):
        equipe = Equipe.objects.create(nome="Participante")
        gestor = Usuario.objects.create_user(username="gestor.participante", perfil="gestor", equipe=equipe)
        inspetor = Usuario.objects.create_user(username="inspetor.participante", perfil="inspetor", equipe=equipe)
        self.demanda.equipes_participantes.add(equipe)
        self.assertEqual(self.alterar(gestor).status_code, 200)
        self.assertEqual(self.alterar(inspetor).status_code, 404)

    def test_sessao_real_exige_csrf_e_rejeita_usuario_desativado(self):
        from rest_framework.test import APIClient
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.inspetor)
        self.assertEqual(client.patch(self.url, {"prazo": "2026-10-30T17:00:00-03:00"}, format="json").status_code, 403)
        self.inspetor.is_active = False
        self.inspetor.save(update_fields=["is_active"])
        self.assertEqual(client.patch(self.url, {"prazo": "2026-10-30T17:00:00-03:00"}, format="json").status_code, 401)


    def test_edicao_geral_com_versao_antiga_nao_reverte_prazo(self):
        versao = self.demanda.atualizada_em.isoformat()
        self.alterar(self.inspetor, prazo="2026-10-30T18:00:00-03:00")
        self.client.force_authenticate(self.gestor)
        response = self.client.patch(f"/api/demandas/{self.demanda.pk}/", {
            "titulo": "Título atualizado", "prazo": "2026-10-30T17:00:00-03:00", "atualizada_em": versao,
        }, format="json")
        self.assertEqual(response.status_code, 409)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.titulo, "Prazo")
        self.assertEqual(timezone.localtime(self.demanda.prazo).hour, 18)

    def test_edicao_geral_do_prazo_registra_valores_anterior_e_novo(self):
        self.client.force_authenticate(self.gestor)
        response = self.client.patch(f"/api/demandas/{self.demanda.pk}/", {"prazo": "2026-10-31T17:00:00-03:00"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("30/10/2026 às 23:59 para 31/10/2026 às 17:00", self.demanda.historico.first().texto)


    def test_prazo_nao_revalida_equipe_atual_do_criador_historico(self):
        nova = Equipe.objects.create(nome="Equipe atual do criador")
        Usuario.objects.filter(pk=self.gestor.pk).update(equipe=nova)
        response = self.alterar(self.inspetor)
        self.assertEqual(response.status_code, 200, response.data)

    def test_inspetor_com_equipe_ativa_diferente_da_principal_pode_salvar(self):
        from usuarios.models import VinculoEquipe
        from rest_framework.test import APIClient
        principal = Equipe.objects.create(nome="Principal")
        Usuario.objects.filter(pk=self.inspetor.pk).update(equipe=principal)
        VinculoEquipe.objects.create(usuario=self.inspetor, equipe=self.equipe, papel="inspetor", ativo=True)
        client = APIClient()
        client.force_login(Usuario.objects.get(pk=self.inspetor.pk))
        sessao = client.session
        sessao["equipe_ativa_id"] = self.equipe.pk
        sessao.save()
        response = client.patch(self.url, {"prazo": "2026-10-30T17:00:00-03:00"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)


    def test_versao_avanca_mesmo_com_relogio_congelado(self):
        instante = self.demanda.atualizada_em
        with patch("django.utils.timezone.now", return_value=instante):
            response = self.alterar(self.inspetor, prazo="2026-10-30T17:00:00-03:00", atualizada_em=instante.isoformat())
            self.assertEqual(response.status_code, 200)
            repetida = self.alterar(self.inspetor, prazo="2026-10-30T18:00:00-03:00", atualizada_em=instante.isoformat())
            self.assertEqual(repetida.status_code, 409)
        self.demanda.refresh_from_db()
        self.assertGreater(self.demanda.atualizada_em, instante)

    def test_versao_da_edicao_geral_avanca_com_relogio_congelado(self):
        instante = self.demanda.atualizada_em
        self.client.force_authenticate(self.gestor)
        with patch("django.utils.timezone.now", return_value=instante):
            response = self.client.patch(f"/api/demandas/{self.demanda.pk}/", {"titulo": "Alterado", "atualizada_em": instante.isoformat()}, format="json")
        self.assertEqual(response.status_code, 200)
        self.demanda.refresh_from_db()
        self.assertGreater(self.demanda.atualizada_em, instante)


class ConcorrenciaPrazoTest(TransactionTestCase):
    @skipUnlessDBFeature("has_select_for_update")
    def test_duas_edicoes_simultaneas_tem_um_vencedor_sem_perder_historico(self):
        from rest_framework.test import APIClient
        equipe = Equipe.objects.create(nome="Concorrência")
        gestor = Usuario.objects.create_user(username="gestor.concorrencia", perfil="gestor", equipe=equipe)
        demanda = criar_demanda_teste(titulo="Concorrência", equipe=equipe, criador=gestor, prazo="2026-10-30")
        versao = demanda.atualizada_em.isoformat()
        barreira = Barrier(2)

        def salvar(hora):
            close_old_connections()
            try:
                client = APIClient()
                client.force_authenticate(Usuario.objects.get(pk=gestor.pk))
                barreira.wait(timeout=10)
                return client.patch(f"/api/demandas/{demanda.pk}/prazo/", {
                    "prazo": f"2026-10-30T{hora}:00:00-03:00", "atualizada_em": versao,
                }, format="json").status_code
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            resultados = list(pool.map(salvar, [17, 18]))
        self.assertEqual(sorted(resultados), [200, 409])
        self.assertEqual(demanda.historico.count(), 1)


class MigracaoPrazoTest(TransactionTestCase):
    def test_migracao_preserva_datas_e_reversao_preserva_dia_local(self):
        anterior = [("demandas", "0012_solicitacaoparticipacao")]
        atual = [("demandas", "0013_prazo_com_horario")]
        executor = MigrationExecutor(connection)
        executor.migrate(anterior)
        try:
            apps = executor.loader.project_state(anterior).apps
            equipe = apps.get_model("usuarios", "Equipe").objects.create(nome="Migração HU3")
            usuario = apps.get_model("usuarios", "Usuario").objects.create(username="migracao.hu3", perfil="gestor", equipe_id=equipe.pk)
            Antiga = apps.get_model("demandas", "Demanda")
            datas = [date(2024, 2, 29), date(2026, 10, 30)]
            ids = [Antiga.objects.create(titulo="Legada", sei_numero=f"MIG-{dia}", prazo=dia, equipe_id=equipe.pk, criador_id=usuario.pk).pk for dia in datas]
            executor = MigrationExecutor(connection)
            executor.migrate(atual)
            Nova = executor.loader.project_state(atual).apps.get_model("demandas", "Demanda")
            for pk, dia in zip(ids, datas):
                prazo = timezone.localtime(Nova.objects.get(pk=pk).prazo)
                self.assertEqual(prazo.date(), dia)
                self.assertEqual((prazo.hour, prazo.minute), (23, 59))
            executor = MigrationExecutor(connection)
            executor.migrate(anterior)
            Antiga = executor.loader.project_state(anterior).apps.get_model("demandas", "Demanda")
            for pk, dia in zip(ids, datas):
                self.assertEqual(Antiga.objects.get(pk=pk).prazo, dia)
        finally:
            MigrationExecutor(connection).migrate(atual)
