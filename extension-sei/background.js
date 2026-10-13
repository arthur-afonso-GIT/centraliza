import { extractVisibleFields } from './extractor.js';

const CENTRALIZA = 'http://localhost:3000';

function awaitComplete(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('A aba do Centraliza demorou para abrir.')), 15000);
    function finish(error) {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(updated);
      if (error) reject(error); else resolve();
    }
    function updated(id, change) { if (id === tabId && change.status === 'complete') finish(); }
    chrome.tabs.onUpdated.addListener(updated);
    chrome.tabs.get(tabId).then(tab => { if (tab.status === 'complete') finish(); }).catch(finish);
  });
}

async function openCapture(payload) {
  if (payload?.version !== 1 || typeof payload.sei_numero !== 'string' || typeof payload.origem !== 'string') {
    throw new Error('Os campos capturados são inválidos.');
  }
  const safe = { version: 1, sei_numero: payload.sei_numero.slice(0, 80), origem: payload.origem.slice(0, 200), aviso: typeof payload.aviso === 'string' ? payload.aviso.slice(0, 300) : '' };
  const tab = await chrome.tabs.create({ url: `${CENTRALIZA}/captura-sei`, active: true });
  if (!tab.id) throw new Error('Não foi possível abrir a aba de revisão.');
  await awaitComplete(tab.id);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: value => {
          sessionStorage.setItem('centraliza:captura-sei:v1', JSON.stringify(value));
          window.dispatchEvent(new Event('centraliza:captura-sei'));
        },
        args: [safe],
      });
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'open-capture' && message?.type !== 'capture-current-page') return false;
  const capture = async () => {
    if (message.type === 'open-capture') return openCapture(message.payload);
    const tab = _sender.tab;
    if (!tab?.id || !tab.url?.startsWith(`${CENTRALIZA}/mock-sei/`)) {
      throw new Error('Esta página não é um exemplo SEI autorizado.');
    }
    const [result] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractVisibleFields });
    if (result?.result?.version !== 1) throw new Error('Não foi possível ler os campos desta página.');
    return openCapture(result.result);
  };
  capture()
    .then(() => sendResponse({ ok: true }))
    .catch(error => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Não foi possível abrir a revisão.' }));
  return true;
});
