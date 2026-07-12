import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

/**
 * Resolve the build commit SHA.
 * Priority:
 *   1. CI-provided env var VITE_BUILD_SHA (set by Cloud Build / pipeline)
 *   2. Local git rev-parse --short HEAD
 *   3. Fail-fast error (no placeholder fallback)
 */
function resolveBuildSha(): string {
  // CI / pipeline override takes precedence
  const ciSha = process.env.VITE_BUILD_SHA?.trim();
  if (ciSha && ciSha.length >= 7) return ciSha;

  // Local git fallback
  try {
    const gitSha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    if (gitSha && gitSha.length >= 7) return gitSha;
  } catch {
    // git not available — fall through to error
  }

  // Fail-fast: never produce a placeholder SHA
  throw new Error(
    '[MEP Build] FATAL: Cannot resolve build SHA. ' +
    'Set VITE_BUILD_SHA in CI or ensure git is available locally.'
  );
}

const BUILD_SHA = resolveBuildSha();

export default defineConfig(({ mode }) => {
  // Load all env vars (not just VITE_ prefixed) from .env files
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __GOOGLE_CLIENT_ID__: JSON.stringify(env.GOOGLE_CLIENT_ID || ''),
      __BUILD_SHA__: JSON.stringify(BUILD_SHA),
      __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
      __BUILD_LABEL__: JSON.stringify('demo-scenario-v0.2-cure-01'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy API requests to the backend server during development
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
