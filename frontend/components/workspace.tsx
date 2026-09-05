'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CalendarDays, ClipboardList, Home, LogOut, Megaphone, Menu, MessagesSquare, ShieldCheck, X } from 'lucide-react';
import { entrar, obterUsuarioAtual, sair, type Profile, type User } from '../lib/auth';

const modules = [
  { id: 'home', href: '/', title: 'Home', icon: Home, description: 'Uma visão do seu dia de trabalho.' },
  { id: 'agenda', href: '/agenda', title: 'Agenda', icon: CalendarDays, description: 'Reuniões, compromissos e atividades em um só lugar.' },
  { id: 'avisos', href: '/avisos', title: 'Avisos', icon: Megaphone, description: 'Comunicados para manter a equipe informada.' },
  { id: 'demandas', href: '/demandas', title: 'Demandas', icon: ClipboardList, description: 'Acompanhe as atividades do início à conclusão.' },
  { id: 'chats', href: '/chats', title: 'Chats', icon: MessagesSquare, description: 'Um espaço para conversar com sua equipe.' },
];

export default function Workspace({ page }: { page: string }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const active = modules.find(item => item.id === page) ?? modules[0];
  const Icon = active.icon;
  useEffect(() => {
    let cancelled = false;
    obterUsuarioAtual().then(current => {
      if (cancelled) return;
      setUser(current);
      if (!current && page !== 'login') router.replace('/login');
      else if (current && page === 'login') router.replace('/');
      else setLoading(false);
    }).catch(() => { if (!cancelled) { setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [page, retry, router]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  async function login(profile: Profile) {
    setBusy(true);
    try { await entrar(profile); router.replace('/'); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await sair(); setUser(null); router.replace('/login'); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  if (error) return <main className="standalone" role="alert"><ShieldCheck size={40} /><h1>Não foi possível acessar a sessão</h1><p>Verifique se o navegador permite armazenamento para este site e tente novamente.</p><button className="primary" onClick={() => { setLoading(true); setError(false); setRetry(value => value + 1); }}>Tentar novamente</button></main>;
  if (loading) return <main className="standalone"><span className="spinner" /><output>Preparando seu espaço de trabalho…</output></main>;
  if (page === 'login') return <main className="login">
    <section className="login-story"><span className="brand">centraliza<span> •</span></span><div><span className="eyebrow">VIGILÂNCIA EM SAÚDE DO TRABALHADOR</span><h1>Mais organização.<br />Mais cuidado.</h1><p>Um espaço para conectar a equipe e acompanhar o trabalho da VISAT.</p></div><span className="login-footer">Gestão de atividades · VISAT</span></section>
    <section className="login-form"><div className="login-inner"><span className="badge">Demonstração · Semana 1</span><h2>Bem-vindo ao Centraliza</h2><p>Escolha um perfil para explorar a navegação da plataforma.</p>
      <button className="profile-choice" disabled={busy} onClick={() => login('gestor')}><ShieldCheck /><span><strong>Entrar como Gestor</strong><small>Organização e acompanhamento da equipe</small></span><ArrowRight /></button>
      <button className="profile-choice" disabled={busy} onClick={() => login('inspetor')}><ClipboardList /><span><strong>Entrar como Inspetor</strong><small>Acompanhamento das suas atividades</small></span><ArrowRight /></button>
      <p className="fine-print">Perfis fictícios, sem senha. Esta versão demonstra a navegação e não contém dados reais.</p></div></section>
  </main>;
  if (!user) return null;
  return <div className="workspace">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header className="mobile-header"><span className="brand">centraliza<span> •</span></span><button ref={menuButton} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-controls="menu-principal" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button></header>
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`} id="menu-principal">
      <Link href="/" className="brand" aria-label="Centraliza, Home">centraliza<span> •</span></Link><p className="sidebar-subtitle">Vigilância em Saúde do Trabalhador</p><span className="nav-label">ESPAÇO DE TRABALHO</span>
      <nav aria-label="Navegação principal">{modules.map(item => { const ItemIcon = item.icon; return <Link key={item.id} href={item.href} aria-current={page === item.id ? 'page' : undefined} onClick={() => setMenuOpen(false)}><ItemIcon size={20} />{item.title}{page === item.id && <span className="active-dot" />}</Link>; })}</nav>
      <div className="sidebar-bottom"><span className="badge">Demonstração</span><p>Uma base para o trabalho<br />que vem pela frente.</p><div className="identity"><span className="avatar">{user.perfil === 'gestor' ? 'G' : 'I'}</span><div><strong>{user.perfil === 'gestor' ? 'Gestor' : 'Inspetor'}</strong><small>Perfil de demonstração</small></div></div><button className="logout" disabled={busy} onClick={logout}><LogOut size={18} /> Sair da demonstração</button></div>
    </aside>
    <div className="main-area"><header className="topbar"><span>Meu espaço <span className="separator">/</span> <strong>{active.title}</strong></span><span className="team-label"><span className="status-dot" /> Equipe VISAT</span></header>
      <main id="conteudo" tabIndex={-1} className="content"><div className="page-heading"><div><span className="eyebrow">{page === 'home' ? 'SEU ESPAÇO DE TRABALHO' : 'CENTRALIZA · VISAT'}</span><h1>{page === 'home' ? `Olá, ${user.perfil === 'gestor' ? 'Gestor' : 'Inspetor'}.` : active.title}</h1><p>{page === 'home' ? 'Tudo começa com uma equipe conectada.' : active.description}</p></div><span className="badge">Semana 1</span></div>
      {page === 'home' ? <><section className="welcome-panel"><div><span className="eyebrow">BEM-VINDO AO CENTRALIZA</span><h2>Seu trabalho, em um só lugar.</h2><p>{user.perfil === 'gestor' ? 'Acompanhe as demandas da equipe, organize os próximos passos e mantenha todos informados.' : 'Encontre suas demandas, acompanhe compromissos e fique por dentro dos avisos da equipe.'}</p><Link className="primary" href="/demandas">Acessar demandas <ArrowRight size={18} /></Link></div><ClipboardList className="welcome-icon" size={116} strokeWidth={1} aria-hidden="true" /></section>
      <section aria-labelledby="modulos"><div className="section-heading"><h2 id="modulos">Acesso rápido</h2><span>Explore os módulos</span></div><div className="module-grid">{modules.slice(1).map(item => { const ItemIcon = item.icon; return <Link className="module-card" href={item.href} key={item.id}><span className="module-icon"><ItemIcon size={24} /></span><h3>{item.title}</h3><p>{item.description}</p><span className="card-link">Acessar módulo <ArrowRight size={17} /></span></Link>; })}</div></section>
      <div className="development-note"><ShieldCheck size={21} /><p><strong>Estamos construindo este espaço.</strong> Nesta primeira entrega, você pode explorar o menu e as páginas. As atividades serão disponibilizadas nas próximas etapas.</p></div></> : <section className="empty-state"><span className="empty-icon"><Icon size={36} strokeWidth={1.5} /></span><span className="badge">Em desenvolvimento</span><h2>{page === 'demandas' ? 'As demandas terão seu espaço aqui' : page === 'agenda' ? 'Seus próximos compromissos, aqui' : page === 'avisos' ? 'Um espaço para os avisos da equipe' : 'As conversas começam aqui'}</h2><p>{page === 'demandas' ? user.perfil === 'gestor' ? 'Em breve, você poderá criar, atribuir e avaliar as demandas da equipe.' : 'Em breve, você poderá acompanhar e atualizar as demandas atribuídas a você.' : page === 'agenda' ? 'Em breve, reuniões e atividades poderão ser consultadas nesta página.' : page === 'avisos' ? 'Em breve, os comunicados da VISAT estarão disponíveis nesta página.' : 'Em breve, você poderá trocar mensagens com a equipe.'}</p><Link className="secondary" href="/">Voltar para a Home <ArrowRight size={17} /></Link></section>}
      <footer className="content-footer"><span>Centraliza · VISAT</span><span>Protótipo de navegação</span></footer></main>
    </div>
  </div>;
}
