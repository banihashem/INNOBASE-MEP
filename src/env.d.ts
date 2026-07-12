// Build-time injected by Vite from package.json
declare const __APP_VERSION__: string;

// Build-time identity markers (cure §6.8) — injected by Vite define
declare const __BUILD_SHA__: string;
declare const __BUILD_TIMESTAMP__: string;
declare const __BUILD_LABEL__: string;

interface Window {
  __MEP_BUILD__?: {
    version: string;
    sha: string;
    timestamp: string;
    label: string;
  };
}
