import assert from 'node:assert/strict';
import test from 'node:test';
import { extractVisibleFields } from './extractor.js';

function element(text, visible = true) {
  return { textContent: text, getClientRects: () => visible ? [1] : [] };
}

function page(processes, demandantes, documentos = []) {
  const fields = {
    '[data-sei-processo]': processes.map(value => element(value)),
    '[data-demandante]': demandantes.map(value => element(value)),
    '[data-sei-documento]': documentos.map(value => element(value)),
  };
  globalThis.document = { querySelectorAll: selector => fields[selector] ?? [] };
  globalThis.getComputedStyle = () => ({ visibility: 'visible' });
}

test('captura o processo e ignora o número do documento', () => {
  page(['PROCESSO-FICTICIO-2026-002'], ['Sindicato dos Trabalhadores'], ['DOCUMENTO-987654']);
  assert.deepEqual(extractVisibleFields(), {
    version: 1, sei_numero: 'PROCESSO-FICTICIO-2026-002', origem: 'Sindicato dos Trabalhadores', aviso: '',
  });
});

test('números de processo conflitantes exigem preenchimento manual', () => {
  page(['PROCESSO-001', 'PROCESSO-002'], ['Instituição demonstrativa']);
  const result = extractVisibleFields();
  assert.equal(result.sei_numero, '');
  assert.match(result.aviso, /mais de um número/);
});

test('ignora valores ocultos e não usa número de documento como processo', () => {
  globalThis.document = { querySelectorAll: selector => selector === '[data-sei-processo]' ? [element('OCULTO', false)] : selector === '[data-sei-documento]' ? [element('DOCUMENTO-123')] : [] };
  globalThis.getComputedStyle = () => ({ visibility: 'visible' });
  const result = extractVisibleFields();
  assert.equal(result.sei_numero, '');
  assert.match(result.aviso, /não foi identificado/);
});
