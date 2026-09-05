'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="standalone" role="alert"><h1>Não foi possível abrir esta página</h1><p>Tente novamente para continuar.</p><button className="primary" onClick={reset}>Tentar novamente</button></main>;
}
