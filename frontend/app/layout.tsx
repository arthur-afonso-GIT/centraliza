import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Centraliza | VISAT', description: 'Plataforma de Vigilância em Saúde do Trabalhador.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
