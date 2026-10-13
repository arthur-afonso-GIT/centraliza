import assert from 'node:assert/strict';
import test from 'node:test';

test('entrega somente à nova aba criada para a captura', async () => {
  let listener;
  let created = 0;
  const injections = [];
  const values = new Map();
  globalThis.chrome = {
    runtime: { onMessage: { addListener: callback => { listener = callback; } } },
    tabs: {
      create: async options => { assert.equal(options.url, 'http://localhost:3000/captura-sei'); created++; return { id: 72 }; },
      get: async id => { assert.equal(id, 72); return { status: 'complete' }; },
      onUpdated: { addListener() {}, removeListener() {} },
    },
    scripting: { executeScript: async options => {
      injections.push(options.target.tabId);
      if (options.target.tabId === 17) {
        globalThis.document = { querySelectorAll: selector => selector === '[data-sei-processo]' ? [{ textContent: 'PROCESSO-002', getClientRects: () => [1] }] : selector === '[data-demandante]' ? [{ textContent: 'Instituição', getClientRects: () => [1] }] : [] };
        globalThis.getComputedStyle = () => ({ visibility: 'visible' });
        return [{ result: options.func() }];
      }
      globalThis.sessionStorage = { setItem: (key, value) => values.set(key, value) };
      globalThis.window = { dispatchEvent() {} };
      globalThis.Event = class {};
      options.func(...options.args);
    } },
  };
  await import('./background.js');
  const response = await new Promise(resolve => {
    const held = listener({ type: 'open-capture', payload: { version: 1, sei_numero: 'SEI-001', origem: 'Sindicato' } }, {}, resolve);
    assert.equal(held, true);
  });
  assert.deepEqual(response, { ok: true });
  assert.equal(created, 1);
  assert.deepEqual(injections, [72]);
  assert.deepEqual(JSON.parse(values.get('centraliza:captura-sei:v1')), { version: 1, sei_numero: 'SEI-001', origem: 'Sindicato', aviso: '' });
  const fromNotice = await new Promise(resolve => {
    const held = listener({ type: 'capture-current-page' }, { tab: { id: 17, url: 'http://localhost:3000/mock-sei/documento.html' } }, resolve);
    assert.equal(held, true);
  });
  assert.deepEqual(fromNotice, { ok: true });
  assert.equal(created, 2);
  assert.deepEqual(injections, [72, 17, 72]);
  assert.equal(JSON.parse(values.get('centraliza:captura-sei:v1')).sei_numero, 'PROCESSO-002');
});
