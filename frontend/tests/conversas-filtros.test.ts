import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filtrarConversas } from '../lib/conversas-filtros.ts';
const conversas = [
  { id: 1, titulo: 'Inspeção', criada_em: '2026-11-01T10:00:00Z',
    participantes: [{id: 1, nome: 'Lívia'}, {id: 2, nome:'Cecília'}],
    mensagens: [{id:11, texto:'Reunião marcada', criada_em:'2026-11-05T09:00:00Z', autor_id:1}] },
  { id: 2, titulo: 'Documentação', criada_em: '2026-11-10T10:00:00Z',
    participantes: [{id:3, nome:'Luiza'}],
    mensagens: [{id:12, texto:'Relatório pronto', criada_em:'2026-11-12T09:00:00Z', autor_id:3}] },
];
const ids = (f: Parameters<typeof filtrarConversas>[1]) => filtrarConversas(conversas,f).map(c=>c.id);
test('sem filtro retorna todas', () => assert.deepEqual(ids({}),[1,2]));
test('palavra-chave procura título e mensagens sem acentos', () => {
  assert.deepEqual(ids({palavraChave:'REUNIAO'}),[1]);
  assert.deepEqual(ids({palavraChave:'documentação'}),[2]);
});
test('participante usa id e não comparação textual', () => assert.deepEqual(ids({participanteId:3}),[2]));
test('intervalo inclui limites', () => assert.deepEqual(ids({dataInicio:'2026-11-05',dataFim:'2026-11-05'}),[1]));
test('data de mensagem também vale', () => assert.deepEqual(ids({dataInicio:'2026-11-12',dataFim:'2026-11-12'}),[2]));
test('filtros combinados usam E lógico', () => {
  assert.deepEqual(ids({palavraChave:'reunião',participanteId:1,dataInicio:'2026-11-05',dataFim:'2026-11-06'}),[1]);
  assert.deepEqual(ids({palavraChave:'reunião',participanteId:3}),[]);
});
test('datas invertidas não retornam resultados', () => assert.deepEqual(ids({dataInicio:'2026-12-01',dataFim:'2026-11-01'}),[]));
