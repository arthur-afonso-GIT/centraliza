from datetime import date, timedelta
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from demandas.models import AnexoDemanda, Demanda, EventoDemanda
from usuarios.models import Equipe, Usuario


class ListagemDemandasTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.a = Equipe.objects.create(nome="Equipe A")
        cls.b = Equipe.objects.create(nome="Equipe B")
        cls.gestor_a = Usuario.objects.create_user(username="gestor.a", password="senha-segura-a", perfil="gestor", equipe=cls.a)
        cls.inspetor_a = Usuario.objects.create_user(username="inspetor.a", perfil="inspetor", equipe=cls.a)
        cls.outro_a = Usuario.objects.create_user(username="outro.a", perfil="inspetor", equipe=cls.a)
        cls.gestor_b = Usuario.objects.create_user(username="gestor.b", perfil="gestor", equipe=cls.b)
        cls.inspetor_b = Usuario.objects.create_user(username="inspetor.b", perfil="inspetor", equipe=cls.b)
        cls.sem_equipe = Usuario.objects.create_user(username="sem.equipe", perfil="gestor")
        cls.criar("Pendente crítica A", cls.a, cls.gestor_a, cls.inspetor_a, "pendente", True, 1)
        cls.criar("Em andamento A", cls.a, cls.gestor_a, cls.inspetor_a, "em_andamento", False, 2)
        cls.criar("Outro inspetor A", cls.a, cls.gestor_a, cls.outro_a, "pendente", False, 3)
        cls.criar("Não atribuída A", cls.a, cls.gestor_a, None, "pendente", False, 4)
        cls.criar("Concluída A", cls.a, cls.gestor_a, cls.inspetor_a, "concluida", True, 5)
        cls.criar("Pendente B", cls.b, cls.gestor_b, cls.inspetor_b, "pendente", True, 0)

    @classmethod
    def criar(cls, titulo, equipe, criador, responsavel, status, critica, dias):
        return Demanda.objects.create(
            titulo=titulo, equipe=equipe, criador=criador, responsavel=responsavel,
            status=status, critica=critica, prazo=date(2026, 9, 10) + timedelta(days=dias),
        )

    def autenticar(self, user):
        self.client.force_authenticate(user=user)

    def test_exige_sessao(self):
        response = self.client.get("/api/demandas/")
        self.assertEqual(response.status_code, 401)

    def test_gestor_ve_ativas_da_propria_equipe_inclusive_nao_atribuida(self):
        self.autenticar(self.gestor_a)
        response = self.client.get("/api/demandas/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 4)
        self.assertEqual([item["titulo"] for item in response.data["results"]], [
            "Pendente crítica A", "Em andamento A", "Outro inspetor A", "Não atribuída A",
        ])
        self.assertIsNone(response.data["results"][-1]["responsavel"])

    def test_inspetor_ve_apenas_as_suas_ativas(self):
        self.autenticar(self.inspetor_a)
        response = self.client.get("/api/demandas/")
        self.assertEqual(response.data["count"], 2)
        self.assertEqual({item["titulo"] for item in response.data["results"]}, {"Pendente crítica A", "Em andamento A"})

    def test_combina_status_e_criticidade(self):
        self.autenticar(self.gestor_a)
        response = self.client.get("/api/demandas/?status=pendente&critica=true")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["titulo"], "Pendente crítica A")

    def test_rejeita_parametros_invalidos(self):
        self.autenticar(self.gestor_a)
        for query in ["status=concluida", "critica=sim", "atrasada=sim", "responsavel=abc", "responsavel=0", "prazo_de=20-09-2026", "prazo_de=2026-10-10&prazo_ate=2026-10-01", "page_size=0", "page_size=51", "page_size=abc", "page=abc"]:
            with self.subTest(query=query):
                self.assertEqual(self.client.get(f"/api/demandas/?{query}").status_code, 400)

    def test_combina_responsavel_periodo_e_atraso(self):
        ontem = date.today() - timedelta(days=1)
        amanha = date.today() + timedelta(days=1)
        antiga = self.criar("Atrasada filtrável", self.a, self.gestor_a, self.inspetor_a, "pendente", False, 20)
        antiga.prazo = ontem; antiga.save()
        futura = self.criar("Futura filtrável", self.a, self.gestor_a, self.inspetor_a, "pendente", False, 21)
        futura.prazo = amanha; futura.save()
        self.autenticar(self.gestor_a)
        response = self.client.get(f"/api/demandas/?responsavel={self.inspetor_a.id}&prazo_de={ontem.isoformat()}&prazo_ate={ontem.isoformat()}&atrasada=true")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["titulo"] for item in response.data["results"]], ["Atrasada filtrável"])
        self.assertTrue(response.data["results"][0]["atrasada"])
        response = self.client.get(f"/api/demandas/?responsavel={self.inspetor_a.id}&atrasada=false")
        self.assertIn("Futura filtrável", [item["titulo"] for item in response.data["results"]])

    def test_inspetor_nao_filtra_por_responsavel(self):
        self.autenticar(self.inspetor_a)
        self.assertEqual(self.client.get(f"/api/demandas/?responsavel={self.inspetor_a.id}").status_code, 403)

    def test_pagina_fora_do_intervalo_retorna_404(self):
        self.autenticar(self.gestor_a)
        self.assertEqual(self.client.get("/api/demandas/?page=99").status_code, 404)

    def test_usuario_sem_equipe_recebe_403(self):
        self.autenticar(self.sem_equipe)
        self.assertEqual(self.client.get("/api/demandas/").status_code, 403)

    def test_exclusao_direta_nao_e_oferecida(self):
        self.autenticar(self.gestor_a)
        self.assertEqual(self.client.delete("/api/demandas/", {}).status_code, 405)


class SessaoTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        equipe = Equipe.objects.create(nome="Equipe sessão")
        cls.usuario = Usuario.objects.create_user(
            username="gestor.sessao", password="senha-forte-teste", perfil="gestor", equipe=equipe,
            first_name="Gestor", last_name="Teste",
        )

    def test_fluxo_csrf_login_me_logout(self):
        client = APIClient(enforce_csrf_checks=True)
        csrf_response = client.get("/api/auth/csrf/")
        token = csrf_response.data["csrfToken"]
        self.assertIn("centraliza_csrftoken", csrf_response.cookies)
        sem_csrf = client.post("/api/auth/login/", {"username": "gestor.sessao", "password": "senha-forte-teste"})
        self.assertEqual(sem_csrf.status_code, 403)
        login_response = client.post(
            "/api/auth/login/", {"username": "gestor.sessao", "password": "senha-forte-teste"},
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.data["perfil"], "gestor")
        self.assertTrue(login_response.cookies["centraliza_session"]["httponly"])
        self.assertEqual(client.get("/api/auth/me/").data["nome"], "Gestor Teste")
        # O Django rotaciona o token CSRF após autenticar.
        rotated_token = client.cookies["centraliza_csrftoken"].value
        logout_response = client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=rotated_token)
        self.assertEqual(logout_response.status_code, 204)
        self.assertEqual(client.get("/api/auth/me/").status_code, 401)

    def test_login_invalido_nao_revela_conta(self):
        client = APIClient(enforce_csrf_checks=True)
        token = client.get("/api/auth/csrf/").data["csrfToken"]
        response = client.post(
            "/api/auth/login/", {"username": "gestor.sessao", "password": "errada"},
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["detail"], "Credenciais inválidas.")


class DetalheHistoricoTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe detalhe")
        cls.outra_equipe = Equipe.objects.create(nome="Outra equipe detalhe")
        cls.gestor = Usuario.objects.create_user(username="gestor.detalhe", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.detalhe", perfil="inspetor", equipe=cls.equipe)
        cls.outro_inspetor = Usuario.objects.create_user(username="outro.detalhe", perfil="inspetor", equipe=cls.equipe)
        cls.gestor_externo = Usuario.objects.create_user(username="gestor.externo", perfil="gestor", equipe=cls.outra_equipe)
        cls.demanda = Demanda.objects.create(
            titulo="Demanda com detalhe", descricao="Descrição completa", equipe=cls.equipe,
            criador=cls.gestor, responsavel=cls.inspetor, status="pendente",
            prioridade="alta", prazo=date(2026, 9, 20), critica=True,
        )

    def test_detalhe_respeita_equipe_e_responsavel(self):
        for usuario in (self.gestor, self.inspetor):
            with self.subTest(usuario=usuario.username):
                self.client.force_authenticate(usuario)
                response = self.client.get(f"/api/demandas/{self.demanda.id}/")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["descricao"], "Descrição completa")
                self.assertEqual(response.data["historico"], [])
        for usuario in (self.outro_inspetor, self.gestor_externo):
            with self.subTest(usuario=usuario.username):
                self.client.force_authenticate(usuario)
                self.assertEqual(self.client.get(f"/api/demandas/{self.demanda.id}/").status_code, 404)

    def test_inspetor_executa_transicoes_e_historico_permanece_consistente(self):
        self.client.force_authenticate(self.inspetor)
        primeira = self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "em_andamento"})
        self.assertEqual(primeira.status_code, 200)
        self.assertEqual(primeira.data["status"], "em_andamento")
        self.assertEqual(primeira.data["historico"][0]["status_anterior"], "pendente")
        segunda = self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "aguardando_avaliacao", "texto": "Atividade executada."})
        self.assertEqual(segunda.status_code, 200)
        self.client.force_authenticate(self.gestor)
        terceira = self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "concluida"})
        self.assertEqual(terceira.status_code, 200)
        self.assertEqual(EventoDemanda.objects.filter(demanda=self.demanda).count(), 3)
        self.assertEqual(list(EventoDemanda.objects.filter(demanda=self.demanda).values_list("status_novo", flat=True)), ["concluida", "aguardando_avaliacao", "em_andamento"])
        self.client.force_authenticate(self.inspetor)
        invalida = self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "em_andamento"})
        self.assertEqual(invalida.status_code, 400)
        self.assertEqual(EventoDemanda.objects.filter(demanda=self.demanda).count(), 3)

    def test_resumo_correcao_e_cancelamento_obrigam_texto(self):
        self.demanda.status = "em_andamento"
        self.demanda.save()
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "aguardando_avaliacao"}).status_code, 400)
        self.assertEqual(EventoDemanda.objects.count(), 0)
        self.assertEqual(self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "aguardando_avaliacao", "texto": "Relatório enviado."}).status_code, 200)
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "em_correcao"}).status_code, 400)
        response = self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "em_correcao", "texto": "Inclua as fotografias."})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["historico"][0]["texto"], "Inclua as fotografias.")

    def test_gestor_cancela_estado_ativo_com_justificativa(self):
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "cancelada"}).status_code, 400)
        response = self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "cancelada", "texto": "Solicitação retirada pela origem."})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "cancelada")

    def test_gestor_nao_altera_status_e_outro_inspetor_nao_descobre_registro(self):
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "em_andamento"}).status_code, 403)
        self.client.force_authenticate(self.outro_inspetor)
        self.assertEqual(self.client.patch(f"/api/demandas/{self.demanda.id}/status/", {"status": "em_andamento"}).status_code, 404)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, "pendente")

    def test_comentario_valida_texto_autor_e_acesso(self):
        self.client.force_authenticate(self.gestor)
        response = self.client.post(f"/api/demandas/{self.demanda.id}/historico/", {"texto": "  Registro da gestão.  "})
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["texto"], "Registro da gestão.")
        self.assertEqual(response.data["autor"]["id"], self.gestor.id)
        self.assertEqual(self.client.post(f"/api/demandas/{self.demanda.id}/historico/", {"texto": "  "}).status_code, 400)
        self.client.force_authenticate(self.gestor_externo)
        self.assertEqual(self.client.post(f"/api/demandas/{self.demanda.id}/historico/", {"texto": "Indevido"}).status_code, 404)
        self.assertEqual(EventoDemanda.objects.filter(demanda=self.demanda).count(), 1)

    def test_historico_nao_oferece_edicao_ou_exclusao(self):
        self.client.force_authenticate(self.gestor)
        url = f"/api/demandas/{self.demanda.id}/historico/"
        self.assertEqual(self.client.patch(url, {"texto": "alterado"}).status_code, 405)
        self.assertEqual(self.client.delete(url).status_code, 405)


class AnexosDemandaTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe anexos")
        cls.outra = Equipe.objects.create(nome="Equipe externa anexos")
        cls.gestor = Usuario.objects.create_user(username="gestor.anexos", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.anexos", perfil="inspetor", equipe=cls.equipe)
        cls.outro = Usuario.objects.create_user(username="outro.anexos", perfil="inspetor", equipe=cls.equipe)
        cls.externo = Usuario.objects.create_user(username="externo.anexos", perfil="gestor", equipe=cls.outra)
        cls.demanda = Demanda.objects.create(
            titulo="Demanda com evidências", prazo=date(2026, 10, 20), equipe=cls.equipe,
            criador=cls.gestor, responsavel=cls.inspetor,
        )

    def setUp(self):
        self.uploads = TemporaryDirectory()
        self.settings = override_settings(MEDIA_ROOT=self.uploads.name)
        self.settings.enable()

    def tearDown(self):
        self.settings.disable()
        self.uploads.cleanup()

    @staticmethod
    def pdf(nome="evidencia.pdf"):
        return SimpleUploadedFile(nome, b"%PDF-1.4\nconteudo de teste", content_type="application/pdf")

    def test_inspetor_atribuido_adiciona_lista_e_baixa_anexo(self):
        self.client.force_authenticate(self.inspetor)
        url = f"/api/demandas/{self.demanda.id}/anexos/"
        criado = self.client.post(url, {"arquivo": self.pdf()}, format="multipart")
        self.assertEqual(criado.status_code, 201)
        self.assertEqual(criado.data["nome_original"], "evidencia.pdf")
        self.assertNotIn("arquivo", criado.data)
        self.assertEqual(self.client.get(url).data["resultados"][0]["id"], criado.data["id"])
        download = self.client.get(criado.data["download_url"])
        self.assertEqual(download.status_code, 200)
        self.assertEqual(b"".join(download.streaming_content), b"%PDF-1.4\nconteudo de teste")
        self.assertEqual(download["X-Content-Type-Options"], "nosniff")
        self.assertEqual(EventoDemanda.objects.get(tipo="anexo_adicionado").autor, self.inspetor)

    def test_valida_formato_assinatura_e_tamanho(self):
        self.client.force_authenticate(self.gestor)
        url = f"/api/demandas/{self.demanda.id}/anexos/"
        casos = [
            SimpleUploadedFile("evidencia.exe", b"arquivo", content_type="application/octet-stream"),
            SimpleUploadedFile("falso.pdf", b"nao e pdf", content_type="application/pdf"),
            SimpleUploadedFile("vazio.png", b"", content_type="image/png"),
        ]
        for arquivo in casos:
            with self.subTest(nome=arquivo.name):
                self.assertEqual(self.client.post(url, {"arquivo": arquivo}, format="multipart").status_code, 400)
        grande = SimpleUploadedFile("grande.pdf", b"%PDF-" + b"0" * (10 * 1024 * 1024), content_type="application/pdf")
        self.assertEqual(self.client.post(url, {"arquivo": grande}, format="multipart").status_code, 400)
        self.assertEqual(AnexoDemanda.objects.count(), 0)

    def test_acesso_e_remocao_logica_respeitam_permissoes(self):
        self.client.force_authenticate(self.gestor)
        criado = self.client.post(f"/api/demandas/{self.demanda.id}/anexos/", {"arquivo": self.pdf()}, format="multipart")
        anexo_url = f"/api/demandas/{self.demanda.id}/anexos/{criado.data['id']}/"
        self.client.force_authenticate(self.outro)
        self.assertEqual(self.client.delete(anexo_url).status_code, 404)
        self.client.force_authenticate(self.externo)
        self.assertEqual(self.client.get(criado.data["download_url"]).status_code, 404)
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.delete(anexo_url).status_code, 204)
        self.assertEqual(self.client.get(criado.data["download_url"]).status_code, 404)
        self.assertIsNotNone(AnexoDemanda.objects.get(pk=criado.data["id"]).removido_em)
        self.assertTrue(EventoDemanda.objects.filter(tipo="anexo_removido", texto="Anexo removido: evidencia.pdf").exists())

    def test_demanda_encerrada_nao_recebe_anexo(self):
        self.demanda.status = "concluida"
        self.demanda.save()
        self.client.force_authenticate(self.gestor)
        response = self.client.post(f"/api/demandas/{self.demanda.id}/anexos/", {"arquivo": self.pdf()}, format="multipart")
        self.assertEqual(response.status_code, 400)


class GerenciamentoDemandasTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe gestão")
        cls.outra = Equipe.objects.create(nome="Outra equipe gestão")
        cls.gestor = Usuario.objects.create_user(username="gestor.crud", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.crud", perfil="inspetor", equipe=cls.equipe)
        cls.segundo = Usuario.objects.create_user(username="inspetor2.crud", perfil="inspetor", equipe=cls.equipe)
        cls.externo = Usuario.objects.create_user(username="inspetor.externo.crud", perfil="inspetor", equipe=cls.outra)

    def payload(self):
        return {"titulo": "Nova inspeção", "descricao": "Descrição", "origem": "MPT", "prioridade": "alta", "prazo": "2026-10-20", "critica": True, "responsavel_id": self.inspetor.id}

    def test_gestor_cria_demanda_atribuida_com_historico(self):
        self.client.force_authenticate(self.gestor)
        response = self.client.post("/api/demandas/", self.payload())
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["responsavel"]["id"], self.inspetor.id)
        self.assertEqual(response.data["origem"], "MPT")
        self.assertEqual([item["tipo"] for item in response.data["historico"]], ["responsavel_alterado", "demanda_criada"])

    def test_inspetor_nao_cria_nem_edita(self):
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.post("/api/demandas/", self.payload()).status_code, 403)
        self.client.force_authenticate(self.gestor)
        demanda = Demanda.objects.create(titulo="Protegida", prazo=date(2026, 10, 20), equipe=self.equipe, criador=self.gestor, responsavel=self.inspetor)
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.patch(f"/api/demandas/{demanda.id}/", {"titulo": "Alterada"}).status_code, 403)

    def test_rejeita_responsavel_externo(self):
        self.client.force_authenticate(self.gestor)
        payload = self.payload(); payload["responsavel_id"] = self.externo.id
        self.assertEqual(self.client.post("/api/demandas/", payload).status_code, 400)
        self.assertEqual(Demanda.objects.count(), 0)

    def test_gestor_edita_e_reatribui_com_eventos_separados(self):
        demanda = Demanda.objects.create(titulo="Original", prazo=date(2026, 10, 20), equipe=self.equipe, criador=self.gestor, responsavel=self.inspetor)
        self.client.force_authenticate(self.gestor)
        response = self.client.patch(f"/api/demandas/{demanda.id}/", {"titulo": "Revisada", "responsavel_id": self.segundo.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["titulo"], "Revisada")
        self.assertEqual(response.data["responsavel"]["id"], self.segundo.id)
        self.assertEqual({item["tipo"] for item in response.data["historico"]}, {"demanda_editada", "responsavel_alterado"})

    def test_demanda_encerrada_nao_pode_ser_editada(self):
        demanda = Demanda.objects.create(titulo="Encerrada", prazo=date(2026, 10, 20), equipe=self.equipe, criador=self.gestor, status="concluida")
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.patch(f"/api/demandas/{demanda.id}/", {"titulo": "Alterada"}).status_code, 400)
