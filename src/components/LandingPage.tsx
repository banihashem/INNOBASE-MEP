import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Globe2,
  BarChart3,
  Shield,
  Route,
  Layers,
  FileText,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Target,
  Zap,
  CheckCircle2,
  Lock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

import { decodeGoogleJwt, GOOGLE_CLIENT_ID, isGoogleAuthConfigured, isGoogleAuthReady } from "../lib/auth";

// ─── Types ──────────────────────────────────────────────────────────

// Declare google.accounts types for GIS
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            ux_mode?: "popup" | "redirect";
            login_uri?: string;
            itp_support?: boolean;
          }) => void;
          prompt: (notification?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; getNotDisplayedReason: () => string; getSkippedReason: () => string }) => void) => void;
          renderButton: (element: HTMLElement, config: {
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "large" | "medium" | "small";
            width?: number | string;
            text?: "signin_with" | "signup_with" | "continue_with" | "signin";
            shape?: "rectangular" | "pill" | "circle" | "square";
            logo_alignment?: "left" | "center";
            type?: "standard" | "icon";
            locale?: string;
          }) => void;
          revoke: (email: string, callback: () => void) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface UserProfile {
  email: string;
  name: string;
  picture: string;
  sub: string;
}

// ─── Auth State Machine ─────────────────────────────────────────────

type AuthState =
  | "idle"                  // Initial state
  | "gis_loading"           // Waiting for GIS script to load
  | "gis_ready"             // GIS loaded and initialized, buttons rendered
  | "gis_failed"            // GIS script failed to load
  | "signin_started"        // User initiated sign-in (clicked button)
  | "credential_received"   // Google returned a credential
  | "verifying"             // Sending to backend for verification
  | "authenticated"         // Successfully authenticated
  | "auth_failed";          // Authentication failed

// ─── Landing Page Component ─────────────────────────────────────────

interface LandingPageProps {
  onSignIn: (user: UserProfile, token?: string) => void;
  isAuthenticated: boolean;
}

