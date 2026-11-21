from rest_framework.test import APITestCase

from avisos.models import Aviso, LeituraAviso, RascunhoAviso
from usuarios.models import Equipe, Usuario


class RascunhoAvisoTest(APITestCase):
    url = "/api/avisos/rascunhos/"

    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe rascunhos")
        cls.outra = Equipe.objects.create(nome="Outra equipe")
        cls.autor = Usuario.objects.create_user(username="autor", equipe=cls.equipe)
        cls.colega = Usuario.objects.create_user(username="colega", equipe=cls.equipe)
        cls.gestor = Usuario.objects.create_user(username="gestor", perfil="gestor", equipe=cls.equipe)
        cls.externo = Usuario.objects.create_user(username="externo", perfil="gestor", equipe=cls.outra)

    def criar(self, user=None):
        self.client.force_authenticate(user or self.autor)
        response = self.client.post(self.url, {"titulo": "Escala provisória", "conteudo": "Texto para revisão."}, format="json")
        self.assertEqual(response.status_code, 201)
        return response.data["id"]

    def test_inspetor_e_coordenador_salvam_reabrem_e_revisam(self):
        for user in (self.autor, self.gestor):
            with self.subTest(perfil=user.perfil):
                pk = self.criar(user)
                detail = f"{self.url}{pk}/"
                self.assertEqual(self.client.get(detail).data["conteudo"], "Texto para revisão.")
                response = self.client.patch(detail, {"conteudo": "Texto revisado."}, format="json")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(self.client.get(self.url).data[0]["conteudo"], "Texto revisado.")
                draft = RascunhoAviso.objects.get(pk=pk)
                self.assertEqual(draft.autor_id, user.pk)
                self.assertEqual(draft.equipe_id, self.equipe.pk)

    def test_outros_usuarios_nao_listam_leem_ou_editam(self):
        pk = self.criar()
        for user in (self.colega, self.gestor, self.externo):
            with self.subTest(usuario=user.username):
                self.client.force_authenticate(user)
                self.assertEqual(self.client.get(self.url).data, [])
                self.assertEqual(self.client.get(f"{self.url}{pk}/").status_code, 404)
                self.assertEqual(self.client.patch(f"{self.url}{pk}/", {"titulo": "Inválido"}, format="json").status_code, 404)

    def test_nao_publica_nem_aparece_no_feed_ou_home(self):
        pk = self.criar()
        self.assertFalse(Aviso.objects.exists())
        for user in (self.autor, self.colega, self.gestor):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get("/api/avisos/").data["resultados"], [])
            response = self.client.get("/api/home/resumo/")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["avisos_ativos"], [])
            self.assertEqual(self.client.post(f"/api/avisos/{pk}/leitura/", {}, format="json").status_code, 404)
        self.assertFalse(LeituraAviso.objects.exists())

    def test_exige_sessao_e_equipe(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertEqual(self.client.post(self.url, {}, format="json").status_code, 401)
        self.autor.equipe = None
        self.client.force_authenticate(self.autor)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.assertEqual(self.client.post(self.url, {"titulo": "Título", "conteudo": "Texto"}, format="json").status_code, 403)

    def test_equipe_ativa_delimita_os_rascunhos(self):
        pk = self.criar()
        self.autor.equipe = self.outra
        self.assertEqual(self.client.get(self.url).data, [])
        self.assertEqual(self.client.get(f"{self.url}{pk}/").status_code, 404)

    def test_valida_texto_e_rejeita_campos_de_publicacao_ou_autoria(self):
        self.client.force_authenticate(self.autor)
        for dados in ({}, {"titulo": " ", "conteudo": "Texto"}, {"titulo": "Título", "conteudo": " "}, {"titulo": "a" * 201, "conteudo": "Texto"}):
            self.assertEqual(self.client.post(self.url, dados, format="json").status_code, 400)
        for campo in ("autor", "equipe", "publicado_em", "destinatario_ids"):
            self.assertEqual(self.client.post(self.url, {"titulo": "Título", "conteudo": "Texto", campo: 1}, format="json").status_code, 400)
        self.assertFalse(RascunhoAviso.objects.exists())
