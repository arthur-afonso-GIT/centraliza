from datetime import timedelta

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from demandas.models import Demanda, EventoDemanda
from demandas.tests import criar_demanda_teste
from usuarios.models import Equipe, Usuario


class RegistroAndamentoTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="VISAT")
        cls.outra = Equipe.objects.create(nome="Outra equipe")
        cls.gestor = Usuario.objects.create_user(username="gestor", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor", perfil="inspetor", equipe=cls.equipe)
        cls.colega = Usuario.objects.create_user(username="colega", perfil="inspetor", equipe=cls.equipe)
        cls.externo = Usuario.objects.create_user(username="externo", perfil="gestor", equipe=cls.outra)
        cls.demanda = criar_demanda_teste(
            titulo="Inspeção", equipe=cls.equipe, criador=cls.gestor, responsavel=cls.inspetor,
            status=Demanda.Status.EM_ANDAMENTO, prazo=timezone.now() + timedelta(days=10),
        )

    def setUp(self):
        self.url = f"/api/demandas/{self.demanda.pk}/andamentos/"
        self.detalhe = f"/api/demandas/{self.demanda.pk}/"
        self.dados = {"realizado": "Visita realizada.\nEntrevistas concluídas.", "pendente": "Receber laudo."}
        self.client.force_authenticate(self.inspetor)

    def test_salva_campos_autor_data_sem_alterar_status_e_permanece_consultavel(self):
        anterior = self.demanda.atualizada_em
        response = self.client.post(self.url, self.dados, format="json")
        self.assertEqual(response.status_code, 201)
        evento = EventoDemanda.objects.get(demanda=self.demanda)
        self.assertEqual(evento.tipo, "andamento")
        self.assertEqual(evento.realizado, self.dados["realizado"])
        self.assertEqual(evento.pendente, self.dados["pendente"])
        self.assertEqual(evento.autor, self.inspetor)
        self.assertIsNotNone(evento.criado_em)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, Demanda.Status.EM_ANDAMENTO)
        self.assertGreater(self.demanda.atualizada_em, anterior)
        self.assertEqual(response.data["historico"][0]["id"], evento.id)
        for usuario in (self.inspetor, self.gestor):
            client = APIClient()
            client.force_authenticate(usuario)
            consulta = client.get(self.detalhe)
            self.assertEqual(consulta.status_code, 200)
            self.assertEqual(consulta.data["historico"][0]["pendente"], "Receber laudo.")
        self.demanda.status = Demanda.Status.CONCLUIDA
        self.demanda.save()
        self.assertEqual(self.client.get(self.detalhe).data["historico"][0]["id"], evento.id)

    def test_multiplos_registros_preservam_historico_mais_recente_primeiro(self):
        self.client.post(self.url, self.dados, format="json")
        self.client.post(self.url, {"realizado": "Laudo recebido.", "pendente": "Nenhuma pendência."}, format="json")
        historico = self.client.get(self.detalhe).data["historico"]
        self.assertEqual([e["realizado"] for e in historico], ["Laudo recebido.", self.dados["realizado"]])

    def test_aceita_correcao(self):
        self.demanda.status = Demanda.Status.EM_CORRECAO
        self.demanda.save()
        self.assertEqual(self.client.post(self.url, self.dados, format="json").status_code, 201)

    def test_bloqueia_fora_de_execucao(self):
        for estado in ("pendente", "aceita", "aguardando_avaliacao", "concluida", "cancelada"):
            with self.subTest(estado=estado):
                self.demanda.status = estado
                self.demanda.save()
                self.assertEqual(self.client.post(self.url, self.dados, format="json").status_code, 400)
        self.assertFalse(self.demanda.historico.exists())

    def test_exige_autenticacao_e_perfil_responsavel(self):
        for usuario, codigo in ((None, 401), (self.gestor, 403), (self.colega, 404), (self.externo, 404)):
            with self.subTest(usuario=usuario):
                self.client.force_authenticate(usuario)
                self.assertEqual(self.client.post(self.url, self.dados, format="json").status_code, codigo)
        self.assertFalse(self.demanda.historico.exists())

    def test_historico_nao_vaza_para_outro_inspetor_ou_equipe(self):
        self.client.post(self.url, self.dados, format="json")
        for usuario in (self.colega, self.externo):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(self.detalhe).status_code, 404)

    def test_gestor_participante_pode_consultar_mas_nao_registrar(self):
        self.demanda.equipes_participantes.add(self.outra)
        self.client.post(self.url, self.dados, format="json")
        self.client.force_authenticate(self.externo)
        self.assertEqual(self.client.get(self.detalhe).data["historico"][0]["realizado"], self.dados["realizado"])
        self.assertEqual(self.client.post(self.url, self.dados, format="json").status_code, 403)

    def test_valida_campos_e_nao_cria_registro_parcial(self):
        for campo in ("realizado", "pendente"):
            for invalido in ("", " \n ", None, "x" * 2001):
                with self.subTest(campo=campo, valor=invalido):
                    dados = {**self.dados, campo: invalido}
                    self.assertEqual(self.client.post(self.url, dados, format="json").status_code, 400)
            dados = self.dados.copy()
            del dados[campo]
            self.assertEqual(self.client.post(self.url, dados, format="json").status_code, 400)
        self.assertFalse(self.demanda.historico.exists())

    def test_limite_trim_e_autoria_nao_podem_ser_forjados(self):
        response = self.client.post(self.url, {
            "realizado": "x" * 2000, "pendente": "  Nenhuma pendência.  ",
            "autor": self.gestor.id, "tipo": "comentario", "demanda": 999,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        evento = self.demanda.historico.get()
        self.assertEqual(evento.pendente, "Nenhuma pendência.")
        self.assertEqual(evento.autor_id, self.inspetor.id)
        self.assertEqual(evento.tipo, "andamento")

    def test_registro_nao_oferece_edicao_ou_exclusao(self):
        self.client.post(self.url, self.dados, format="json")
        self.assertEqual(self.client.patch(self.url, self.dados, format="json").status_code, 405)
        self.assertEqual(self.client.delete(self.url).status_code, 405)
        self.assertEqual(self.demanda.historico.count(), 1)

    def test_banco_rejeita_andamento_sem_campos(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            EventoDemanda.objects.create(demanda=self.demanda, autor=self.inspetor, tipo="andamento")

    def test_sessao_sem_csrf_nao_pode_gravar(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.inspetor)
        self.assertEqual(client.post(self.url, self.dados, format="json").status_code, 403)
        self.assertFalse(self.demanda.historico.exists())
