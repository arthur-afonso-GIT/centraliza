'use client';
import { MessageSquare, X } from 'lucide-react';
import Link from './navigation-link';
import type { ConversaNotificada } from '../lib/conversas';

export default function ChatNotificacoes({ avisos, dispensar }: { avisos: ConversaNotificada[]; dispensar: (id: number) => void }) {
  return <div className="chat-avisos" aria-live="polite">
    {avisos.map(aviso => <section className="chat-aviso" key={aviso.id} aria-label={`Nova mensagem em ${aviso.titulo}`}>
      <MessageSquare size={20} aria-hidden="true" />
      <div>
        <p><strong>Nova mensagem de {aviso.ultima_mensagem.autor_nome}</strong> em “{aviso.titulo}”</p>
        {aviso.nao_lidas > 1 && <small>{aviso.nao_lidas} mensagens não lidas nesta conversa</small>}
        <Link href={`/chats?conversa=${aviso.id}`}>Abrir conversa</Link>
      </div>
      <button type="button" onClick={() => dispensar(aviso.id)} aria-label={`Dispensar aviso de ${aviso.titulo}`}><X size={18} /></button>
    </section>)}
  </div>;
}
