/**
 * MEP-light™ — Google OIDC Authentication Library
 * 
 * Provides:
 *   - Google Identity Services (GIS) initialization
 *   - JWT id_token decoding (client-side, no server verification)
 *   - Token expiry detection
 *   - AuthContext for React component tree
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
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────

const AUTH_STORAGE_KEY = "mep_v3_auth";
const USER_STORAGE_KEY = "mep_v3_user";

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
  isAuthenticated: false,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

// ─── Auth Provider ──────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore auth state from sessionStorage on mount
  useEffect(() => {
    try {
      const isAuth = sessionStorage.getItem(AUTH_STORAGE_KEY) === "true";
      const storedUser = sessionStorage.getItem(USER_STORAGE_KEY);
      
      if (isAuth && storedUser) {
        const parsed = JSON.parse(storedUser) as AuthUser;
        
        // Check if token has expired
        if (isTokenExpired(parsed.exp)) {
          // Token expired — clear auth
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          sessionStorage.removeItem(USER_STORAGE_KEY);
        } else {
          setUser(parsed);
        }
      }
    } catch {
      // Corrupted storage — fail silently
    }
    setIsLoading(false);
  }, []);

  const signIn = useCallback((newUser: AuthUser) => {
    setUser(newUser);
    sessionStorage.setItem(AUTH_STORAGE_KEY, "true");
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
