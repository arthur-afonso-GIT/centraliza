from datetime import datetime, timezone

from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase

from chats.models import Conversa, MensagemConversa
from usuarios.models import Equipe, Usuario, VinculoEquipe


class HistoricoPaginadoTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Busca")
        cls.outra = Equipe.objects.create(nome="Outra")
        cls.a = Usuario.objects.create_user(username="busca.a", first_name="Lívia", equipe=cls.equipe)
        cls.b = Usuario.objects.create_user(username="busca.b", first_name="Cecília", equipe=cls.equipe)
        cls.c = Usuario.objects.create_user(username="busca.c", equipe=cls.equipe)
        cls.d = Usuario.objects.create_user(username="busca.d", equipe=cls.outra)
        cls.conversas = Conversa.objects.bulk_create([
            Conversa(titulo=f"Assunto {i}", equipe=cls.equipe, criador=cls.a) for i in range(135)])
        through = Conversa.participantes.through
        through.objects.bulk_create([through(conversa_id=c.pk, usuario_id=u.pk) for c in cls.conversas for u in [cls.a, cls.b]])
        cls.antiga = cls.conversas[0]
        cls.mensagens = MensagemConversa.objects.bulk_create([
            MensagemConversa(conversa=cls.antiga, autor=cls.b, texto=f"Mensagem {i}") for i in range(1205)])
        # Empates reais: a chave secundária id precisa garantir todas as páginas.
        cls.data = datetime(2026, 11, 18, 12, tzinfo=timezone.utc)
        Conversa.objects.update(criada_em=cls.data)
        MensagemConversa.objects.update(criada_em=cls.data)
        MensagemConversa.objects.filter(pk=cls.mensagens[0].pk).update(texto="Relatório de INSPEÇÃO arquivado")
        cls.privada = Conversa.objects.create(titulo="Relatório secreto", equipe=cls.equipe, criador=cls.c)
        cls.privada.participantes.add(cls.c)
        MensagemConversa.objects.create(conversa=cls.privada, autor=cls.c, texto="Relatório secreto")

    def setUp(self):
        self.client.force_authenticate(self.a)

    def get(self, path="/api/conversas/", **params):
        response = self.client.get(path, params)
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_lista_limitada_e_sem_historico_nem_n_mais_um(self):
        with CaptureQueriesContext(connection) as queries:
            page = self.get(limite=20)
        self.assertEqual(len(page["resultados"]), 20)
        self.assertTrue(page["proximo_cursor"])
        self.assertLessEqual(len(queries), 5)
        self.assertTrue(all("mensagens" not in c for c in page["resultados"]))
        self.assertLess(len(str(page)), 15000)

    def test_conversas_paginam_sem_duplicar_mesmo_com_atividade(self):
        ids = []
        cursor = None
        while True:
            p = self.get(**({"cursor": cursor} if cursor else {}), limite=17)
            ids.extend(c["id"] for c in p["resultados"])
            # Nova atividade não altera a chave da paginação.
            Conversa.objects.filter(pk=self.antiga.pk).update(atualizada_em=datetime.now(timezone.utc))
            cursor = p["proximo_cursor"]
            if not cursor:
                break
        self.assertEqual(ids, sorted([c.pk for c in self.conversas], reverse=True))

    def test_busca_historico_antigo_sem_acentos_nomes_e_filtros(self):
        for palavra in ["RELATORIO", "relatório", "inspecao", "inspec\u0327a\u0303o"]:
            page = self.get(palavra=palavra, participante=self.b.pk, inicio="2026-11-18", fim="2026-11-18")
            self.assertEqual([c["id"] for c in page["resultados"]], [self.antiga.pk])
        self.assertEqual(len(self.get(palavra="cecilia")["resultados"]), 30)
        self.assertEqual(self.get(palavra="relatorio", participante=self.c.pk)["resultados"], [])

    def test_datas_fortaleza_limites_inclusivos(self):
        # Dia 19 em UTC ainda é dia 18 em Fortaleza até 02:59:59.
        url = f"/api/conversas/{self.antiga.pk}/mensagens/"
        cases = [("2026-11-18T02:59:59+00:00", False), ("2026-11-18T03:00:00+00:00", True),
                 ("2026-11-19T02:59:59.999999+00:00", True), ("2026-11-19T03:00:00+00:00", False)]
        for timestamp, expected in cases:
            MensagemConversa.objects.filter(pk=self.mensagens[0].pk).update(criada_em=datetime.fromisoformat(timestamp))
            page = self.get(url, palavra="relatorio", inicio="2026-11-18", fim="2026-11-18")
            self.assertEqual(bool(page["resultados"]), expected)

    def test_mensagens_1205_paginadas_e_detalhe_limitado(self):
        url = f"/api/conversas/{self.antiga.pk}/mensagens/"
        detail = self.get(f"/api/conversas/{self.antiga.pk}/")
        self.assertEqual(len(detail["mensagens"]), 30)
        ids, cursor = [], None
        while True:
            page = self.get(url, limite=100, **({"cursor": cursor} if cursor else {}))
            ids = [m["id"] for m in page["resultados"]] + ids
            cursor = page["proximo_cursor"]
            if not cursor:
                break
        self.assertEqual(ids, [m.pk for m in self.mensagens])
        old = self.get(url, palavra="relatorio")
        self.assertEqual([m["id"] for m in old["resultados"]], [self.mensagens[0].pk])

    def test_cursor_invalido_escopo_e_parametros_invalidos(self):
        cursor = self.get(limite=2)["proximo_cursor"]
        for params in [{"cursor": "xxx"}, {"cursor": cursor, "limite": 3}, {"limite": 0}, {"limite": 101},
                       {"inicio": "nao-data"}, {"inicio": "2026-12-01", "fim": "2026-11-01"}, {"participante": -1}]:
            self.assertEqual(self.client.get("/api/conversas/", params).status_code, 400)
        self.client.force_authenticate(self.b)
        self.assertEqual(self.client.get("/api/conversas/", {"cursor": cursor, "limite": 2}).status_code, 400)

    def test_filtros_ids_e_cursores_nao_ampliam_permissoes(self):
        for user in [self.c, self.d]:
            self.client.force_authenticate(user)
            self.assertEqual(self.get(palavra="inspecao", participante=self.a.pk)["resultados"], [])
            for suffix in ["", "mensagens/"]:
                self.assertEqual(self.client.get(f"/api/conversas/{self.antiga.pk}/{suffix}", {"palavra": "relatorio"}).status_code, 404)
        self.client.force_authenticate(self.a)
        VinculoEquipe.objects.create(usuario=self.a, equipe=self.equipe, papel="inspetor", ativo=False)
        self.assertEqual(self.client.get("/api/conversas/", {"palavra": "relatorio"}).status_code, 403)

    def test_mais_de_uma_pagina_de_novas_mensagens(self):
        url = f"/api/conversas/{self.antiga.pk}/mensagens/"
        after = self.mensagens[-106].pk
        ids, cursor = [], None
        while True:
            page = self.get(url, apos=after, **({"cursor": cursor} if cursor else {}))
            ids.extend(m["id"] for m in page["resultados"])
            cursor = page["proximo_cursor"]
            if not cursor:
                break
        self.assertEqual(ids, [m.pk for m in self.mensagens[-105:]])

    def test_indices_de_busca_e_ordenacao_instalados(self):
        with connection.cursor() as cursor:
            cursor.execute("SELECT indexname FROM pg_indexes WHERE tablename IN ('chats_conversa', 'chats_mensagemconversa')")
            indexes = {row[0] for row in cursor.fetchall()}
        self.assertTrue({"chat_titulo_busca", "chat_texto_busca", "conversa_equipe_criada", "mensagem_conversa_data"} <= indexes)

    def test_contagem_nao_lidas_independe_da_pagina(self):
        detail = self.get(f"/api/conversas/{self.antiga.pk}/")
        self.assertEqual(len(detail["mensagens"]), 30)
        self.assertEqual(detail["nao_lidas"], 1205)
        response = self.client.post(f"/api/conversas/{self.antiga.pk}/leitura/",
                                   {"mensagem_id": self.mensagens[-1].pk}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["nao_lidas"], 0)
        MensagemConversa.objects.create(conversa=self.antiga, autor=self.b, texto="Nova mensagem")
        self.assertEqual(self.get(f"/api/conversas/{self.antiga.pk}/")["nao_lidas"], 1)
