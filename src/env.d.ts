// Build-time injected by Vite from package.json
declare const __APP_VERSION__: string;

// Build-time identity markers (cure §6.8) — injected by Vite define
// __BUILD_SHA__ is resolved from VITE_BUILD_SHA (CI) or git rev-parse --short HEAD (local).
// It will never be 'unknown' — vite.config.ts fail-fast prevents that.
declare const __BUILD_SHA__: string;
declare const __BUILD_TIMESTAMP__: string;
declare const __BUILD_LABEL__: string;

// Vite import.meta.env typing
interface ImportMetaEnv {
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __MEP_BUILD__?: {
    version: string;
    sha: string;
    timestamp: string;
    label: string;
    runtimeMode: string;
  };
}
