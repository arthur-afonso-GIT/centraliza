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
    aside{position:fixed;left:24px;top:24px;z-index:2147483647;width:min(440px,calc(100vw - 48px));box-sizing:border-box;padding:24px;border:1px solid #ddd;border-radius:14px;background:#fff;color:#25292c;box-shadow:0 12px 40px #0002;font:16px/1.5 system-ui,sans-serif}
    strong{display:block;margin-bottom:8px;color:#c71c2c;font-size:19px}p{margin:0 0 18px}div{display:flex;flex-wrap:wrap;gap:10px}button{cursor:pointer;border-radius:8px;padding:11px 15px;font:600 14px system-ui,sans-serif}button.primary{border:0;background:#d7192c;color:#fff}button.close{border:1px solid #d7d7d7;background:#fff;color:#363b3f}
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
