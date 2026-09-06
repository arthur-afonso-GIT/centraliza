'use client';
import { useState, type SyntheticEvent } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginScreen({
  busy,
  login,
}: {
  busy: boolean;
  login: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    void login(username, password);
  }
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
          <span className="badge">ACESSO DA EQUIPE</span>
          <h2>Bem-vindo ao Centraliza</h2>
          <p>Entre com a conta fornecida pela gestão da VISAT.</p>
          <form className="login-fields" onSubmit={submit}>
            <label htmlFor="username">Usuário</label>
            <input id="username" name="username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} />
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
            <button className="profile-choice" disabled={busy} type="submit">
              <ShieldCheck />
              <span><strong>{busy ? 'Entrando…' : 'Entrar'}</strong><small>Acesso protegido por sessão</small></span>
              <ArrowRight />
            </button>
          </form>
          <p className="fine-print">
            No ambiente local, use uma das contas criadas pela carga fictícia.
          </p>
        </div>
      </section>
    </main>
  );
}
