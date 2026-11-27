'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from './navigation-link';
import { LogOut, Menu, X } from 'lucide-react';
import { modules } from '../lib/navigation';
import { obterVinculosEquipe, selecionarEquipe, type TeamMembership, type User } from '../lib/auth';
import { useNotificacoesChat } from '../hooks/use-notificacoes-chat';
import ChatNotificacoes from './chat-notificacoes';

export default function WorkspaceLayout({
  page,
  user,
  busy,
  logout,
  children,
}: {
  page: string;
  user: User;
  busy: boolean;
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [vinculos, setVinculos] = useState<TeamMembership[]>([]);
  const [equipeAtiva, setEquipeAtiva] = useState<number | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = modules.find((item) => item.id === page) ?? modules[0];
  // Na tela de Chats as conversas já mostram as novidades; fora dela, avisa.
  const chat = useNotificacoesChat(user.id, page !== 'chats');
  const naoLidas = chat.total > 99 ? '99+' : String(chat.total);
  const descricaoNaoLidas = `${chat.total} ${chat.total === 1 ? 'mensagem não lida' : 'mensagens não lidas'} no chat`;
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  useEffect(() => {
    obterVinculosEquipe().then((items) => {
      setVinculos(items);
      const saved = Number(window.localStorage.getItem('centraliza_equipe_ativa'));
      setEquipeAtiva(items.some((item) => item.equipe === saved) ? saved : items[0]?.equipe ?? null);
    }).catch(() => setVinculos([]));
  }, []);
  function escolherEquipe(id: number) {
    selecionarEquipe(id).then(() => { setEquipeAtiva(id); window.localStorage.setItem('centraliza_equipe_ativa', String(id)); window.dispatchEvent(new CustomEvent('centraliza:equipe-alterada', { detail: id })); window.location.reload(); }).catch(() => undefined);
  }
  return (
    <div className="workspace">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="mobile-header">
        <span className="brand">
          centraliza<span> •</span>
        </span>
        <button
          ref={menuButton}
          aria-label={`${menuOpen ? 'Fechar menu' : 'Abrir menu'}${chat.total > 0 ? `, ${descricaoNaoLidas}` : ''}`}
          aria-controls="menu-principal"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
          {chat.total > 0 && <span className="menu-count" aria-hidden="true">{naoLidas}</span>}
        </button>
      </header>
      <aside
        className={`sidebar ${menuOpen ? 'is-open' : ''}`}
        id="menu-principal"
      >
        <Link href="/" className="brand" aria-label="Centraliza, Home">
          centraliza<span> •</span>
        </Link>
        <p className="sidebar-subtitle">Vigilância em Saúde do Trabalhador</p>
        <span className="nav-label">ESPAÇO DE TRABALHO</span>
        <nav aria-label="Navegação principal">
          {modules.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={page === item.id ? 'page' : undefined}
                aria-label={item.id === 'chats' && chat.total > 0 ? `${item.title}, ${descricaoNaoLidas}` : undefined}
                onClick={() => {
                  setMenuOpen(false);
                  if (menuOpen && page === item.id) menuButton.current?.focus();
                }}
              >
                <ItemIcon size={20} />
                {item.title}
                {item.id === 'chats' && chat.total > 0 && <span className="nav-count" aria-hidden="true">{naoLidas}</span>}
                {page === item.id && <span className="active-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <span className="badge">{user.perfil === 'gestor' ? 'GESTÃO' : 'INSPEÇÃO'}</span>
          <div className="identity">
            <span className="avatar">
              {user.perfil === 'gestor' ? 'G' : 'I'}
            </span>
            <div>
              <strong>
                {user.perfil === 'gestor' ? 'Gestor' : 'Inspetor'}
              </strong>
              <small>{user.nome}</small>
            </div>
          </div>
          <button className="logout" disabled={busy} onClick={logout}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span>
            Meu espaço <span className="separator">/</span>{' '}
            <strong>{active.title}</strong>
          </span>
          <label className="team-label" htmlFor="equipe-ativa"><span className="status-dot" />
            {vinculos.length > 1 ? <><span className="sr-only">Equipe ativa</span><select id="equipe-ativa" value={equipeAtiva ?? ''} onChange={(event) => escolherEquipe(Number(event.target.value))}>{vinculos.map((item) => <option value={item.equipe} key={item.id}>{item.equipe_nome} · {item.papel}</option>)}</select></> : vinculos[0]?.equipe_nome ?? 'Equipe VISAT'}
          </label>
        </header>
        {children}
      </div>
      <ChatNotificacoes avisos={chat.avisos} dispensar={chat.dispensar} />
    </div>
  );
}
