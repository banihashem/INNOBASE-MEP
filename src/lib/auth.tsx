/**
 * MEP-light™ — Google OIDC Authentication Library
 * 
 * Provides:
 *   - Google Identity Services (GIS) initialization
 *   - JWT id_token decoding (client-side, no server verification)
 *   - Token storage and retrieval for API calls
 *   - Token expiry detection
 *   - AuthContext for React component tree
 *   - Role-aware access control helpers
 * 
 * In production, the GIS popup returns a `credential` (id_token JWT).
 * We decode the payload to extract user profile info.
 * Server-side verification happens on backend API calls.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// ─── Types ──────────────────────────────────────────────────────────

export interface AuthUser {
  email: string;
  name: string;
  picture: string;
  sub: string;    // Google user ID
  exp?: number;   // JWT expiration timestamp
  role?: string;  // MEP role (populated after backend sync)
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (user: AuthUser, token?: string) => void;
  signOut: () => void;
  getToken: () => string | null;
  updateUserRole: (role: string) => void;
}

// ─── Constants ──────────────────────────────────────────────────────

const AUTH_STORAGE_KEY = "mep_v3_auth";
const USER_STORAGE_KEY = "mep_v3_user";
const TOKEN_STORAGE_KEY = "mep_v3_token";

// Google Client ID — replace with real one for production
export const GOOGLE_CLIENT_ID = "52156375400-placeholder.apps.googleusercontent.com";

/**
 * Check if we have a real (non-placeholder) Google Client ID configured.
 */
export function isGoogleAuthConfigured(): boolean {
  return !GOOGLE_CLIENT_ID.includes("placeholder") && GOOGLE_CLIENT_ID.length > 10;
}

// ─── JWT Helpers ────────────────────────────────────────────────────

/**
 * Decode a Google id_token JWT payload (no signature verification).
 * Client-side only — server should verify on API calls.
 */
export function decodeGoogleJwt(credential: string): AuthUser | null {
  try {
    const parts = credential.split(".");
    if (parts.length !== 3) return null;

    // Base64url decode the payload
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));

    return {
      email: decoded.email || "",
      name: decoded.name || decoded.email || "",
      picture: decoded.picture || "",
      sub: decoded.sub || "",
      exp: decoded.exp,
    };
  } catch {
    console.error("[MEP Auth] Failed to decode JWT");
    return null;
  }
}

/**
 * Check if a JWT has expired.
 */
export function isTokenExpired(exp?: number): boolean {
  if (!exp) return false; // No expiry = treat as valid
  return Date.now() / 1000 > exp;
}

// ─── Auth Context ───────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
  getToken: () => null,
  updateUserRole: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// ─── Auth Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore auth state from sessionStorage on mount
  useEffect(() => {
    try {
      const isAuth = sessionStorage.getItem(AUTH_STORAGE_KEY) === "true";
      const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
      const storedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      
      if (isAuth && storedUser) {
        const parsed = JSON.parse(storedUser) as AuthUser;
        
        // Check if token has expired
        if (isTokenExpired(parsed.exp)) {
          // Token expired — clear auth
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          sessionStorage.removeItem(USER_STORAGE_KEY);
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        } else {
          setUser(parsed);
          setToken(storedToken || null);
        }
      }
    } catch {
      // Corrupted storage — fail silently
    }
    setIsLoading(false);
  }, []);

  const signIn = useCallback((newUser: AuthUser, newToken?: string) => {
    setUser(newUser);
    setToken(newToken || null);
    sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    if (newToken) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }, []);

  const getToken = useCallback((): string | null => {
    // Check token expiry before returning
    if (user && isTokenExpired(user.exp)) {
      signOut();
      return null;
    }
    return token || sessionStorage.getItem(TOKEN_STORAGE_KEY);
  }, [user, token, signOut]);

  const updateUserRole = useCallback((role: string) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, role };
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
    getToken,
    updateUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
