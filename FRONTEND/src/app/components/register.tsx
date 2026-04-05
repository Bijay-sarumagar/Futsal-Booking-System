import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setExistingUser(false);

    if (form.password !== form.password2) {
      setError("Passwords do not match");
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border border-border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Create account</h1>
        <p className="text-sm text-muted-foreground mb-6">Register as player or owner.</p>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="rounded-lg border px-3 py-2.5" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <input className="rounded-lg border px-3 py-2.5" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="rounded-lg border px-3 py-2.5" placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
          <input className="rounded-lg border px-3 py-2.5" placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          <input className="rounded-lg border px-3 py-2.5" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <select className="rounded-lg border px-3 py-2.5" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "player" | "owner" })}>
            <option value="player">Player</option>
            <option value="owner">Owner</option>
          </select>
          <input className="rounded-lg border px-3 py-2.5" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input className="rounded-lg border px-3 py-2.5" type="password" placeholder="Confirm password" value={form.password2} onChange={(e) => setForm({ ...form, password2: e.target.value })} required />

          {error ? <p className="text-sm text-red-600 md:col-span-2">{error}</p> : null}
          {existingUser ? (
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-sm text-emerald-700 underline"
              >
                User already registered. Go to login.
              </button>
            </div>
          ) : null}

          <button
            disabled={loading}
            className="md:col-span-2 rounded-lg bg-emerald-600 text-white py-2.5 hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-muted-foreground mt-4 text-center">
          Already have an account? <Link to="/login" className="text-emerald-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
