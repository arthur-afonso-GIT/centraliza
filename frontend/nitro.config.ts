import { defineConfig } from 'nitro';

const apiUrl = process.env.CENTRALIZA_API_URL?.replace(/\/$/, '');
if (!apiUrl || !apiUrl.startsWith('https://')) {
  throw new Error('Configure CENTRALIZA_API_URL com a URL HTTPS da API no Render antes do build da Vercel.');
}

export default defineConfig({
  routeRules: {
    '/api/**': {
      proxy: {
        to: `${apiUrl}/api/**`,
        // Keep this in Nitro's runtime proxy so the forwarded scheme reaches Django.
        headers: { 'x-forwarded-proto': 'https' },
      },
    },
  },
});