export default function LandingPage({ onSignIn, isAuthenticated }: LandingPageProps) {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<AuthState>("idle");

  // Refs for Google-rendered button containers
  const navButtonRef = useRef<HTMLDivElement>(null);
  const heroButtonRef = useRef<HTMLDivElement>(null);
  const ctaButtonRef = useRef<HTMLDivElement>(null);

  // Track if GIS has been initialized
  const gisInitializedRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * Handle the credential response from Google Identity Services.
   * This fires when the user completes the Google OAuth popup/consent flow.
   * The credential is a JWT id_token.
   */
  const handleGoogleCredentialResponse = useCallback((response: { credential: string }) => {
    console.log("[MEP Auth] gis_credential_received");
    setAuthState("credential_received");
    setAuthError(null);

    const user = decodeGoogleJwt(response.credential);
    if (user) {
      console.log("[MEP Auth] credential_decoded_ok");
      setAuthState("authenticated");
      onSignIn(user, response.credential);
    } else {
      console.error("[MEP Auth] credential_decode_failed");
      setAuthState("auth_failed");
      setAuthError("Failed to decode authentication response. Please try again.");
    }
  }, [onSignIn]);

  /**
   * Render Google Sign-In buttons into all 3 container refs.
   * Uses google.accounts.id.renderButton() which creates an iframe-based
   * Google-branded button that opens a proper popup OAuth flow.
   * 
   * CRITICAL: This works in ALL browser contexts:
   * - Normal browser ✓
   * - Incognito ✓
   * - Fresh profile ✓
   * - After clearing site data ✓
   */
  const renderGoogleButtons = useCallback(() => {
    if (!window.google?.accounts?.id) return;

    const refs = [
      { ref: navButtonRef, width: 200, size: "medium" as const },
      { ref: heroButtonRef, width: 280, size: "large" as const },
      { ref: ctaButtonRef, width: 300, size: "large" as const },
    ];

    for (const { ref, width, size } of refs) {
      if (ref.current) {
        // Clear any previous renders
        ref.current.innerHTML = "";
        window.google.accounts.id.renderButton(ref.current, {
          theme: "filled_blue",
          size,
          width,
          text: "signin_with",
          shape: "pill",
          logo_alignment: "left",
        });
      }
    }
  }, []);

  /**
   * Initialize Google Identity Services and render buttons.
   * Called when the GIS script finishes loading.
   */
  const initializeAndRenderGis = useCallback(() => {
    if (!window.google?.accounts?.id) return;
    
    if (gisInitializedRef.current) {
      renderGoogleButtons();
      setAuthState("gis_ready");
      return;
    }
    
    gisInitializedRef.current = true;
    console.log("[MEP Auth] gis_initializing");

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
    });

    console.log("[MEP Auth] gis_initialized — rendering buttons");
    renderGoogleButtons();
    setAuthState("gis_ready");
    console.log("[MEP Auth] gis_ready — buttons rendered");
  }, [handleGoogleCredentialResponse, renderGoogleButtons]);

  // Poll for Google Identity Services readiness when configured.
  useEffect(() => {
    if (!isGoogleAuthConfigured()) {
      console.error("[MEP Auth] Google Auth not configured — no Client ID");
      setAuthState("gis_failed");
      setAuthError("Google Sign-In is not configured. Please contact the administrator.");
      return;
    }

    if (!gisInitializedRef.current && authState !== "gis_loading") {
      setAuthState("gis_loading");
      console.log("[MEP Auth] gis_loading — waiting for GIS script");
    }

    // Check immediately
    if (isGoogleAuthReady()) {
      initializeAndRenderGis();
      return;
    }

    // Poll every 200ms for up to 15 seconds
    let attempts = 0;
    const maxAttempts = 75;
    const interval = setInterval(() => {
      attempts++;
      if (isGoogleAuthReady()) {
        clearInterval(interval);
        initializeAndRenderGis();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error("[MEP Auth] gis_failed — GIS script did not load after 15s");
        setAuthState("gis_failed");
        setAuthError(
          "Google sign-in script failed to load. Please check your internet connection and try refreshing the page."
        );
      }
    }, 200);

    return () => clearInterval(interval);
  }, [initializeAndRenderGis]);

  // Re-render buttons when refs become available (e.g. after scroll reveals CTA section)
  useEffect(() => {
    if (authState === "gis_ready") {
      renderGoogleButtons();
    }
  }, [authState, renderGoogleButtons]);

  /**
   * Retry handler — re-initialize GIS and re-render buttons.
   */
  const handleRetry = () => {
    setAuthError(null);
    gisInitializedRef.current = false;
    setAuthState("gis_loading");

    if (isGoogleAuthReady()) {
      initializeAndRenderGis();
    } else {
      // Force reload the page to get a fresh GIS script
      window.location.reload();
    }
  };

  // ─── Feature & Step Data ──────────────────────────────────────────

  const features = [
    {
      icon: <Globe2 className="w-6 h-6" />,
      title: "Compare Options",
      description:
        "Assess potential markets, segments, channels, or entry pathways side by side.",
      color: "from-indigo-400 to-purple-400",
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Expose Assumptions",
      description:
        "Identify what is supported by evidence and what still needs validation.",
      color: "from-rose-400 to-pink-400",
    },
    {
      icon: <Route className="w-6 h-6" />,
      title: "Plan Validation",
      description:
        "Generate a practical 30–60–90 day roadmap for market entry or expansion testing.",
      color: "from-emerald-400 to-teal-400",
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Define",
      subtitle: "Setup & Context",
      description:
        "Configure your expansion scope, company profile, and strategic objectives in a guided wizard.",
      icon: <Target className="w-8 h-8" />,
    },
    {
      number: "02",
      title: "Score",
      subtitle: "9D Analysis",
      description:
        "Rate each target market across 9 strategic dimensions with evidence-backed confidence levels.",
      icon: <Zap className="w-8 h-8" />,
    },
    {
      number: "03",
      title: "Decide",
      subtitle: "Board-Ready Output",
      description:
        "Receive ranked market comparisons, tier classifications, and phased validation roadmaps.",
      icon: <CheckCircle2 className="w-8 h-8" />,
    },
  ];

  // ─── Auth Error Banner ────────────────────────────────────────────

  const renderAuthError = () => {
    if (!authError) return null;
    return (
      <div className="landing-auth-error">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>{authError}</span>
        <button onClick={handleRetry} className="landing-auth-retry">
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  };

  // ─── Google Button Container ──────────────────────────────────────
  // The Google-rendered button is injected into these divs by GIS renderButton().
  // While GIS is loading, we show a styled loading placeholder.

  const renderGoogleButtonContainer = (
    ref: React.RefObject<HTMLDivElement | null>,
    id: string,
    fallbackText: string = "Sign in with Google"
  ) => {
    if (authState === "gis_loading" || authState === "idle") {
      return (
        <div className="landing-gis-loading" id={id}>
          <span className="landing-spinner" />
          <span>Loading Google Sign-In...</span>
        </div>
      );
    }

    if (authState === "gis_failed") {
      return (
        <button onClick={handleRetry} className="landing-cta-primary" id={id}>
          <RefreshCw className="w-4 h-4" />
          Retry Sign-In
        </button>
      );
    }

    // GIS ready — the rendered button will be injected into this div
    return <div ref={ref} id={id} className="landing-gis-button-container" />;
  };

  return (
    <div className="landing-page">
      {/* ─── Animated Background ────────────────────────────────── */}
      <div className="landing-bg">
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="landing-orb landing-orb-3" />
        <div className="landing-grid" />
      </div>

      {/* ─── Sticky Nav ─────────────────────────────────────────── */}
      <nav
        className={`landing-nav ${scrollY > 60 ? "landing-nav-scrolled" : ""}`}
      >
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">
              <Globe2 className="w-5 h-5" />
            </div>
            <span className="landing-logo-text">MEP-light Beta Demo v1.6</span>
            <span className="landing-logo-tag">by INNOBASE</span>
          </div>
          {renderGoogleButtonContainer(navButtonRef, "nav-google-signin", "Sign in")}
        </div>
      </nav>

      {/* ─── Hero Section ───────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Decision-Support Demo</span>
          </div>
          <h1 className="landing-hero-title">
            Market Entry & Expansion Decision Support
          </h1>
          <p className="landing-hero-subtitle">
            Compare possible pathways, assess readiness, and define the next validation step.
          </p>
          <div className="landing-hero-ctas">
            {renderGoogleButtonContainer(heroButtonRef, "hero-google-signin", "Start Demo Assessment")}
          </div>
          <p className="mt-6 text-sm text-slate-400 max-w-2xl mx-auto italic">
            Positioning Note: MEP-light is a decision-support demo. It does not predict or guarantee market success. It helps structure expansion thinking and clarify what should be validated next.
          </p>

          {/* Auth error banner */}
          {renderAuthError()}

        </div>
      </section>

      {/* ─── Features Bento Grid ────────────────────────────────── */}
      <section className="landing-features" id="features">
        <div className="landing-section-header">
          <span className="landing-section-tag">CAPABILITIES</span>
          <h2 className="landing-section-title">
            Built for structured
            <br />
            <span className="landing-gradient-text">expansion planning</span>
          </h2>
          <p className="landing-section-desc">
            Every feature is designed to reduce uncertainty and clarify market-entry decisions.
          </p>
        </div>
        <div className="landing-bento">
          {features.map((f, i) => (
            <div
              key={i}
              className={`landing-bento-card ${hoveredFeature === i ? "landing-bento-active" : ""}`}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
            >
              <div className={`landing-bento-icon bg-gradient-to-br ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="landing-bento-title">{f.title}</h3>
              <p className="landing-bento-desc">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────────── */}
      <section className="landing-how" id="how">
        <div className="landing-section-header">
          <span className="landing-section-tag">METHODOLOGY</span>
          <h2 className="landing-section-title">
            Three steps to{" "}
            <span className="landing-gradient-text">strategic clarity</span>
          </h2>
        </div>
        <div className="landing-steps">
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className="landing-step">
                <div className="landing-step-number">{s.number}</div>
                <div className="landing-step-icon">{s.icon}</div>
                <h3 className="landing-step-title">{s.title}</h3>
                <p className="landing-step-subtitle">{s.subtitle}</p>
                <p className="landing-step-desc">{s.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="landing-step-connector">
                  <ArrowRight className="w-6 h-6" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ─── Security & Trust ───────────────────────────────────── */}
      <section className="landing-trust">
        <div className="landing-trust-inner">
          <Lock className="w-8 h-8 text-teal-400" />
          <div>
            <h3 className="landing-trust-title">Enterprise Security Built-In</h3>
            <p className="landing-trust-desc">
              Google OIDC authentication • Role-Based Access Control (Viewer, Consultant, Administrator) • 
              Audit logging • PostgreSQL persistence • Prometheus observability
            </p>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ──────────────────────────────────────────── */}
      <section className="landing-final-cta">
        <div className="landing-final-cta-content">
          <h2 className="landing-final-title">
            Ready to prioritize your markets?
          </h2>
          <p className="landing-final-desc">
            Start your first strategic assessment in under 3 minutes.
            No credit card required.
          </p>
          {renderGoogleButtonContainer(ctaButtonRef, "cta-google-signin", "Start Demo Assessment")}
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <Globe2 className="w-4 h-4 text-teal-400" />
            <span>INNOBASE</span>
          </div>
          <p className="landing-footer-copy">
            © 2026 INNOBASE Consulting • Market Entry Prioritizer •
            Proprietary Enterprise Strategy Tool • Beta Demo v1.6
          </p>
          <p className="landing-footer-charter">
            Charter: "Clarify Preparedness, Do Not Predict Success"
          </p>
        </div>
      </footer>
    </div>
  );
}
