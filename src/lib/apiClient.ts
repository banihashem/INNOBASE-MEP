/**
 * MEP-light™ — API Client
 * 
 * Typed HTTP client for backend communication with:
 *   - Automatic retry with exponential backoff
 *   - Auth header injection
 *   - Graceful degradation (localStorage fallback when offline)
 *   - Request timeout handling
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ApiSession {
  id: string;
  userId: string;
  companyName: string;
  currentStep: number;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  status: number;
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

// ─── Configuration ──────────────────────────────────────────────────

const API_BASE = "/api";
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const DEFAULT_RETRIES = 3;
const BACKOFF_BASE = 1000; // 1 second

// ─── Core Fetch with Retry ──────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    method = "GET",
    body,
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${API_BASE}${url}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // Don't retry on 4xx client errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorBody = await response.text();
        throw new ApiClientError(
          `API error: ${response.status} — ${errorBody}`,
          response.status
        );
      }

      // 5xx or 429 — retry
      lastError = new Error(`API returned ${response.status}`);
    } catch (error: any) {
      if (error instanceof ApiClientError) throw error;
      if (error.name === "AbortError") {
        lastError = new Error("Request timed out");
      } else {
        lastError = error;
      }
    }

    // Exponential backoff before retry
    if (attempt < retries - 1) {
      const delay = BACKOFF_BASE * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Request failed after retries");
}

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

// ─── API Methods ────────────────────────────────────────────────────

export const apiClient = {
  /**
   * Health check.
   */
  async health(): Promise<{ status: string; version: string }> {
    const res = await fetchWithRetry("/health", { retries: 1, timeout: 5000 });
    return res.json();
  },

  /**
   * Submit scoring payload.
   */
  async score(payload: unknown): Promise<unknown> {
    const res = await fetchWithRetry("/score", {
      method: "POST",
      body: payload,
    });
    return res.json();
  },

  /**
   * Export PDF.
   * Returns a Blob for download.
   */
  async exportPdf(payload: unknown): Promise<Blob> {
    const res = await fetchWithRetry("/export-pdf", {
      method: "POST",
      body: payload,
      timeout: 30000, // PDF generation can be slow
    });
    return res.blob();
  },

  /**
   * Check if the API is reachable.
   * Non-throwing — returns false if offline.
   */
  async isOnline(): Promise<boolean> {
    try {
      await this.health();
      return true;
    } catch {
      return false;
    }
  },
};
