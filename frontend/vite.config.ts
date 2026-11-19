import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import vinext from 'vinext';
import { defineConfig, loadEnv } from 'vite';
import hostingConfig from './.openai/hosting.json';

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'CENTRALIZA_');
  const vercelBuild = command === 'build' && (Boolean(process.env.VERCEL) || env.CENTRALIZA_DEPLOY_TARGET === 'vercel');
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Only load the adapter for the selected build target.
  const buildAdapter = vercelBuild
    ? [(await import('nitro/vite')).nitro()]
    : command === 'build'
      ? [(await import('@cloudflare/vite-plugin')).cloudflare({
          viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
          config: localBindingConfig,
        })]
      : [];

  return {
    server: {
      ...(isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : {}),
      proxy: { '/api': { target: env.CENTRALIZA_API_URL ?? 'http://127.0.0.1:8000' } },
    },
    plugins: [
      tailwindcss(),
      vinext(),
      ...(vercelBuild ? [] : [sites()]),
      ...buildAdapter,
    ],
  };
});
