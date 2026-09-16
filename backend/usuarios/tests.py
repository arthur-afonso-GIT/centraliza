from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

from demandas.models import Demanda
from usuarios.models import Equipe, Usuario


class RegrasDoModeloTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe_a = Equipe.objects.create(nome="Equipe A")
        cls.equipe_b = Equipe.objects.create(nome="Equipe B")
        cls.gestor = Usuario.objects.create_user(
            username="gestor.a", perfil="gestor", equipe=cls.equipe_a
        )
        cls.inspetor = Usuario.objects.create_user(
            username="inspetor.a", perfil="inspetor", equipe=cls.equipe_a
        )
        cls.inspetor_b = Usuario.objects.create_user(
            username="inspetor.b", perfil="inspetor", equipe=cls.equipe_b
        )

    def criar_demanda(self, **alteracoes):
        dados = {
            "titulo": "Inspeção de teste",
            "prazo": "2026-09-15",
            "equipe": self.equipe_a,
            "criador": self.gestor,
            "responsavel": self.inspetor,
        }
        dados.update(alteracoes)
        return Demanda(**dados)

    def test_aceita_inspetor_da_mesma_equipe(self):
        demanda = self.criar_demanda()
        demanda.save()
        self.assertEqual(demanda.responsavel, self.inspetor)

    def test_aceita_demanda_sem_responsavel(self):
        demanda = self.criar_demanda(responsavel=None)
        demanda.save()
        self.assertIsNone(demanda.responsavel)

    def test_rejeita_responsavel_de_outra_equipe(self):
        demanda = self.criar_demanda(responsavel=self.inspetor_b)
        with self.assertRaisesMessage(ValidationError, "equipe da demanda"):
            demanda.save()

    def test_rejeita_gestor_como_responsavel(self):
        demanda = self.criar_demanda(responsavel=self.gestor)
        with self.assertRaisesMessage(ValidationError, "Atribua a demanda a um inspetor"):
            demanda.save()

    def test_criticidade_independe_do_status(self):
        demanda = self.criar_demanda(status="pendente", critica=True)
        demanda.save()
        self.assertEqual(demanda.status, "pendente")
        self.assertTrue(demanda.critica)


class ListaInspetoresTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe seleção")
        outra = Equipe.objects.create(nome="Outra equipe seleção")
        cls.gestor = Usuario.objects.create_user(username="gestor.selecao", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.selecao", first_name="Ana", perfil="inspetor", equipe=cls.equipe)
        Usuario.objects.create_user(username="inativo.selecao", perfil="inspetor", equipe=cls.equipe, is_active=False)
        Usuario.objects.create_user(username="externo.selecao", perfil="inspetor", equipe=outra)

    def test_gestor_recebe_somente_inspetores_ativos_da_equipe(self):
        self.client.force_authenticate(self.gestor)
        with self.assertNumQueries(1):
            response = self.client.get("/api/usuarios/inspetores/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["resultados"], [{"id": self.inspetor.id, "nome": "Ana"}])

    def test_inspetor_e_sessao_ausente_sao_bloqueados(self):
        self.assertEqual(self.client.get("/api/usuarios/inspetores/").status_code, 401)
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.get("/api/usuarios/inspetores/").status_code, 403)


class AdministracaoEquipeTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe administrada")
        cls.outra = Equipe.objects.create(nome="Equipe externa")
        cls.admin = Usuario.objects.create_user(username="admin.equipe", password="SenhaForte@2026", perfil="gestor", equipe=cls.equipe, pode_administrar_equipe=True)
        cls.gestor = Usuario.objects.create_user(username="gestor.comum", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.equipe", first_name="Iara", perfil="inspetor", equipe=cls.equipe)
        cls.externo = Usuario.objects.create_user(username="usuario.externo", perfil="inspetor", equipe=cls.outra)

    def test_integrante_pode_consultar_apenas_sua_equipe(self):
        self.client.force_authenticate(self.inspetor)
        response = self.client.get("/api/equipe/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["nome"], self.equipe.nome)
        self.assertFalse(response.data["pode_administrar"])
        self.assertEqual({item["id"] for item in response.data["membros"]}, {self.admin.id, self.gestor.id, self.inspetor.id})

    def test_admin_cria_conta_com_senha_protegida(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post("/api/equipe/usuarios/", {
            "username": "nova.inspetora", "password": "NovaSenha@2026", "first_name": "Nova",
            "perfil": "inspetor", "is_active": True, "pode_administrar_equipe": False,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        criada = Usuario.objects.get(username="nova.inspetora")
        self.assertEqual(criada.equipe, self.equipe)
        self.assertTrue(criada.check_password("NovaSenha@2026"))
        self.assertNotIn("password", response.data)

    def test_usuario_sem_permissao_nao_administra(self):
        for usuario in (self.gestor, self.inspetor):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.post("/api/equipe/usuarios/", {"username": "bloqueado"}, format="json").status_code, 403)

    def test_admin_nao_acessa_conta_de_outra_equipe(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/equipe/usuarios/{self.externo.id}/", {"first_name": "Alterado"}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_admin_nao_remove_a_propria_permissao(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/equipe/usuarios/{self.admin.id}/", {"pode_administrar_equipe": False}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("própria permissão", response.data["detail"])

    def test_bloqueia_desativacao_com_demanda_ativa(self):
        Demanda.objects.create(titulo="Ativa", prazo="2026-09-15", equipe=self.equipe, criador=self.admin, responsavel=self.inspetor)
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/equipe/usuarios/{self.inspetor.id}/", {"is_active": False}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Reatribua", response.data["detail"])

    def test_permite_desativar_inspetor_sem_demanda_ativa(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/equipe/usuarios/{self.inspetor.id}/", {"is_active": False}, format="json")
        self.assertEqual(response.status_code, 200)
        self.inspetor.refresh_from_db()
        self.assertFalse(self.inspetor.is_active)

    def test_admin_pode_arquivar_e_reativar_sua_equipe(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(f"/api/equipes/{self.equipe.id}/", {"arquivada": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["arquivada"])
        response = self.client.patch(f"/api/equipes/{self.equipe.id}/", {"arquivada": False}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["arquivada"])

    def test_gestor_sem_permissao_nao_arquiva(self):
        self.client.force_authenticate(self.gestor)
        response = self.client.patch(f"/api/equipes/{self.equipe.id}/", {"arquivada": True}, format="json")
        self.assertEqual(response.status_code, 403)
