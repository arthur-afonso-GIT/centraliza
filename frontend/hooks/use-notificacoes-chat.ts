import { useCallback, useEffect, useState } from 'react';
import { EVENTO_LEITURA_CHAT, obterNotificacoesChat, type ConversaNotificada } from '../lib/conversas';

const INTERVALO = 30000;
const MAXIMO_AVISOS = 3;

// A navegação recarrega a página; o último aviso exibido fica na sessão da aba.
function lerAvisado(chave: string) {
  try {
    const valor = window.sessionStorage.getItem(chave);
    return valor === null ? null : Number(valor);
  } catch { return null; }
}

function gravarAvisado(chave: string, id: number) {
  try { window.sessionStorage.setItem(chave, String(id)); } catch { /* sem armazenamento, só o contador */ }
}

export function useNotificacoesChat(usuarioId: number, alertar: boolean) {
  const [total, setTotal] = useState(0);
  const [avisos, setAvisos] = useState<ConversaNotificada[]>([]);

  useEffect(() => {
    const chave = `centraliza_chat_avisado_${usuarioId}`;
    let ativo = true;
    let timer: number | undefined;
    let controller: AbortController | null = null;

    async function consultar() {
      window.clearTimeout(timer);
      // Em segundo plano não consulta; retoma quando a aba volta a ficar visível.
      if (!ativo || document.visibilityState !== 'visible') return;
      controller?.abort();
      controller = new AbortController();
      try {
        const dados = await obterNotificacoesChat(controller.signal);
        if (!ativo) return;
        setTotal(dados.total);
        const maior = Math.max(0, ...dados.conversas.map(item => item.ultima_mensagem.id));
        const avisado = lerAvisado(chave);
        // Na primeira consulta da sessão, mensagens antigas aparecem só no contador.
        const novas = avisado === null ? [] : dados.conversas.filter(item => item.ultima_mensagem.id > avisado);
        if (avisado === null || maior > avisado) gravarAvisado(chave, Math.max(maior, avisado ?? 0));
        setAvisos(atuais => {
          const pendentes = atuais.filter(aviso => dados.conversas.some(item => item.id === aviso.id));
          if (!alertar || !novas.length) return pendentes;
          return [...novas, ...pendentes.filter(aviso => !novas.some(item => item.id === aviso.id))].slice(0, MAXIMO_AVISOS);
        });
      } catch {
        // Falhas e sessão expirada mantêm o último contador; a sessão trata o redirecionamento.
      } finally {
        if (ativo && document.visibilityState === 'visible') timer = window.setTimeout(consultar, INTERVALO);
      }
    }

    const aoMudarVisibilidade = () => { if (document.visibilityState === 'visible') void consultar(); };
    const aoLer = () => { void consultar(); };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener(EVENTO_LEITURA_CHAT, aoLer);
    void consultar();
    return () => {
      ativo = false;
      controller?.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener(EVENTO_LEITURA_CHAT, aoLer);
    };
  }, [usuarioId, alertar]);

  const dispensar = useCallback((id: number) => setAvisos(atuais => atuais.filter(aviso => aviso.id !== id)), []);
  return { total, avisos, dispensar };
}
