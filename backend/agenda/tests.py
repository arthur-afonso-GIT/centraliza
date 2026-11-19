from datetime import datetime, timedelta
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APITestCase

from agenda.models import Compromisso
from demandas.models import Demanda
from usuarios.models import Equipe, Usuario, VinculoEquipe


class CompromissoModelTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe agenda")
        cls.outra = Equipe.objects.create(nome="Outra equipe agenda")
        cls.gestor = Usuario.objects.create_user(username="gestor.agenda", perfil="gestor", equipe=cls.equipe)
        cls.gestor_externo = Usuario.objects.create_user(username="gestor.agenda.externo", perfil="gestor", equipe=cls.outra)
        cls.inicio = datetime(2026, 9, 21, 9, tzinfo=ZoneInfo("America/Fortaleza"))

    def test_exige_fim_posterior_ao_inicio(self):
        with self.assertRaises(ValidationError):
            Compromisso.objects.create(
                titulo="Inválido", tipo="reuniao", inicio=self.inicio, fim=self.inicio,
                equipe=self.equipe, criador=self.gestor,
            )

    def test_exige_criador_da_mesma_equipe(self):
        with self.assertRaises(ValidationError):
            Compromisso.objects.create(
                titulo="Equipe inválida", tipo="atividade", inicio=self.inicio,
                fim=self.inicio + timedelta(hours=1), equipe=self.equipe, criador=self.gestor_externo,
            )

    def test_aceita_intervalo_consciente_valido(self):
        compromisso = Compromisso.objects.create(
            titulo="Reunião válida", tipo="reuniao", inicio=self.inicio,
            fim=self.inicio + timedelta(hours=1), equipe=self.equipe, criador=self.gestor,
        )
        self.assertTrue(compromisso.inicio.tzinfo is not None)


class CompromissoListagemTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe API agenda")
        cls.outra = Equipe.objects.create(nome="Outra equipe API agenda")
        cls.gestor = Usuario.objects.create_user(username="gestor.api.agenda", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.api.agenda", perfil="inspetor", equipe=cls.equipe)
        cls.segundo = Usuario.objects.create_user(username="segundo.api.agenda", perfil="inspetor", equipe=cls.equipe)
        cls.gestor_externo = Usuario.objects.create_user(username="externo.api.agenda", perfil="gestor", equipe=cls.outra)
        zone = ZoneInfo("America/Fortaleza")
        cls.inicio = datetime(2026, 9, 21, tzinfo=zone)
        cls.criar("Dentro", cls.inicio + timedelta(hours=9), cls.inicio + timedelta(hours=10), cls.equipe, cls.gestor, [cls.inspetor])
        cls.criar("Atravessa início", cls.inicio - timedelta(hours=1), cls.inicio + timedelta(hours=1), cls.equipe, cls.gestor, [cls.segundo])
        cls.criar("Termina no início", cls.inicio - timedelta(hours=2), cls.inicio, cls.equipe, cls.gestor, [cls.inspetor])
        cls.criar("Começa no fim", cls.inicio + timedelta(days=1), cls.inicio + timedelta(days=1, hours=1), cls.equipe, cls.gestor, [cls.inspetor])
        cls.criar("Outra equipe", cls.inicio + timedelta(hours=8), cls.inicio + timedelta(hours=9), cls.outra, cls.gestor_externo, [])

    @classmethod
    def criar(cls, titulo, inicio, fim, equipe, criador, participantes):
        compromisso = Compromisso.objects.create(titulo=titulo, tipo="reuniao", inicio=inicio, fim=fim, equipe=equipe, criador=criador)
        compromisso.participantes.set(participantes)

    def url(self, inicio=None, fim=None):
        params = {"inicio": (inicio or self.inicio).isoformat(), "fim": (fim or self.inicio + timedelta(days=1)).isoformat()}
        return f"/api/compromissos/?{urlencode(params)}"

    def test_gestor_recebe_sobreposicao_da_equipe_com_limites_semiabertos(self):
        self.client.force_authenticate(self.gestor)
        with self.assertNumQueries(2):
            response = self.client.get(self.url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["titulo"] for item in response.data["results"]], ["Atravessa início", "Dentro"])
        self.assertEqual(response.data["timezone"], "America/Fortaleza")
        self.assertTrue(response.data["results"][0]["inicio"].endswith("-03:00"))

    def test_inspetor_recebe_somente_compromissos_em_que_participa(self):
        self.client.force_authenticate(self.inspetor)
        response = self.client.get(self.url())
        self.assertEqual([item["titulo"] for item in response.data["results"]], ["Dentro"])

    def test_rejeita_parametros_ausentes_naive_invertidos_e_intervalo_longo(self):
        self.client.force_authenticate(self.gestor)
        queries = [
            "/api/compromissos/",
            "/api/compromissos/?inicio=2026-09-21T00:00:00&fim=2026-09-22T00:00:00",
            self.url(self.inicio + timedelta(days=1), self.inicio),
            self.url(self.inicio, self.inicio + timedelta(days=43)),
        ]
        for url in queries:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 400)

    def test_exige_sessao(self):
        self.assertEqual(self.client.get(self.url()).status_code, 401)


class GerenciamentoAgendaTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe gestão agenda")
        cls.outra = Equipe.objects.create(nome="Outra gestão agenda")
        cls.gestor = Usuario.objects.create_user(username="gestor.gerencia.agenda", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.gerencia.agenda", perfil="inspetor", equipe=cls.equipe)
        cls.segundo = Usuario.objects.create_user(username="segundo.gerencia.agenda", perfil="inspetor", equipe=cls.equipe)
        cls.externo = Usuario.objects.create_user(username="externo.gerencia.agenda", perfil="inspetor", equipe=cls.outra)
        cls.demanda = Demanda.objects.create(titulo="Demanda da agenda", sei_numero="TESTE-AGENDA-1", prazo=datetime(2026, 10, 30).date(), equipe=cls.equipe, criador=cls.gestor, responsavel=cls.inspetor)

    def payload(self, **changes):
        data = {
            "titulo": "Reunião operacional", "descricao": "Alinhamento", "tipo": "reuniao",
            "inicio": "2026-10-20T09:00:00-03:00", "fim": "2026-10-20T10:00:00-03:00",
            "participante_ids": [self.inspetor.id], "demanda_id": self.demanda.id,
        }
        data.update(changes)
        return data

    def test_gestor_cria_edita_e_cancela_compromisso(self):
        self.client.force_authenticate(self.gestor)
        criado = self.client.post("/api/compromissos/", self.payload(), format="json")
        self.assertEqual(criado.status_code, 201)
        self.assertEqual(criado.data["participantes"][0]["id"], self.inspetor.id)
        self.assertEqual(criado.data["demanda"], self.demanda.id)
        atualizado = self.client.patch(f"/api/compromissos/{criado.data['id']}/", {"titulo": "Reunião atualizada", "participante_ids": [self.segundo.id]}, format="json")
        self.assertEqual(atualizado.status_code, 200)
        self.assertEqual(atualizado.data["titulo"], "Reunião atualizada")
        self.assertEqual(atualizado.data["participantes"][0]["id"], self.segundo.id)
        self.assertEqual(self.client.delete(f"/api/compromissos/{criado.data['id']}/").status_code, 204)
        intervalo = "/api/compromissos/?inicio=2026-10-20T00:00:00-03:00&fim=2026-10-21T00:00:00-03:00"
        self.assertEqual(self.client.get(intervalo).data["results"], [])
        compromisso = Compromisso.objects.get(pk=criado.data["id"])
        self.assertEqual(compromisso.cancelado_por, self.gestor)

    def test_rejeita_conflito_de_participante_com_resposta_util(self):
        self.client.force_authenticate(self.gestor)
        primeiro = self.client.post("/api/compromissos/", self.payload(), format="json")
        segundo = self.client.post("/api/compromissos/", self.payload(titulo="Sobreposto", inicio="2026-10-20T09:30:00-03:00", fim="2026-10-20T10:30:00-03:00"), format="json")
        self.assertEqual(primeiro.status_code, 201)
        self.assertEqual(segundo.status_code, 409)
        self.assertEqual(segundo.data["conflitos"][0]["id"], primeiro.data["id"])

    def test_permite_horario_contiguo_e_participantes_sem_conflito(self):
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.post("/api/compromissos/", self.payload(), format="json").status_code, 201)
        contiguo = self.client.post("/api/compromissos/", self.payload(titulo="Seguinte", inicio="2026-10-20T10:00:00-03:00", fim="2026-10-20T11:00:00-03:00"), format="json")
        paralelo = self.client.post("/api/compromissos/", self.payload(titulo="Outro participante", participante_ids=[self.segundo.id]), format="json")
        self.assertEqual(contiguo.status_code, 201)
        self.assertEqual(paralelo.status_code, 201)

    def test_inspetor_nao_gerencia_e_usuario_externo_nao_acessa(self):
        self.client.force_authenticate(self.inspetor)
        # Participantes, tipo e demanda continuam exclusivos da gestão.
        self.assertEqual(self.client.post("/api/compromissos/", self.payload(), format="json").status_code, 400)
        self.client.force_authenticate(self.gestor)
        criado = self.client.post("/api/compromissos/", self.payload(), format="json")
        self.client.force_authenticate(self.inspetor)
        self.assertEqual(self.client.patch(f"/api/compromissos/{criado.data['id']}/", {"titulo": "Indevido"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(f"/api/compromissos/{criado.data['id']}/").status_code, 403)
        self.client.force_authenticate(self.externo)
        self.assertEqual(self.client.patch(f"/api/compromissos/{criado.data['id']}/", {"titulo": "Indevido"}, format="json").status_code, 404)

    def test_valida_intervalo_participantes_e_demanda_da_equipe(self):
        demanda_externa = Demanda.objects.create(titulo="Externa", sei_numero="TESTE-AGENDA-2", prazo=datetime(2026, 10, 30).date(), equipe=self.outra, criador=Usuario.objects.create_user(username="gestor.ext.agenda", perfil="gestor", equipe=self.outra))
        self.client.force_authenticate(self.gestor)
        casos = [
            self.payload(fim="2026-10-20T08:00:00-03:00"),
            self.payload(participante_ids=[self.externo.id]),
            self.payload(demanda_id=demanda_externa.id),
        ]
        for payload in casos:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post("/api/compromissos/", payload, format="json").status_code, 400)


class ReuniaoInspetorTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.equipe = Equipe.objects.create(nome="Equipe reunião inspetor")
        cls.gestor = Usuario.objects.create_user(username="gestor.reuniao", perfil="gestor", equipe=cls.equipe)
        cls.inspetor = Usuario.objects.create_user(username="inspetor.reuniao", perfil="inspetor", equipe=cls.equipe)
        cls.colega = Usuario.objects.create_user(username="colega.reuniao", perfil="inspetor", equipe=cls.equipe)
        VinculoEquipe.objects.create(usuario=cls.inspetor, equipe=cls.equipe, papel="inspetor")
        VinculoEquipe.objects.create(usuario=cls.colega, equipe=cls.equipe, papel="inspetor")
        cls.sem_equipe = Usuario.objects.create_user(username="sem.equipe.reuniao", perfil="inspetor")
        cls.intervalo = "/api/compromissos/?inicio=2026-10-20T00:00:00-03:00&fim=2026-10-21T00:00:00-03:00"

    def payload(self, **changes):
        data = {
            "titulo": "Alinhamento das demandas", "pauta": "Revisar prazos e prioridades da semana.",
            "inicio": "2026-10-20T14:00:00-03:00", "fim": "2026-10-20T15:00:00-03:00",
        }
        data.update(changes)
        return data

    def test_inspetor_cria_reuniao_que_aparece_no_calendario(self):
        self.client.force_authenticate(self.inspetor)
        criado = self.client.post("/api/compromissos/", self.payload(), format="json")
        self.assertEqual(criado.status_code, 201)
        self.assertEqual(criado.data["tipo"], "reuniao")
        self.assertEqual(criado.data["descricao"], "Revisar prazos e prioridades da semana.")
        self.assertEqual(criado.data["inicio"], "2026-10-20T14:00:00-03:00")
        self.assertEqual(criado.data["fim"], "2026-10-20T15:00:00-03:00")
        self.assertEqual([item["id"] for item in criado.data["participantes"]], [self.inspetor.id])
        reuniao = Compromisso.objects.get(pk=criado.data["id"])
        self.assertEqual((reuniao.criador, reuniao.equipe, reuniao.demanda), (self.inspetor, self.equipe, None))
        self.assertEqual([item["id"] for item in self.client.get(self.intervalo).data["results"]], [reuniao.id])
        self.client.force_authenticate(self.gestor)
        self.assertEqual([item["id"] for item in self.client.get(self.intervalo).data["results"]], [reuniao.id])
        self.client.force_authenticate(self.colega)
        self.assertEqual(self.client.get(self.intervalo).data["results"], [])

    def test_exige_titulo_pauta_e_horarios_validos(self):
        self.client.force_authenticate(self.inspetor)
        casos = {
            "sem título": self.payload(titulo=""),
            "sem pauta": self.payload(pauta="   "),
            "sem início": {key: value for key, value in self.payload().items() if key != "inicio"},
            "sem fim": {key: value for key, value in self.payload().items() if key != "fim"},
            "sem fuso": self.payload(inicio="2026-10-20T14:00:00"),
            "término antes do início": self.payload(fim="2026-10-20T13:00:00-03:00"),
            "término igual ao início": self.payload(fim="2026-10-20T14:00:00-03:00"),
        }
        for caso, payload in casos.items():
            with self.subTest(caso=caso):
                self.assertEqual(self.client.post("/api/compromissos/", payload, format="json").status_code, 400)
        self.assertFalse(Compromisso.objects.exists())

    def test_rejeita_campos_reservados_a_gestao(self):
        self.client.force_authenticate(self.inspetor)
        for campo, valor in {"tipo": "atividade", "demanda_id": 1}.items():
            with self.subTest(campo=campo):
                resposta = self.client.post("/api/compromissos/", self.payload(**{campo: valor}), format="json")
                self.assertEqual(resposta.status_code, 400)
                self.assertIn(campo, resposta.data)
        self.assertFalse(Compromisso.objects.exists())

    def test_convida_colega_ativo_e_rejeita_pessoa_de_outra_equipe(self):
        outra = Equipe.objects.create(nome="Outra equipe para convite")
        externo = Usuario.objects.create_user(username="externo.reuniao", perfil="inspetor", equipe=outra)
        VinculoEquipe.objects.create(usuario=externo, equipe=outra, papel="inspetor")
        self.client.force_authenticate(self.inspetor)
        lista = self.client.get("/api/compromissos/participantes/")
        self.assertEqual(lista.status_code, 200)
        self.assertEqual([item["id"] for item in lista.data["resultados"]], [self.colega.id])
        criado = self.client.post("/api/compromissos/", self.payload(participante_ids=[self.colega.id]), format="json")
        self.assertEqual(criado.status_code, 201)
        self.assertEqual({item["id"] for item in criado.data["participantes"]}, {self.inspetor.id, self.colega.id})
        self.client.force_authenticate(self.colega)
        self.assertEqual([item["id"] for item in self.client.get(self.intervalo).data["results"]], [criado.data["id"]])
        self.client.force_authenticate(self.inspetor)
        invalido = self.client.post("/api/compromissos/", self.payload(participante_ids=[externo.id]), format="json")
        self.assertEqual(invalido.status_code, 400)
        self.assertIn("participante_ids", invalido.data)

    def test_conflito_em_outra_equipe_bloqueia_sem_expor_detalhes(self):
        outra = Equipe.objects.create(nome="Outra equipe para conflito")
        gestor_externo = Usuario.objects.create_user(username="gestor.externo.reuniao", perfil="gestor", equipe=outra)
        VinculoEquipe.objects.create(usuario=self.inspetor, equipe=outra, papel="inspetor")
        compromisso = Compromisso.objects.create(
            titulo="Assunto reservado", tipo="reuniao", inicio=datetime.fromisoformat("2026-10-20T14:30:00-03:00"),
            fim=datetime.fromisoformat("2026-10-20T15:30:00-03:00"), equipe=outra, criador=gestor_externo,
        )
        compromisso.participantes.add(self.inspetor)
        self.client.force_authenticate(self.inspetor)
        resposta = self.client.post("/api/compromissos/", self.payload(), format="json")
        self.assertEqual(resposta.status_code, 409)
        self.assertEqual(resposta.data["conflitos"], [])

    def test_conflito_de_convidado_nao_expoe_reuniao_privada(self):
        self.client.force_authenticate(self.gestor)
        criado = self.client.post("/api/compromissos/", {
            "titulo": "Reunião privada do colega", "tipo": "reuniao",
            "inicio": "2026-10-20T14:30:00-03:00", "fim": "2026-10-20T15:30:00-03:00",
            "participante_ids": [self.colega.id],
        }, format="json")
        self.assertEqual(criado.status_code, 201)
        self.client.force_authenticate(self.inspetor)
        resposta = self.client.post("/api/compromissos/", self.payload(participante_ids=[self.colega.id]), format="json")
        self.assertEqual(resposta.status_code, 409)
        self.assertEqual(resposta.data["conflitos"], [])

    def test_informa_conflito_com_a_agenda_do_inspetor(self):
        self.client.force_authenticate(self.gestor)
        existente = self.client.post("/api/compromissos/", {
            "titulo": "Visita técnica", "tipo": "atividade", "inicio": "2026-10-20T14:30:00-03:00",
            "fim": "2026-10-20T16:00:00-03:00", "participante_ids": [self.inspetor.id],
        }, format="json")
        self.client.force_authenticate(self.inspetor)
        conflito = self.client.post("/api/compromissos/", self.payload(), format="json")
        self.assertEqual(conflito.status_code, 409)
        self.assertEqual([item["id"] for item in conflito.data["conflitos"]], [existente.data["id"]])
        contiguo = self.client.post("/api/compromissos/", self.payload(inicio="2026-10-20T13:30:00-03:00", fim="2026-10-20T14:30:00-03:00"), format="json")
        self.assertEqual(contiguo.status_code, 201)
        self.client.force_authenticate(self.colega)
        self.assertEqual(self.client.post("/api/compromissos/", self.payload(), format="json").status_code, 201)

    def test_exige_sessao_e_equipe(self):
        self.assertEqual(self.client.post("/api/compromissos/", self.payload(), format="json").status_code, 401)
        self.client.force_authenticate(self.sem_equipe)
        self.assertEqual(self.client.post("/api/compromissos/", self.payload(), format="json").status_code, 403)
