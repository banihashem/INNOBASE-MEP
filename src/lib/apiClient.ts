/**
 * MEP-light™ — API Client
 * 
 * Typed HTTP client for backend communication with:
 *   - Automatic Bearer token injection from auth session
 *   - Retry with exponential backoff
 *   - Graceful degradation (localStorage fallback when offline)
 *   - Request timeout handling
 *   - User management API methods (Admin)
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

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  status: string;
  companyName: string;
  department: string;
  title: string;
  totalSessions: number;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserListResponse {
  users: UserProfile[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserStatsResponse {
  byRole: Record<string, number>;
  total: number;
  roles: string[];
  statuses: string[];
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

// ─── Configuration ──────────────────────────────────────────────────

const API_BASE = "/api";
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const DEFAULT_RETRIES = 3;
const BACKOFF_BASE = 1000; // 1 second
const TOKEN_STORAGE_KEY = "mep_v3_token";

// ─── Auth Token Retrieval ───────────────────────────────────────────

function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

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
    skipAuth = false,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Build headers with optional auth
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (!skipAuth) {
        const token = getAuthToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const response = await fetch(`${API_BASE}${url}`, {
        method,
        headers,
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
    const res = await fetchWithRetry("/health", { retries: 1, timeout: 5000, skipAuth: true });
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

  // ─── User Management API ────────────────────────────────────────

  users: {
    /**
     * Get current authenticated user's profile.
     * Auto-provisions on first login.
     */
    async me(): Promise<{ user: UserProfile }> {
      const res = await fetchWithRetry("/v2/users/me");
      return res.json();
    },

    /**
     * List/search users (Admin only).
     */
    async list(params: {
      q?: string;
      role?: string;
      status?: string;
      company?: string;
      limit?: number;
      offset?: number;
    } = {}): Promise<UserListResponse> {
      const searchParams = new URLSearchParams();
      if (params.q) searchParams.set("q", params.q);
      if (params.role) searchParams.set("role", params.role);
      if (params.status) searchParams.set("status", params.status);
      if (params.company) searchParams.set("company", params.company);
      if (params.limit) searchParams.set("limit", String(params.limit));
      if (params.offset) searchParams.set("offset", String(params.offset));

      const qs = searchParams.toString();
      const res = await fetchWithRetry(`/v2/users${qs ? `?${qs}` : ""}`);
      return res.json();
    },

    /**
     * Get a user by ID (Admin only).
     */
    async getById(userId: string): Promise<{ user: UserProfile }> {
      const res = await fetchWithRetry(`/v2/users/${userId}`);
      return res.json();
    },

    /**
     * Create a new user (Admin only).
     */
    async create(data: {
      email: string;
      role?: string;
      displayName?: string;
      companyName?: string;
      department?: string;
      title?: string;
    }): Promise<{ success: boolean; user: UserProfile }> {
      const res = await fetchWithRetry("/v2/users", {
        method: "POST",
        body: data,
      });
      return res.json();
    },

    /**
     * Update a user (Admin only).
     */
    async update(userId: string, data: {
      displayName?: string;
      role?: string;
      status?: string;
      companyName?: string;
      department?: string;
      title?: string;
      notes?: string;
    }): Promise<{ success: boolean; user: UserProfile }> {
      const res = await fetchWithRetry(`/v2/users/${userId}`, {
        method: "PATCH",
        body: data,
      });
      return res.json();
    },

    /**
     * Deactivate a user (Admin only). Soft-delete.
     */
    async deactivate(userId: string): Promise<{ success: boolean; user: UserProfile }> {
      const res = await fetchWithRetry(`/v2/users/${userId}`, {
        method: "DELETE",
      });
      return res.json();
    },

    /**
     * Get user statistics (Admin only).
     */
    async stats(): Promise<UserStatsResponse> {
      const res = await fetchWithRetry("/v2/users/stats");
      return res.json();
    },
  },

  // ─── Sessions API ───────────────────────────────────────────────

  sessions: {
    async list(): Promise<any> {
      const res = await fetchWithRetry("/v2/sessions");
      return res.json();
    },
    async create(data: { title?: string; companyName?: string; offeringName?: string; inputData?: any }): Promise<any> {
      const res = await fetchWithRetry("/v2/sessions", {
        method: "POST",
        body: data,
      });
      return res.json();
    },
    async get(id: string): Promise<any> {
      const res = await fetchWithRetry(`/v2/sessions/${id}`);
      return res.json();
    },
    async update(id: string, data: any): Promise<any> {
      const res = await fetchWithRetry(`/v2/sessions/${id}`, {
        method: "PATCH",
        body: data,
      });
      return res.json();
    },
    async review(id: string, status: string): Promise<any> {
      const res = await fetchWithRetry(`/v2/sessions/${id}/review`, {
        method: "POST",
        body: { status },
      });
      return res.json();
    },
    async delete(id: string): Promise<any> {
      const res = await fetchWithRetry(`/v2/sessions/${id}`, {
        method: "DELETE",
      });
      return res.json();
    }
  },

  // ─── ADK API ───────────────────────────────────────────────────

  adk: {
    async assess(sessionId: string): Promise<any> {
      const res = await fetchWithRetry("/v2/adk/assess", {
        method: "POST",
        body: { sessionId },
      });
      return res.json();
    },
    async run(sessionId: string, workflowId: string): Promise<any> {
      const res = await fetchWithRetry("/v2/adk/run", {
        method: "POST",
        body: { sessionId, workflowId },
      });
      return res.json();
    }
  }
};
