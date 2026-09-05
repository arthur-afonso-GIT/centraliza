'use client';
import { ArrowRight, ClipboardList, ShieldCheck } from 'lucide-react';
import type { Profile } from '../lib/auth';

export default function LoginScreen({
  busy,
  login,
}: {
  busy: boolean;
  login: (profile: Profile) => Promise<void>;
}) {
  return (
    <main className="login">
      <section className="login-story">
        <span className="brand">
          centraliza<span> •</span>
        </span>
        <div>
          <span className="eyebrow">VIGILÂNCIA EM SAÚDE DO TRABALHADOR</span>
          <h1>
            Mais organização.
            <br />
            Mais cuidado.
          </h1>
          <p>
            Um espaço para conectar a equipe e acompanhar o trabalho da VISAT.
          </p>
        </div>
        <span className="login-footer">Gestão de atividades · VISAT</span>
      </section>
      <section className="login-form">
        <div className="login-inner">
          <span className="badge">Demonstração · Semana 1</span>
          <h2>Bem-vindo ao Centraliza</h2>
          <p>Escolha um perfil para explorar a navegação da plataforma.</p>
          <button
            className="profile-choice"
            disabled={busy}
            onClick={() => login('gestor')}
          >
            <ShieldCheck />
            <span>
              <strong>Entrar como Gestor</strong>
              <small>Organização e acompanhamento da equipe</small>
            </span>
            <ArrowRight />
          </button>
          <button
            className="profile-choice"
            disabled={busy}
            onClick={() => login('inspetor')}
          >
            <ClipboardList />
            <span>
              <strong>Entrar como Inspetor</strong>
              <small>Acompanhamento das suas atividades</small>
            </span>
            <ArrowRight />
          </button>
          <p className="fine-print">
            Perfis fictícios, sem senha. Esta versão demonstra a navegação e não
            contém dados reais.
          </p>
        </div>
      </section>
    </main>
  );
}
