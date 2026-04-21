import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, CircleCheckBig, Eye, EyeOff, Lock, Mail, MapPin, Phone, ShieldCheck, Sparkles, User } from "lucide-react";
import futsalLogo from "@/assets/images/futsalhub-logo.png";
import { useAuth } from "../auth/auth-context";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    password: "",
    password2: "",
    role: "player" as "player" | "owner",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingUser, setExistingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
    setExistingUser(false);

    const requiredFields: Array<{ key: keyof typeof form; label: string }> = [
      { key: "first_name", label: "First name" },
      { key: "last_name", label: "Last name" },
      { key: "username", label: "Username" },
      { key: "email", label: "Email address" },
      { key: "phone", label: "Phone number" },
      { key: "password", label: "Password" },
      { key: "password2", label: "Confirm password" },
    ];

    for (const item of requiredFields) {
      if (!String(form[item.key]).trim()) {
        setError(`${item.label} is required.`);
        return;
      }
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.password2) {
      setError("Passwords do not match");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate("/login", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
      const lower = message.toLowerCase();
      if (lower.includes("already") || lower.includes("exists") || lower.includes("unique")) {
        setExistingUser(true);
      }
    } finally {
      setLoading(false);
    }
  }

  const field = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className={`auth-scene ${mounted ? "auth-scene--mounted" : ""}`}>
      <div className="auth-blob auth-blob--1" aria-hidden />
      <div className="auth-blob auth-blob--2" aria-hidden />
      <div className="auth-blob auth-blob--3" aria-hidden />
      <div className="auth-grid-overlay" aria-hidden />

      <div className="auth-main">
        <Link to="/" className="auth-logo-bar" aria-label="FutsalHub home">
          <span className="auth-logo-mark">
            <img src={futsalLogo} alt="FutsalHub logo" className="w-11 h-11 object-contain" />
          </span>
          <span className="auth-logo-text">
            Futsal<span>Hub</span>
          </span>
        </Link>

        <div className="auth-card">
          <div className="auth-card-accent" aria-hidden />

          <div className="auth-tab-row" role="tablist" aria-label="Auth tabs">
            <Link to="/login" className="auth-tab" role="tab" aria-selected="false">
              Sign in
            </Link>
            <Link to="/register" className="auth-tab active" role="tab" aria-selected="true">
              Create account
            </Link>
          </div>

          <div className="auth-panel">
            <div className="auth-panel-head">
              <div className="auth-panel-eyebrow">
                <span className="auth-eyebrow-dot" aria-hidden /> Get started free
              </div>
              <h1 className="auth-panel-title">
                Join <span>FutsalHub.</span>
              </h1>
              <p className="auth-panel-sub">
                Book courts, find opponents, and build your game.
              </p>
            </div>

            <form onSubmit={onSubmit} noValidate>
              <div className="auth-role-section">
                <p className="auth-role-label" id="role-group-label">I am a</p>
                <div className="auth-role-row" role="radiogroup" aria-labelledby="role-group-label">
                  <button
                    type="button"
                    className={`auth-role-btn ${form.role === "player" ? "active" : ""}`}
                    onClick={() => field("role", "player")}
                    aria-pressed={form.role === "player"}
                  >
                    <User className="w-4 h-4" aria-hidden />
                    Player
                  </button>
                  <button
                    type="button"
                    className={`auth-role-btn ${form.role === "owner" ? "active" : ""}`}
                    onClick={() => field("role", "owner")}
                    aria-pressed={form.role === "owner"}
                  >
                    <MapPin className="w-4 h-4" aria-hidden />
                    Owner
                  </button>
                </div>
              </div>

              <div className="auth-two-col">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-first-name">
                    First name
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><User /></span>
                    <input
                      id="reg-first-name"
                      className="auth-input"
                      placeholder="Enter first name"
                      value={form.first_name}
                      onChange={(e) => field("first_name", e.target.value)}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-last-name">
                    Last name
                  </label>
                  <div className="auth-input-wrap">
                    <input
                      id="reg-last-name"
                      className="auth-input no-icon"
                      placeholder="Enter last name"
                      value={form.last_name}
                      onChange={(e) => field("last_name", e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-username">
                  Username
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><User /></span>
                  <input
                    id="reg-username"
                    className="auth-input"
                    placeholder="Choose username"
                    value={form.username}
                    onChange={(e) => field("username", e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-email">
                  Email address
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><Mail /></span>
                  <input
                    id="reg-email"
                    className="auth-input"
                    type="email"
                    placeholder="Enter email"
                    value={form.email}
                    onChange={(e) => field("email", e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-phone">
                  Phone number
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><Phone /></span>
                  <input
                    id="reg-phone"
                    className="auth-input"
                    placeholder="Enter phone number"
                    value={form.phone}
                    onChange={(e) => field("phone", e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              <div className="auth-two-col">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-password">
                    Password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><Lock /></span>
                    <input
                      id="reg-password"
                      className="auth-input has-eye"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={form.password}
                      onChange={(e) => field("password", e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className={`auth-eye-btn ${showPassword ? "active" : ""}`}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reg-password-confirm">
                    Confirm
                  </label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon"><Lock /></span>
                    <input
                      id="reg-password-confirm"
                      className="auth-input has-eye"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={form.password2}
                      onChange={(e) => field("password2", e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className={`auth-eye-btn ${showConfirmPassword ? "active" : ""}`}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    >
                      {showConfirmPassword ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </div>
              </div>

              <label className="auth-check-row">
                <input
                  type="checkbox"
                  className="auth-checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span className="auth-check-text">
                  I agree to FutsalHub's{" "}
                  <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>{" "}
                  and{" "}
                  <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>.
                </span>
              </label>

              {error && !existingUser ? (
                <div className="auth-error-box" role="alert">
                  <span className="auth-error-indicator" aria-hidden />
                  {error}
                </div>
              ) : null}

              {existingUser ? (
                <div className="auth-error-box" role="alert">
                  <span className="auth-error-indicator" aria-hidden />
                  {error}&nbsp;
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="auth-label-link"
                  >
                    Go to login.
                  </button>
                </div>
              ) : null}

              <button disabled={loading} className="auth-submit" type="submit">
                <span className="auth-submit-label">
                  {loading ? (
                    <>
                      <span className="auth-spinner" aria-hidden /> Creating account...
                    </>
                  ) : (
                    <>
                      Create my account <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </span>
                <span className="auth-submit-shimmer" aria-hidden />
              </button>
            </form>

            <p className="auth-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="auth-trust-strip" aria-hidden>
        <span className="auth-trust-badge"><Sparkles /> 200+ venues</span>
        <span className="auth-sep" />
        <span className="auth-trust-badge"><ShieldCheck /> Secure payments</span>
        <span className="auth-sep" />
        <span className="auth-trust-badge"><CircleCheckBig /> Free to join</span>
      </div>
    </div>
  );
}
