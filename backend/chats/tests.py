from rest_framework.test import APITestCase

from chats.models import Conversa, MensagemConversa
from usuarios.models import Equipe, Usuario, VinculoEquipe


class ConversasApiTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe Chat")
        cls.outra_equipe = Equipe.objects.create(nome="Outra Equipe Chat")
        cls.gestor = Usuario.objects.create_user(username="gestor.chat", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.chat", perfil="inspetor", equipe=cls.equipe)
        cls.terceiro = Usuario.objects.create_user(username="terceiro.chat", perfil="inspetor", equipe=cls.equipe)
        cls.externoinspetor = Usuario.objects.create_user(username="externo.chat", perfil="inspetor", equipe=cls.outra_equipe)
        cls.inativo = Usuario.objects.create_user(username="inativo.chat", perfil="inspetor", equipe=cls.equipe, is_active=False)

    def criar(self):
        self.client.force_authenticate(self.gestor)
        return self.client.post("/api/conversas/", {
            "titulo": "Visita técnica", "participante_ids": [self.inspetor.id],
        }, format="json")

    def test_cria_conversa_e_troca_mensagens_somente_entre_participantes(self):
        response = self.criar()
        self.assertEqual(response.status_code, 201)
        conversa_id = response.data["id"]
        self.assertEqual({item["id"] for item in response.data["participantes"]}, {self.gestor.id, self.inspetor.id})
        self.client.force_authenticate(self.inspetor)
        sent = self.client.post(f"/api/conversas/{conversa_id}/mensagens/", {"texto": "Relatório pronto"}, format="json")
        self.assertEqual(sent.status_code, 201)
        self.assertEqual(sent.data["autor_id"], self.inspetor.id)
        listed = self.client.get("/api/conversas/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data["resultados"][0]["mensagens"][0]["texto"], "Relatório pronto")
        self.assertEqual(MensagemConversa.objects.count(), 1)

    def test_terceiro_e_outra_equipe_nao_leem_nem_enviam(self):
        conversa_id = self.criar().data["id"]
        for user in (self.terceiro, self.externoinspetor):
            with self.subTest(user=user.username):
                self.client.force_authenticate(user)
                self.assertEqual(self.client.get("/api/conversas/").data["resultados"], [])
                self.assertEqual(self.client.get(f"/api/conversas/{conversa_id}/").status_code, 404)
                self.assertEqual(self.client.post(f"/api/conversas/{conversa_id}/mensagens/", {"texto": "Tentativa"}, format="json").status_code, 404)
        self.assertEqual(MensagemConversa.objects.count(), 0)

    def test_participante_transferido_nao_acessa_conversa_da_equipe_anterior(self):
        conversa_id = self.criar().data["id"]
        Usuario.objects.filter(pk=self.inspetor.id).update(equipe=self.outra_equipe)
        self.inspetor.refresh_from_db()
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.get("/api/conversas/").data["resultados"], [])
        self.assertEqual(self.client.get(f"/api/conversas/{conversa_id}/").status_code, 404)

    def test_rejeita_participantes_externos_inativos_e_mensagem_vazia(self):
        self.client.force_authenticate(self.gestor)
        for user_id in (self.externoinspetor.id, self.inativo.id):
            response = self.client.post("/api/conversas/", {"titulo": "Teste", "participante_ids": [user_id]}, format="json")
            self.assertEqual(response.status_code, 400)
        self.assertEqual(Conversa.objects.count(), 0)
        conversa_id = self.criar().data["id"]
        self.assertEqual(self.client.post(f"/api/conversas/{conversa_id}/mensagens/", {"texto": "   "}, format="json").status_code, 400)
        self.assertEqual(MensagemConversa.objects.count(), 0)

    def test_vinculo_revogado_bloqueia_acesso_mesmo_com_equipe_primaria(self):
        conversa_id = self.criar().data["id"]
        VinculoEquipe.objects.create(usuario=self.inspetor, equipe=self.equipe, papel="inspetor", ativo=False)
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.get("/api/conversas/").status_code, 403)
        self.assertEqual(self.client.post(f"/api/conversas/{conversa_id}/mensagens/", {"texto": "Tentativa"}, format="json").status_code, 403)

    def test_exige_autenticacao(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/conversas/").status_code, 401)

    def test_reenvio_apos_resposta_perdida_nao_duplica_mensagem(self):
        conversa_id = self.criar().data["id"]
        url = f"/api/conversas/{conversa_id}/mensagens/"
        payload = {"texto": "Uma única mensagem", "client_id": "ccdb3e91-7967-47ce-8758-c0fd308731b6"}
        primeiro = self.client.post(url, payload, format="json")
        segundo = self.client.post(url, payload, format="json")
        self.assertEqual(primeiro.status_code, 201)
        self.assertEqual(segundo.status_code, 200)
        self.assertEqual(primeiro.data, segundo.data)
        self.assertEqual(MensagemConversa.objects.count(), 1)
        conflito = self.client.post(url, {**payload, "texto": "Outro conteúdo"}, format="json")
        self.assertEqual(conflito.status_code, 409)
        self.assertEqual(MensagemConversa.objects.count(), 1)
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 201)
        self.client.force_authenticate(self.terceiro)
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 404)
        self.assertEqual(MensagemConversa.objects.count(), 2)

    def test_client_id_invalido_e_envios_distintos_com_mesmo_texto(self):
        conversa_id = self.criar().data["id"]
        url = f"/api/conversas/{conversa_id}/mensagens/"
        self.assertEqual(self.client.post(url, {"texto": "Oi", "client_id": "inválido"}, format="json").status_code, 400)
        for key in ("ccdb3e91-7967-47ce-8758-c0fd308731b6", "ccdb3e91-7967-47ce-8758-c0fd308731b7"):
            self.assertEqual(self.client.post(url, {"texto": "Oi", "client_id": key}, format="json").status_code, 201)
        self.assertEqual(MensagemConversa.objects.count(), 2)
