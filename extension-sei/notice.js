(() => {
  if (!document.body || document.getElementById('centraliza-sei-notice')) return;

  const visible = selector => [...document.querySelectorAll(selector)]
    .filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
  const processes = [...new Set(visible('[data-sei-processo]').map(element => (element.value ?? element.textContent ?? '').trim()).filter(Boolean))];
  const hasDocument = visible('[data-sei-documento]').length > 0;
  if (processes.length === 0 && !hasDocument) return;

  const root = document.createElement('div');
  root.id = 'centraliza-sei-notice';
  const shadow = root.attachShadow({ mode: 'closed' });
  const panel = document.createElement('aside');
  panel.setAttribute('role', 'status');
  panel.innerHTML = `<style>
    aside{position:fixed;right:20px;bottom:20px;z-index:2147483647;width:min(340px,calc(100vw - 40px));box-sizing:border-box;padding:18px;border:1px solid #ddd;border-radius:12px;background:#fff;color:#25292c;box-shadow:0 12px 40px #0002;font:14px/1.45 system-ui,sans-serif}
    strong{display:block;margin-bottom:6px;color:#c71c2c;font-size:16px}p{margin:0 0 14px}div{display:flex;gap:8px}button{cursor:pointer;border-radius:7px;padding:9px 12px;font:600 13px system-ui,sans-serif}button.primary{border:0;background:#d7192c;color:#fff}button.close{border:1px solid #d7d7d7;background:#fff;color:#363b3f}
  </style>`;
  const title = document.createElement('strong');
  title.textContent = 'Centraliza encontrou dados SEI';
  const message = document.createElement('p');
  message.textContent = processes.length === 1
    ? `Número do processo encontrado${hasDocument ? ' neste documento' : ''}. Revise os dados antes de criar a demanda.`
    : processes.length > 1
      ? 'Há mais de um número de processo nesta página. Confira e informe o número correto na revisão.'
      : 'Este documento não mostra um número de processo identificável. Informe-o manualmente na revisão.';
  const actions = document.createElement('div');
  const review = document.createElement('button');
  review.className = 'primary';
  review.type = 'button';
  review.textContent = 'Revisar no Centraliza';
  const dismiss = document.createElement('button');
  dismiss.className = 'close';
  dismiss.type = 'button';
  dismiss.textContent = 'Agora não';
  dismiss.addEventListener('click', () => root.remove());
  review.addEventListener('click', async () => {
    review.disabled = true;
    review.textContent = 'Abrindo revisão…';
    try {
      const result = await chrome.runtime.sendMessage({ type: 'capture-current-page' });
      if (!result?.ok) throw new Error(result?.error || 'Não foi possível abrir a revisão.');
      root.remove();
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : 'Não foi possível abrir a revisão.';
      review.disabled = false;
      review.textContent = 'Tentar novamente';
    }
  });
  actions.append(review, dismiss);
  panel.append(title, message, actions);
  shadow.append(panel);
  document.body.append(root);
})();
