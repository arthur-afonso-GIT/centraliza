import Link from 'next/link';
export default function NotFound() {
  return <main className="standalone"><span className="eyebrow">CENTRALIZA · VISAT</span><h1>Página não encontrada</h1><p>O endereço pode ter mudado ou não existir.</p><Link className="primary" href="/">Voltar para a Home</Link></main>;
}
