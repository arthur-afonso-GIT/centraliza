import { useEffect, useState } from 'react';
import { marcarConversaLida } from '../lib/conversas';
import type { ConversaFiltravel } from '../lib/conversas-filtros';

export function useConversaLeitura(conversa: ConversaFiltravel | null, aberta: boolean, confirmar: (id: number, cursor: number, naoLidas?: number) => void) {
  const [visivel, setVisivel] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [falha, setFalha] = useState<number | null>(null);
  const id = conversa?.id;
  const cursor = conversa?.ultima_mensagem_lida_id;
  const ultima = conversa?.mensagens.reduce((max, m) => Math.max(max, m.id), 0) ?? 0;

  useEffect(() => {
    const atualizar = () => setVisivel(document.visibilityState === 'visible');
    atualizar();
    document.addEventListener('visibilitychange', atualizar);
    return () => document.removeEventListener('visibilitychange', atualizar);
  }, []);

  useEffect(() => {
    if (!aberta || !visivel || id === undefined || cursor === undefined || ultima <= cursor) return;
    let ativo = true;
    setFalha(null);
    marcarConversaLida(id, ultima).then(resultado => {
      if (ativo) confirmar(id, resultado.ultima_mensagem_lida_id, resultado.nao_lidas);
    }).catch(() => { if (ativo) setFalha(id); });
    return () => { ativo = false; };
  }, [aberta, visivel, id, cursor, ultima, confirmar, tentativa]);

  return { erroLeitura: aberta && falha === id, tentarLeitura: () => setTentativa(n => n + 1) };
}
