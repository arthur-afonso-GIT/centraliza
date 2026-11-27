from rest_framework.test import APITestCase

from chats.models import Conversa
from usuarios.models import Equipe, Usuario, VinculoEquipe


class NotificacoesChatTest(APITestCase):
    url = "/api/notificacoes/chat/"

    @classmethod
    def setUpTestData(cls):
        equipe = Equipe.objects.create(nome="Equipe notificações")
        cls.outra_equipe = Equipe.objects.create(nome="Outra equipe notificações")
        cls.a = Usuario.objects.create_user(username="a.notifica", first_name="Ana", perfil="gestor", equipe=equipe)
        cls.b = Usuario.objects.create_user(username="b.notifica", first_name="Bruno", perfil="inspetor", equipe=equipe)
        cls.c = Usuario.objects.create_user(username="c.notifica", first_name="Carla", perfil="inspetor", equipe=equipe)
        cls.externo = Usuario.objects.create_user(username="externo.notifica", perfil="inspetor", equipe=cls.outra_equipe)
        cls.vistoria = Conversa.objects.create(titulo="Vistoria na fábrica", equipe=equipe, criador=cls.a)
        cls.vistoria.participantes.set([cls.a, cls.b])
        cls.relatorio = Conversa.objects.create(titulo="Relatório mensal", equipe=equipe, criador=cls.a)
        cls.relatorio.participantes.set([cls.a, cls.b])
        cls.privada = Conversa.objects.create(titulo="Somente A e C", equipe=equipe, criador=cls.a)
        cls.privada.participantes.set([cls.a, cls.c])

    def enviar(self, user, conversa, texto="Conteúdo reservado da mensagem"):
        self.client.force_authenticate(user)
        response = self.client.post(f"/api/conversas/{conversa.id}/mensagens/", {"texto": texto}, format="json")
        self.assertEqual(response.status_code, 201)
        return response.data["id"]

    def notificacoes(self, user):
        self.client.force_authenticate(user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        return response.data

    def test_resume_nao_lidas_por_conversa_sem_expor_o_texto(self):
        self.enviar(self.a, self.vistoria)
        ultima_vistoria = self.enviar(self.a, self.vistoria)
        ultima_relatorio = self.enviar(self.a, self.relatorio)
        dados = self.notificacoes(self.b)
        self.assertEqual(dados["total"], 3)
        self.assertEqual([item["id"] for item in dados["conversas"]], [self.relatorio.id, self.vistoria.id])
        vistoria = dados["conversas"][1]
        self.assertEqual((vistoria["titulo"], vistoria["nao_lidas"]), ("Vistoria na fábrica", 2))
        self.assertEqual(vistoria["ultima_mensagem"]["id"], ultima_vistoria)
        self.assertEqual(vistoria["ultima_mensagem"]["autor_nome"], "Ana")
        self.assertEqual(dados["conversas"][0]["ultima_mensagem"]["id"], ultima_relatorio)
        self.assertNotIn("Conteúdo reservado", str(dados))
        self.assertNotIn("texto", vistoria["ultima_mensagem"])

    def test_nao_avisa_o_proprio_autor(self):
        self.enviar(self.a, self.vistoria)
        self.enviar(self.a, self.relatorio)
        self.assertEqual(self.notificacoes(self.a), {"total": 0, "conversas": []})
        self.enviar(self.b, self.vistoria)
        self.assertEqual(self.notificacoes(self.a)["total"], 1)

    def test_leitura_registrada_zera_o_aviso_da_conversa(self):
        self.enviar(self.a, self.vistoria)
        ultima = self.enviar(self.a, self.vistoria)
        self.enviar(self.a, self.relatorio)
        self.client.force_authenticate(self.b)
        self.assertEqual(self.client.post(f"/api/conversas/{self.vistoria.id}/leitura/", {"mensagem_id": ultima}, format="json").status_code, 200)
        dados = self.notificacoes(self.b)
        self.assertEqual(dados["total"], 1)
        self.assertEqual([item["id"] for item in dados["conversas"]], [self.relatorio.id])
        nova = self.enviar(self.a, self.vistoria)
        dados = self.notificacoes(self.b)
        self.assertEqual(dados["total"], 2)
        self.assertEqual(dados["conversas"][0]["ultima_mensagem"]["id"], nova)

    def test_nao_expoe_conversas_de_que_a_pessoa_nao_participa(self):
        self.enviar(self.a, self.privada)
        self.assertEqual(self.notificacoes(self.b), {"total": 0, "conversas": []})
        self.assertEqual(self.notificacoes(self.c)["conversas"][0]["titulo"], "Somente A e C")
        self.assertEqual(self.notificacoes(self.externo), {"total": 0, "conversas": []})

    def test_vinculo_inativo_e_sessao_ausente_nao_recebem_avisos(self):
        self.enviar(self.a, self.vistoria)
        VinculoEquipe.objects.create(usuario=self.b, equipe=self.vistoria.equipe, papel="inspetor", ativo=False)
        self.client.force_authenticate(self.b)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_consulta_tem_custo_constante(self):
        for _ in range(3):
            self.enviar(self.a, self.vistoria)
            self.enviar(self.a, self.relatorio)
        self.client.force_authenticate(self.b)
        with self.assertNumQueries(3):
            self.client.get(self.url)
        for _ in range(5):
            self.enviar(self.a, self.vistoria)
        self.client.force_authenticate(self.b)
        with self.assertNumQueries(3):
            self.client.get(self.url)
