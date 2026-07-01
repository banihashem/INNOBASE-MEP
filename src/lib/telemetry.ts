/**
 * MEP-light™ — Frontend Telemetry
 * 
 * Lightweight event tracking for usage analytics and diagnostics.
 * 
 * Features:
 *   - Non-blocking (best-effort send)
 *   - Respects navigator.doNotTrack
 *   - Batched events (sends every 30s or on page unload)
 *   - No PII beyond authenticated email
 */

// ─── Types ──────────────────────────────────────────────────────────

interface TelemetryEvent {
  action: string;
  properties?: Record<string, string | number | boolean>;
  timestamp: string;
  sessionId?: string;
}

// ─── Configuration ──────────────────────────────────────────────────

const TELEMETRY_ENDPOINT = "/api/telemetry";
const BATCH_INTERVAL = 30000; // 30 seconds
const MAX_BATCH_SIZE = 50;

// ─── State ──────────────────────────────────────────────────────────

let eventBuffer: TelemetryEvent[] = [];
let batchTimer: ReturnType<typeof setInterval> | null = null;
let isInitialized = false;
let doNotTrack = false;

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Initialize the telemetry system.
 * Call once on app mount.
 */
export function initTelemetry(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Respect Do Not Track
  doNotTrack = navigator.doNotTrack === "1" || (navigator as any).globalPrivacyControl === true;

  if (doNotTrack) {
    console.log("[MEP Telemetry] Respecting Do Not Track — telemetry disabled");
    return;
  }

  // Start batch send timer
  batchTimer = setInterval(flushEvents, BATCH_INTERVAL);

  // Flush on page unload
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEvents();
    }
  });

  window.addEventListener("beforeunload", flushEvents);
}

/**
 * Track an event.
 */
export function trackEvent(
  action: string,
  properties?: Record<string, string | number | boolean>
): void {
  if (doNotTrack || !isInitialized) return;

  const event: TelemetryEvent = {
    action,
    properties,
    timestamp: new Date().toISOString(),
  };

  eventBuffer.push(event);

  // Auto-flush if buffer is large
  if (eventBuffer.length >= MAX_BATCH_SIZE) {
    flushEvents();
  }
}

/**
 * Flush accumulated events to the backend.
 * Non-blocking — failures are silently ignored.
 */
function flushEvents(): void {
  if (eventBuffer.length === 0) return;

  const batch = eventBuffer.splice(0, MAX_BATCH_SIZE);

  // Use sendBeacon for reliability during page unload
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      TELEMETRY_ENDPOINT,
      JSON.stringify({ events: batch })
    );
  } else {
    // Fallback to fetch (non-blocking)
    fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    }).catch(() => {
      // Silently drop — telemetry is best-effort
    });
  }
}

/**
 * Shutdown telemetry (flush remaining events).
 */
export function shutdownTelemetry(): void {
  flushEvents();
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
  isInitialized = false;
}

// ─── Convenience Trackers ───────────────────────────────────────────

export const track = {
  signIn: (email: string) =>
    trackEvent("sign_in", { method: "google_oidc" }),

  signOut: () =>
    trackEvent("sign_out"),

  sessionStarted: (sessionId: string) =>
    trackEvent("session_started", { sessionId }),

  sessionResumed: (sessionId: string) =>
    trackEvent("session_resumed", { sessionId }),

  stepCompleted: (step: number, stepName: string) =>
    trackEvent("step_completed", { step, stepName }),

  stepNavigated: (fromStep: number, toStep: number) =>
    trackEvent("step_navigated", { fromStep, toStep }),

  pdfExported: (companyName: string, success: boolean) =>
    trackEvent("pdf_exported", { companyName, success }),

  sessionAutoSaved: () =>
    trackEvent("session_auto_saved"),

  errorOccurred: (component: string, message: string) =>
    trackEvent("error_occurred", { component, message }),
};
