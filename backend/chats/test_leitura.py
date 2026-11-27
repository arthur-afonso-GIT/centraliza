from rest_framework.test import APITestCase

from chats.models import Conversa, LeituraConversa
from usuarios.models import Equipe, Usuario


class LeituraConversaTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        equipe = Equipe.objects.create(nome="Equipe leitura")
        cls.a = Usuario.objects.create_user(username="a.leitura", password="senha-local-teste", perfil="gestor", equipe=equipe)
        cls.b = Usuario.objects.create_user(username="b.leitura", password="senha-local-teste", perfil="inspetor", equipe=equipe)
        cls.c = Usuario.objects.create_user(username="c.leitura", perfil="inspetor", equipe=equipe)
        cls.conversa = Conversa.objects.create(titulo="Primeira", equipe=equipe, criador=cls.a)
        cls.conversa.participantes.set([cls.a, cls.b])
        cls.outra = Conversa.objects.create(titulo="Segunda", equipe=equipe, criador=cls.a)
        cls.outra.participantes.set([cls.a, cls.b])

    def enviar(self, user, conversa):
        self.client.force_authenticate(user)
        response = self.client.post(f"/api/conversas/{conversa.id}/mensagens/", {"texto": "Mensagem de teste"}, format="json")
        self.assertEqual(response.status_code, 201)
        return response.data["id"]

    def listar(self, user):
        self.client.force_authenticate(user)
        response = self.client.get("/api/conversas/")
        self.assertEqual(response.status_code, 200)
        return response.data["resultados"]

    def marcar(self, user, conversa, mensagem_id):
        self.client.force_authenticate(user)
        return self.client.post(f"/api/conversas/{conversa.id}/leitura/", {"mensagem_id": mensagem_id}, format="json")

    def test_contagem_individual_persiste_apos_novo_login(self):
        primeira = self.enviar(self.a, self.conversa)
        self.enviar(self.b, self.conversa)
        ultima = self.enviar(self.a, self.conversa)
        self.assertEqual(next(c for c in self.listar(self.b) if c["id"] == self.conversa.id)["nao_lidas"], 2)
        self.assertEqual(next(c for c in self.listar(self.a) if c["id"] == self.conversa.id)["nao_lidas"], 1)
        self.client.force_authenticate(self.b)
        self.assertEqual(self.client.get(f"/api/conversas/{self.conversa.id}/").data["nao_lidas"], 2)
        self.assertEqual(LeituraConversa.objects.count(), 0)
        self.assertEqual(self.marcar(self.b, self.conversa, primeira).status_code, 200)
        self.assertEqual(next(c for c in self.listar(self.b) if c["id"] == self.conversa.id)["nao_lidas"], 1)
        self.assertEqual(self.marcar(self.b, self.conversa, ultima).status_code, 200)
        self.assertEqual(self.marcar(self.b, self.conversa, primeira).data["ultima_mensagem_lida_id"], ultima)
        self.assertEqual(next(c for c in self.listar(self.a) if c["id"] == self.conversa.id)["nao_lidas"], 1)
        self.client.force_authenticate(None)
        credenciais = {"username": self.b.username, "password": "senha-local-teste"}
        self.assertEqual(self.client.post("/api/auth/login/", credenciais, format="json").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        self.assertEqual(self.client.post("/api/auth/login/", credenciais, format="json").status_code, 200)
        self.assertEqual(next(c for c in self.client.get("/api/conversas/").data["resultados"] if c["id"] == self.conversa.id)["nao_lidas"], 0)
        self.enviar(self.a, self.conversa)
        self.assertEqual(next(c for c in self.listar(self.b) if c["id"] == self.conversa.id)["nao_lidas"], 1)

    def test_leitura_nao_altera_ordem_estavel(self):
        mensagem = self.enviar(self.a, self.conversa)
        self.enviar(self.a, self.outra)
        self.assertEqual([c["id"] for c in self.listar(self.b)], [self.outra.id, self.conversa.id])
        self.assertEqual(self.marcar(self.b, self.conversa, mensagem).status_code, 200)
        self.assertEqual([c["id"] for c in self.listar(self.b)], [self.outra.id, self.conversa.id])

    def test_leitura_nao_autorizada_ou_mensagem_de_outra_conversa(self):
        mensagem = self.enviar(self.a, self.conversa)
        self.assertEqual(self.marcar(self.c, self.conversa, mensagem).status_code, 404)
        self.assertEqual(self.marcar(self.b, self.outra, mensagem).status_code, 400)
        self.assertEqual(self.marcar(self.b, self.conversa, 0).status_code, 400)
        self.assertEqual(LeituraConversa.objects.count(), 0)
