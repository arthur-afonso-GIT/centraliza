export function extractVisibleFields() {
  function visibleValues(selector) {
    return [...document.querySelectorAll(selector)]
      .filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden')
      .map(element => (element.value ?? element.textContent ?? '').trim())
      .filter(Boolean);
  }
  const processos = [...new Set(visibleValues('[data-sei-processo]'))];
  const demandantes = [...new Set(visibleValues('[data-demandante]'))];
  const avisos = [];
  if (processos.length === 0) avisos.push('O número do processo SEI não foi identificado. Preencha-o manualmente no Centraliza.');
  if (processos.length > 1) avisos.push('Há mais de um número de processo visível. Confira e preencha manualmente.');
  if (demandantes.length !== 1) avisos.push('A instituição demandante não foi identificada com segurança. Confira esse campo no Centraliza.');
  return {
    version: 1,
    sei_numero: processos.length === 1 ? processos[0].slice(0, 80) : '',
    origem: demandantes.length === 1 ? demandantes[0].slice(0, 200) : '',
    aviso: avisos.join(' '),
  };
}
