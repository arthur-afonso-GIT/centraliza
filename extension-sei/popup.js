import { extractVisibleFields } from './extractor.js';

const CENTRALIZA = 'http://localhost:3000';
const send = document.getElementById('send');
const status = document.getElementById('status');

send.addEventListener('click', async () => {
  send.disabled = true;
  status.textContent = 'Lendo campos visíveis…';
  try {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!active?.id || !active.url?.startsWith(`${CENTRALIZA}/mock-sei/`)) {
      throw new Error('Abra primeiro uma página fictícia do SEI no Centraliza.');
    }
    const [result] = await chrome.scripting.executeScript({ target: { tabId: active.id }, func: extractVisibleFields });
    const captured = result?.result;
    if (!captured || captured.version !== 1) throw new Error('Não foi possível ler os campos desta página.');
    status.textContent = 'Abrindo a revisão…';
    const response = await chrome.runtime.sendMessage({ type: 'open-capture', payload: captured });
    if (!response?.ok) throw new Error(response?.error || 'Não foi possível abrir a revisão.');
    window.close();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Não foi possível enviar a captura.';
    send.disabled = false;
  }
});
