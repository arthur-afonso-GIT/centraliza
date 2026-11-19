import { defineConfig } from 'nitro';

const apiUrl = process.env.CENTRALIZA_API_URL?.replace(/\/$/, '');
if (!apiUrl || !apiUrl.startsWith('https://')) {
  throw new Error('Configure CENTRALIZA_API_URL com a URL HTTPS da API no Render antes do build da Vercel.');
}

export default defineConfig({
  routeRules: {
    '/api/**': { proxy: `${apiUrl}/api/**` },
  },
});
