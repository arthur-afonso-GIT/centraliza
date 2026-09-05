'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { LogOut, Menu, X } from 'lucide-react';
import { modules } from '../lib/navigation';
import type { User } from '../lib/auth';

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
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = modules.find((item) => item.id === page) ?? modules[0];
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
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-controls="menu-principal"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
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
                onClick={() => {
                  setMenuOpen(false);
                  if (menuOpen && page === item.id) menuButton.current?.focus();
                }}
              >
                <ItemIcon size={20} />
                {item.title}
                {page === item.id && <span className="active-dot" />}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <span className="badge">Demonstração</span>
          <p>
            Uma base para o trabalho
            <br />
            que vem pela frente.
          </p>
          <div className="identity">
            <span className="avatar">
              {user.perfil === 'gestor' ? 'G' : 'I'}
            </span>
            <div>
              <strong>
                {user.perfil === 'gestor' ? 'Gestor' : 'Inspetor'}
              </strong>
              <small>Perfil de demonstração</small>
            </div>
          </div>
          <button className="logout" disabled={busy} onClick={logout}>
            <LogOut size={18} /> Sair da demonstração
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span>
            Meu espaço <span className="separator">/</span>{' '}
            <strong>{active.title}</strong>
          </span>
          <span className="team-label">
            <span className="status-dot" /> Equipe VISAT
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
