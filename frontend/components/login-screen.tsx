'use client';
import { useState, type SyntheticEvent } from 'react';
import { ArrowRight } from 'lucide-react';

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
            Trabalho em equipe.
            <br />
            Com clareza.
          </h1>
          <p>
            Demandas, prazos e decisões da VISAT em um só lugar.
          </p>
        </div>
        <span className="login-footer">Gestão de atividades · VISAT</span>
      </section>
      <section className="login-form">
        <div className="login-inner">
          <span className="badge">ACESSO DA EQUIPE</span>
          <h2>Acesse seu espaço de trabalho</h2>
          <p>Entre com a conta fornecida pela gestão da VISAT.</p>
          <form className="login-fields" onSubmit={submit}>
            <label htmlFor="username">Usuário</label>
            <input id="username" name="username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} />
            <label htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
            <button className="login-submit" disabled={busy} type="submit">
              <strong>{busy ? 'Entrando…' : 'Entrar'}</strong>
              <ArrowRight />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
