import assert from 'node:assert/strict';
import test from 'node:test';
import { aplicarLeitura } from '../lib/conversas-leitura.ts';
const conversa = { id: 1, titulo: 'Teste', criada_em: '', atualizada_em: '', participantes: [], ultima_mensagem_lida_id: 0, nao_lidas: 100, mensagens: [{id: 95, texto: '', criada_em: '', autor_id: 2, autor_nome: 'Outra pessoa'}] };
test('historico parcial nao zera contagem de mensagens fora da pagina', () => {
  assert.equal(aplicarLeitura(conversa, 95, 1).nao_lidas, 99);
  assert.equal(aplicarLeitura(conversa, 95, 1, 5).nao_lidas, 5);
});
test('resposta de leitura atrasada nao faz cursor regredir', () => {
  const atual = aplicarLeitura(conversa, 95, 1, 5);
  assert.deepEqual(aplicarLeitura(atual, 90, 1, 10), atual);
});
