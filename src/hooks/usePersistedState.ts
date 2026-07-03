import React, { useState, useEffect, useCallback, useRef } from "react";

/**
 * MEP-light™ — Persisted State Hook
 * 
 * Syncs React state to localStorage with JSON serialization.
 * Debounced writes prevent excessive I/O during rapid state changes.
 * 
 * Features:
 *   - Schema versioning for safe migration
 *   - Graceful degradation if localStorage unavailable
 *   - Debounced writes (configurable interval)
 *   - Type-safe with generics
 */

const STORAGE_PREFIX = "mep_v3_";

interface PersistedStateOptions {
  /** Debounce interval in ms (default: 2000) */
  debounceMs?: number;
  /** Schema version — if mismatch, reset to default */
  version?: number;
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options: PersistedStateOptions = {}
): [T, React.Dispatch<React.SetStateAction<T>>, { clear: () => void; lastSaved: Date | null }] {
  const { debounceMs = 2000, version = 1 } = options;
  const fullKey = `${STORAGE_PREFIX}${key}`;
  const versionKey = `${fullKey}_v`;
  const timestampKey = `${fullKey}_ts`;

  // Initialize from localStorage
  const [state, setState] = useState<T>(() => {
    try {
      const storedVersion = localStorage.getItem(versionKey);
      if (storedVersion && parseInt(storedVersion) !== version) {
        // Schema version mismatch — reset
        localStorage.removeItem(fullKey);
        localStorage.removeItem(versionKey);
        localStorage.removeItem(timestampKey);
        return defaultValue;
      }

      const stored = localStorage.getItem(fullKey);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // localStorage unavailable or corrupted
    }
    return defaultValue;
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(() => {
    try {
      const ts = localStorage.getItem(timestampKey);
      return ts ? new Date(ts) : null;
    } catch {
      return null;
    }
  });

  // Debounced write to localStorage
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      try {
        const serialized = JSON.stringify(stateRef.current);
        localStorage.setItem(fullKey, serialized);
        localStorage.setItem(versionKey, String(version));
        const now = new Date();
        localStorage.setItem(timestampKey, now.toISOString());
        setLastSaved(now);
      } catch (e) {
        // localStorage full or unavailable — fail silently
        console.warn("[MEP] localStorage write failed:", e);
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [state, fullKey, versionKey, timestampKey, version, debounceMs]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(fullKey);
      localStorage.removeItem(versionKey);
      localStorage.removeItem(timestampKey);
    } catch {}
    setState(defaultValue);
    setLastSaved(null);
  }, [fullKey, versionKey, timestampKey, defaultValue]);

  return [state, setState, { clear, lastSaved }];
}

/**
 * Session metadata stored in localStorage for the session list.
 */
export interface SessionMeta {
  id: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
  currentStep: number;
  totalSteps: number;
  completionPct: number;
}

const SESSIONS_KEY = `${STORAGE_PREFIX}sessions_index`;

/**
 * Get all session metadata entries.
 */
export function listSessions(): SessionMeta[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Upsert a session in the index.
 */
export function upsertSessionMeta(meta: SessionMeta): void {
  const sessions = listSessions();
  const idx = sessions.findIndex((s) => s.id === meta.id);
  if (idx >= 0) {
    sessions[idx] = meta;
  } else {
    sessions.unshift(meta);
  }
  // Keep max 20 sessions
  const trimmed = sessions.slice(0, 20);
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
  } catch {}
}

/**
 * Delete a session from the index and its data.
 */
export function deleteSession(sessionId: string): void {
  const sessions = listSessions().filter((s) => s.id !== sessionId);
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    // Remove all keys for this session
    const prefix = `${STORAGE_PREFIX}session_${sessionId}`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

/**
 * Generate a unique session ID.
 */
export function generateSessionId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
