from datetime import timedelta
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from demandas.models import AnexoDemanda, ConsultaAnteriorDemanda, Demanda, EventoDemanda
from demandas.services import editar_demanda
from demandas.tests import criar_demanda_teste
from usuarios.models import Equipe, Usuario, VinculoEquipe


class ConsultaAnteriorTest(APITestCase):
    def setUp(self):
        self.files = TemporaryDirectory()
        self.addCleanup(self.files.cleanup)
        self.override = override_settings(MEDIA_ROOT=self.files.name)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.equipe = Equipe.objects.create(nome='Equipe A')
        self.outra = Equipe.objects.create(nome='Equipe B')
        self.gestor = Usuario.objects.create_user(username='gestor', perfil='gestor', equipe=self.equipe)
        self.antigo = Usuario.objects.create_user(username='antigo', perfil='inspetor', equipe=self.equipe)
        self.novo = Usuario.objects.create_user(username='novo', perfil='inspetor', equipe=self.equipe)
        self.terceiro = Usuario.objects.create_user(username='terceiro', perfil='inspetor', equipe=self.equipe)
        self.externo = Usuario.objects.create_user(username='externo', perfil='inspetor', equipe=self.outra)
        self.demanda = criar_demanda_teste(titulo='Título anterior', descricao='Descrição anterior', sei_numero='SEI-ANTIGO',
            prazo=timezone.now() + timedelta(days=10), equipe=self.equipe, criador=self.gestor,
            responsavel=self.antigo, status='em_andamento')
        self.url = f'/api/demandas/{self.demanda.pk}/'
        self.lista = '/api/demandas/consultas-anteriores/'
        self.evento = EventoDemanda.objects.create(demanda=self.demanda, autor=self.antigo, tipo='comentario', texto='Registro anterior')
        self.client.force_authenticate(self.antigo)
        self.anexo = self.client.post(self.url + 'anexos/', {'arquivo': SimpleUploadedFile('antes.pdf', b'%PDF-1.4 antigo', content_type='application/pdf')}).data

    def transferir(self, **dados):
        self.client.force_authenticate(self.gestor)
        response = self.client.patch(self.url, {'responsavel_id': self.novo.pk, **dados}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.client.force_authenticate(self.antigo)
        return response

    def test_preserva_dados_antes_da_edicao_conjunta_e_oculta_futuro(self):
        self.transferir(titulo='Título posterior', descricao='Segredo posterior', sei_numero='SEI-NOVO')
        EventoDemanda.objects.create(demanda=self.demanda, autor=self.novo, tipo='comentario', texto='Comentário posterior')
        self.antigo.first_name = 'Nome posterior'
        self.antigo.save()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['somente_leitura'])
        self.assertIn('consulta_encerrada_em', response.data)
        self.assertEqual(response.data['titulo'], 'Título anterior')
        self.assertEqual(response.data['descricao'], 'Descrição anterior')
        self.assertEqual(response.data['responsavel']['nome'], 'antigo')
        self.assertEqual(response.data['status'], 'em_andamento')
        self.assertNotIn('posterior', str(response.data))
        self.assertIn('Registro anterior', str(response.data))
        self.assertIn('no-store', response['Cache-Control'])
        for usuario in (self.novo, self.gestor):
            self.client.force_authenticate(usuario)
            atual = self.client.get(self.url)
            self.assertEqual(atual.data['titulo'], 'Título posterior')
            self.assertIn('Comentário posterior', str(atual.data))
            self.assertFalse(atual.data.get('somente_leitura', False))

    def test_lista_paginada_busca_apenas_numero_antigo_sem_afetar_lista_operacional(self):
        self.transferir(sei_numero='SEI-NOVO')
        self.assertEqual(self.client.get('/api/demandas/').data['count'], 0)
        resultado = self.client.get(self.lista + '?sei_numero=sei-antigo&page_size=1').data
        self.assertEqual(resultado['count'], 1)
        self.assertEqual(resultado['results'][0]['titulo'], 'Título anterior')
        self.assertNotIn('historico', resultado['results'][0])
        self.assertEqual(self.client.get(self.lista + '?sei_numero=sei-novo').data['count'], 0)
        self.assertEqual(self.client.get(self.lista + '?page=99').status_code, 404)
        self.assertEqual(self.client.get(self.lista + '?page_size=0').status_code, 400)

    def test_ex_responsavel_nao_pode_executar_nenhuma_escrita(self):
        self.transferir()
        antes = EventoDemanda.objects.count()
        for suffix, payload in [('', {'titulo': 'Indevido'}), ('status/', {'status': 'aceita'}),
                               ('prazo/', {'prazo': '2030-01-01'}), ('prioridade/', {'prioridade': 'alta'})]:
            with self.subTest(suffix=suffix):
                self.assertEqual(self.client.patch(self.url + suffix, payload, format='json').status_code, 404)
        self.assertEqual(self.client.post(self.url + 'historico/', {'texto': 'Indevido'}).status_code, 404)
        self.assertEqual(self.client.post(self.url + 'anexos/', {'arquivo': SimpleUploadedFile('nao.pdf', b'%PDF-1.4', content_type='application/pdf')}).status_code, 404)
        self.assertEqual(self.client.delete(self.url + f'anexos/{self.anexo["id"]}/').status_code, 404)
        self.assertEqual(self.client.post(self.lista, {}).status_code, 405)
        self.assertEqual(EventoDemanda.objects.count(), antes)

    def test_anexos_antigos_disponiveis_novos_negados_e_remocao_revoga_download(self):
        self.transferir()
        self.client.force_authenticate(self.novo)
        novo = self.client.post(self.url + 'anexos/', {'arquivo': SimpleUploadedFile('depois.pdf', b'%PDF-1.4 novo', content_type='application/pdf')})
        self.assertEqual(novo.status_code, 201)
        self.client.force_authenticate(self.antigo)
        lista = self.client.get(self.url + 'anexos/').data['resultados']
        self.assertEqual([item['nome_original'] for item in lista], ['antes.pdf'])
        download = self.client.get(self.anexo['download_url'])
        self.assertEqual(download.status_code, 200)
        self.assertEqual(b''.join(download.streaming_content), b'%PDF-1.4 antigo')
        self.assertEqual(self.client.get(novo.data['download_url']).status_code, 404)
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.delete(self.url + f'anexos/{self.anexo["id"]}/').status_code, 204)
        self.client.force_authenticate(self.antigo)
        self.assertEqual(self.client.get(self.url + 'anexos/').data['resultados'], [])
        self.assertEqual(self.client.get(self.anexo['download_url']).status_code, 404)

    def test_sem_vazamento_para_terceiro_ou_outra_equipe(self):
        self.transferir()
        for usuario in (self.terceiro, self.externo):
            self.client.force_authenticate(usuario)
            self.assertEqual(self.client.get(self.url).status_code, 404)
            self.assertEqual(self.client.get(self.lista).data['count'], 0)
            self.assertEqual(self.client.get(self.anexo['download_url']).status_code, 404)
        self.antigo.equipe = self.outra
        self.antigo.save()
        self.client.force_authenticate(self.antigo)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.get(self.lista).data['count'], 0)

    def test_sessao_obrigatoria_e_gestor_nao_lista_consultas_pessoais(self):
        self.transferir()
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(self.lista).status_code, 401)
        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.get(self.lista).status_code, 403)

    def test_desatribuicao_preserva_e_nova_atribuicao_nao_altera_snapshot(self):
        self.transferir(responsavel_id=None)
        original = self.client.get(self.url).data
        self.transferir(titulo='Depois de desatribuir')
        self.assertEqual(self.client.get(self.url).data, original)
        self.assertEqual(ConsultaAnteriorDemanda.objects.count(), 1)

    def test_retorno_ao_responsavel_restaura_operacao_e_nova_saida_atualiza_retrato(self):
        self.transferir()
        self.transferir(responsavel_id=self.antigo.pk, titulo='Retorno autorizado')
        self.assertFalse(self.client.get(self.url).data.get('somente_leitura', False))
        self.assertEqual(self.client.get(self.lista).data['count'], 0)
        self.assertEqual(self.client.post(self.url + 'historico/', {'texto': 'Registro no retorno'}).status_code, 201)
        self.transferir(titulo='Após segunda saída')
        dados = self.client.get(self.url).data
        self.assertEqual(dados['titulo'], 'Retorno autorizado')
        self.assertIn('Registro no retorno', str(dados['historico']))
        self.assertEqual(ConsultaAnteriorDemanda.objects.filter(usuario=self.antigo).count(), 1)

    def test_mesmo_responsavel_nao_cria_snapshot_e_nao_reconstroi_legado(self):
        self.transferir(responsavel_id=self.antigo.pk)
        self.assertFalse(ConsultaAnteriorDemanda.objects.exists())
        Demanda.objects.filter(pk=self.demanda.pk).update(responsavel=self.novo)
        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_snapshot_e_transferencia_revertem_juntos_se_gravacao_falhar(self):
        with patch('demandas.models.Demanda.save', side_effect=IntegrityError('Falha simulada')):
            with self.assertRaises(IntegrityError):
                editar_demanda(demanda=self.demanda, usuario=self.gestor, dados={'responsavel_id': self.novo})
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.responsavel_id, self.antigo.id)
        self.assertFalse(ConsultaAnteriorDemanda.objects.exists())

    def test_encerramento_posterior_nao_muda_consulta_anterior(self):
        self.transferir()
        anterior = self.client.get(self.url).data
        Demanda.objects.filter(pk=self.demanda.pk).update(status='concluida', titulo='Outro título')
        self.assertEqual(self.client.get(self.url).data, anterior)

    def test_vinculo_revogado_bloqueia_consulta_e_download(self):
        self.transferir()
        VinculoEquipe.objects.create(usuario=self.antigo, equipe=self.equipe, papel='inspetor', ativo=False)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.get(self.lista).data['count'], 0)
        self.assertEqual(self.client.get(self.anexo['download_url']).status_code, 404)

    def test_arquivo_e_comentario_com_objeto_antigo_nao_burlam_reatribuicao(self):
        from demandas.anexos import adicionar_anexo, remover_anexo
        from django.core.exceptions import PermissionDenied
        anexo = AnexoDemanda.objects.get(pk=self.anexo['id'])
        self.transferir()
        with self.assertRaises(PermissionDenied):
            adicionar_anexo(demanda=self.demanda, usuario=self.antigo,
                arquivo=SimpleUploadedFile('novo.pdf', b'%PDF-1.4', content_type='application/pdf'))
        with self.assertRaises(PermissionDenied):
            remover_anexo(anexo=anexo, usuario=self.antigo)

    def test_equipe_removida_da_demanda_revoga_consulta(self):
        self.transferir()
        self.demanda.equipes_participantes.clear()
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.get(self.lista).data['count'], 0)
        self.assertEqual(self.client.get(self.anexo['download_url']).status_code, 404)
