'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, ShieldCheck } from 'lucide-react';
import { modules } from '../lib/navigation';
import type { User } from '../lib/auth';

export default function ModuleContent({
  page,
  user,
}: {
  page: string;
  user: User;
}) {
  const active = modules.find((item) => item.id === page) ?? modules[0];
  const Icon = active.icon;
  const contentRef = useRef<HTMLElement>(null);
  useEffect(() => {
    contentRef.current?.focus({ preventScroll: true });
  }, [page]);
  return (
    <main
      ref={contentRef}
      id="conteudo"
      tabIndex={-1}
      className="content"
      aria-labelledby="titulo-pagina"
    >
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {page === 'home' ? 'SEU ESPAÇO DE TRABALHO' : 'CENTRALIZA · VISAT'}
          </span>
          <h1 id="titulo-pagina">
            {page === 'home'
              ? `Olá, ${user.perfil === 'gestor' ? 'Gestor' : 'Inspetor'}.`
              : active.title}
          </h1>
          <p>
            {page === 'home'
              ? 'Tudo começa com uma equipe conectada.'
              : active.description}
          </p>
        </div>
        <span className="badge">Semana 1</span>
      </div>
      {page === 'home' ? (
        <>
          <section className="welcome-panel">
            <div>
              <span className="eyebrow">BEM-VINDO AO CENTRALIZA</span>
              <h2>Seu trabalho, em um só lugar.</h2>
              <p>
                {user.perfil === 'gestor'
                  ? 'Acompanhe as demandas da equipe, organize os próximos passos e mantenha todos informados.'
                  : 'Encontre suas demandas, acompanhe compromissos e fique por dentro dos avisos da equipe.'}
              </p>
              <Link className="primary" href="/demandas">
                Acessar demandas <ArrowRight size={18} />
              </Link>
            </div>
            <ClipboardList
              className="welcome-icon"
              size={116}
              strokeWidth={1}
              aria-hidden="true"
            />
          </section>
          <section aria-labelledby="modulos">
            <div className="section-heading">
              <h2 id="modulos">Acesso rápido</h2>
              <span>Explore os módulos</span>
            </div>
            <div className="module-grid">
              {modules.slice(1).map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link className="module-card" href={item.href} key={item.id}>
                    <span className="module-icon">
                      <ItemIcon size={24} />
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <span className="card-link">
                      Acessar módulo <ArrowRight size={17} />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
          <div className="development-note">
            <ShieldCheck size={21} />
            <p>
              <strong>Estamos construindo este espaço.</strong> Nesta primeira
              entrega, você pode explorar o menu e as páginas. As atividades
              serão disponibilizadas nas próximas etapas.
            </p>
          </div>
        </>
      ) : (
        <section className="empty-state">
          <span className="empty-icon">
            <Icon size={36} strokeWidth={1.5} />
          </span>
          <span className="badge">Em desenvolvimento</span>
          <h2>
            {page === 'demandas'
              ? 'As demandas terão seu espaço aqui'
              : page === 'agenda'
                ? 'Seus próximos compromissos, aqui'
                : page === 'avisos'
                  ? 'Um espaço para os avisos da equipe'
                  : 'As conversas começam aqui'}
          </h2>
          <p>
            {page === 'demandas'
              ? user.perfil === 'gestor'
                ? 'Em breve, você poderá criar, atribuir e avaliar as demandas da equipe.'
                : 'Em breve, você poderá acompanhar e atualizar as demandas atribuídas a você.'
              : page === 'agenda'
                ? 'Em breve, reuniões e atividades poderão ser consultadas nesta página.'
                : page === 'avisos'
                  ? 'Em breve, os comunicados da VISAT estarão disponíveis nesta página.'
                  : 'Em breve, você poderá trocar mensagens com a equipe.'}
          </p>
          <Link className="secondary" href="/">
            Voltar para a Home <ArrowRight size={17} />
          </Link>
        </section>
      )}
      <footer className="content-footer">
        <span>Centraliza · VISAT</span>
        <span>Protótipo de navegação</span>
      </footer>
    </main>
  );
}
