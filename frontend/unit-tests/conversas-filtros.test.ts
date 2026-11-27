import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filtrosValidos } from '../lib/conversas-filtros.ts';
void test('permite limites abertos e mesmo dia; rejeita período invertido antes da requisição', () => {
  assert.equal(filtrosValidos({}), true);
  assert.equal(filtrosValidos({ dataInicio: '2026-11-18' }), true);
  assert.equal(filtrosValidos({ dataInicio: '2026-11-18', dataFim: '2026-11-18' }), true);
  assert.equal(filtrosValidos({ dataInicio: '2026-11-19', dataFim: '2026-11-18' }), false);
});
