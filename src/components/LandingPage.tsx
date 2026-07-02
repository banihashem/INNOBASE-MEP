import React, { useState, useEffect } from "react";
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
          }) => void;
          prompt: (notification?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (element: HTMLElement, config: { theme?: string; size?: string; width?: number; text?: string; shape?: string; logo_alignment?: string }) => void;
          revoke: (email: string, callback: () => void) => void;
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

// ─── Landing Page Component ─────────────────────────────────────────

interface LandingPageProps {
  onSignIn: (user: UserProfile, token?: string) => void;
  isAuthenticated: boolean;
}

export default function LandingPage({ onSignIn, isAuthenticated }: LandingPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Poll for Google Identity Services readiness when configured.
  // The GIS script loads async; we must wait for it before allowing sign-in.
  useEffect(() => {
    if (!isGoogleAuthConfigured()) return;

    // Check immediately
    if (isGoogleAuthReady()) {
      initializeGis();
      setGisReady(true);
      return;
    }

    // Poll every 200ms for up to 10 seconds
    let attempts = 0;
    const maxAttempts = 50;
    const interval = setInterval(() => {
      attempts++;
      if (isGoogleAuthReady()) {
        clearInterval(interval);
        initializeGis();
        setGisReady(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error("[MEP Auth] Google Identity Services script failed to load after 10s");
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  /**
   * Initialize GIS with our client ID and credential callback.
   */
  function initializeGis() {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
  }

  /**
   * Handle the credential response from Google Identity Services.
   * The credential is a JWT id_token that we decode client-side
   * and store for backend API authentication.
   */
  const handleGoogleCredentialResponse = (response: { credential: string }) => {
    setIsLoading(true);
    setAuthError(null);

    const user = decodeGoogleJwt(response.credential);
    if (user) {
      onSignIn(user, response.credential);
    } else {
      setAuthError("Failed to decode authentication response. Please try again.");
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError(null);

    // ─── Real Google OIDC Flow ─────────────────────────────
    if (isGoogleAuthConfigured()) {
      // If GIS is ready, trigger the prompt
      if (gisReady && window.google?.accounts?.id) {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setAuthError(
              "Google sign-in popup was blocked. Please allow popups for this site, or try again."
            );
            setIsLoading(false);
          }
        });
        return;
      }

      // GIS configured but script hasn't loaded yet — wait and retry
      setAuthError(
        "Google sign-in is loading. Please wait a moment and try again."
      );
      setIsLoading(false);
      return;
    }

    // ─── Demo Fallback (no valid Client ID — local dev only) ─────
    setTimeout(() => {
      const demoUser: UserProfile = {
        email: "consultant@innobase.app",
        name: "Strategy Consultant",
        picture: "",
        sub: "demo-user-id",
      };
      onSignIn(demoUser);
      setIsLoading(false);
    }, 800);
  };

  const features = [
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Deterministic Scoring Engine",
      description:
        "Pure mathematical scoring — no AI hallucinations. Every score is reproducible, auditable, and board-ready.",
      color: "from-teal-400 to-cyan-400",
    },
    {
      icon: <Globe2 className="w-6 h-6" />,
      title: "9-Dimension Analysis",
      description:
        "Evaluate markets across Attractiveness, Offering Fit, Channel Access, Competitive Intensity, and 5 more dimensions.",
      color: "from-indigo-400 to-purple-400",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Certainty Guardrail™",
      description:
        "Automatic downgrade when high potential meets low confidence. Prevents premature Tier A classification.",
      color: "from-amber-400 to-orange-400",
    },
    {
      icon: <Route className="w-6 h-6" />,
      title: "90-Day Validation Roadmap",
      description:
        "Phase-gated action plans with decision milestones. Regulatory, channel, and pilot phases mapped automatically.",
      color: "from-emerald-400 to-teal-400",
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Evidence-Based Tier System",
      description:
        "Tier A / B / C classification with confidence scoring. Each tier backed by quantified evidence basis.",
      color: "from-rose-400 to-pink-400",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "PDF Export & Board Pack",
      description:
        "One-click executive-ready report generation. Complete strategic brief with scoring breakdown and assumptions.",
      color: "from-blue-400 to-indigo-400",
    },
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
            <span className="landing-logo-text">MEP-light™</span>
            <span className="landing-logo-tag">by INNOBASE</span>
          </div>
          <button
            className="landing-nav-cta"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="landing-spinner" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#fff"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#fff"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#fff"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#fff"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        </div>
      </nav>

      {/* ─── Hero Section ───────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Market Intelligence</span>
          </div>
          <h1 className="landing-hero-title">
            Prioritize your next market with{" "}
            <span className="landing-gradient-text">board-ready confidence</span>
          </h1>
          <p className="landing-hero-subtitle">
            The deterministic market-entry framework that transforms strategic
            intuition into evidence-backed, tier-classified expansion roadmaps.
            No AI hallucinations — pure mathematical scoring.
          </p>
          <div className="landing-hero-ctas">
            <button
              className="landing-cta-primary"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="landing-spinner" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <button className="landing-cta-secondary">
              <span>Watch 90-sec Overview</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ─── Floating Score Cards ───────────────────────────── */}
          <div className="landing-floating-cards">
            <div className="landing-float-card landing-float-1">
              <div className="landing-float-label">UAE Market</div>
              <div className="landing-float-score">72</div>
              <div className="landing-float-tier tier-b">Tier B</div>
            </div>
            <div className="landing-float-card landing-float-2">
              <div className="landing-float-label">Germany</div>
              <div className="landing-float-score">68</div>
              <div className="landing-float-tier tier-b">Tier B</div>
            </div>
            <div className="landing-float-card landing-float-3">
              <div className="landing-float-label">Canada</div>
              <div className="landing-float-score">65</div>
              <div className="landing-float-tier tier-b">Tier B</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social Proof ───────────────────────────────────────── */}
      <section className="landing-proof">
        <p className="landing-proof-label">
          TRUSTED BY STRATEGY LEADERS & CONSULTANTS
        </p>
        <div className="landing-proof-logos">
          {["INNOBASE", "Strategy Co", "Global Advisory", "Market Intel", "Trade Bureau"].map(
            (name, i) => (
              <div key={i} className="landing-proof-logo">
                {name}
              </div>
            )
          )}
        </div>
      </section>

      {/* ─── Features Bento Grid ────────────────────────────────── */}
      <section className="landing-features" id="features">
        <div className="landing-section-header">
          <span className="landing-section-tag">CAPABILITIES</span>
          <h2 className="landing-section-title">
            Built for enterprise-grade
            <br />
            <span className="landing-gradient-text">market intelligence</span>
          </h2>
          <p className="landing-section-desc">
            Every feature is designed to reduce uncertainty and maximize strategic
            confidence in market-entry decisions.
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
          <button
            className="landing-cta-primary landing-cta-large"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="landing-spinner" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Get Started with Google
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <Globe2 className="w-4 h-4 text-teal-400" />
            <span>MEP-light™ by INNOBASE</span>
          </div>
          <p className="landing-footer-copy">
            © 2026 INNOBASE Consulting • Market Entry Prioritizer •
            Proprietary Enterprise Strategy Tool • v{__APP_VERSION__}
          </p>
          <p className="landing-footer-charter">
            Charter: "Clarify Preparedness, Do Not Predict Success"
          </p>
        </div>
      </footer>
    </div>
  );
}
