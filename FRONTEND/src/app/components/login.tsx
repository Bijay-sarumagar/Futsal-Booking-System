import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, CircleCheckBig, Eye, EyeOff, Lock, Mail, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../auth/auth-context";

function rolePath(role: "player" | "owner" | "admin") {
  if (role === "owner") return "/owner";
  if (role === "admin") return "/admin";
  return "/";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.body.classList.add("auth-page");
    const root = document.getElementById("root");
    root?.classList.add("auth-page-root");
    const t = setTimeout(() => setMounted(true), 30);

    return () => {
      clearTimeout(t);
      document.body.classList.remove("auth-page");
      root?.classList.remove("auth-page-root");
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const me = await login(username, password);
      navigate(rolePath(me.role), { replace: true });
    } catch {
      setError("Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`auth-scene ${mounted ? "auth-scene--mounted" : ""}`}>
      <div className="auth-blob auth-blob--1" aria-hidden />
      <div className="auth-blob auth-blob--2" aria-hidden />
      <div className="auth-blob auth-blob--3" aria-hidden />
      <div className="auth-grid-overlay" aria-hidden />

      <div className="auth-main">
        <Link to="/" className="auth-logo-bar" aria-label="FutsalHub home">
          <span className="auth-logo-mark">
            <MapPin className="w-[22px] h-[22px]" />
          </span>
          <span className="auth-logo-text">
            Futsal<span>Hub</span>
          </span>
        </Link>

        <div className="auth-card">
          <div className="auth-card-accent" aria-hidden />

          <div className="auth-tab-row" role="tablist" aria-label="Auth tabs">
            <Link to="/login" className="auth-tab active" role="tab" aria-selected="true">
              Sign in
            </Link>
            <Link to="/register" className="auth-tab" role="tab" aria-selected="false">
              Create account
            </Link>
          </div>

          <div className="auth-panel">
            <div className="auth-panel-head">
              <div className="auth-panel-eyebrow">
                <span className="auth-eyebrow-dot" aria-hidden /> Welcome back
              </div>
              <h1 className="auth-panel-title">
                Ready to <span>play?</span>
              </h1>
              <p className="auth-panel-sub">
                Sign in to book courts, find opponents, and manage your games.
              </p>
            </div>

            <form onSubmit={onSubmit} noValidate>
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-username">
                  Username
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <Mail />
                  </span>
                  <input
                    id="login-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input"
                    placeholder="Enter username"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="login-password">
                  Password
                  <a
                    href="#"
                    className="auth-label-link"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot password?
                  </a>
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <Lock />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="auth-input has-eye"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className={`auth-eye-btn ${showPassword ? "active" : ""}`}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="auth-error-box" role="alert">
                  <span className="auth-error-indicator" aria-hidden />
                  {error}
                </div>
              ) : null}

              <button disabled={loading} className="auth-submit" type="submit">
                <span className="auth-submit-label">
                  {loading ? (
                    <>
                      <span className="auth-spinner" aria-hidden /> Signing in...
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </span>
                <span className="auth-submit-shimmer" aria-hidden />
              </button>
            </form>

            <p className="auth-footer">
              New here? <Link to="/register">Create account</Link>
            </p>
          </div>
        </div>

        <div className="auth-trust-strip" aria-hidden>
          <span className="auth-trust-badge">
            <Sparkles /> 200+ venues
          </span>
          <span className="auth-sep" />
          <span className="auth-trust-badge">
            <ShieldCheck /> Secure payments
          </span>
          <span className="auth-sep" />
          <span className="auth-trust-badge">
            <CircleCheckBig /> Free to join
          </span>
        </div>
      </div>
    </div>
  );
}
