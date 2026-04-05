import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl mb-2" style={{ fontWeight: 700 }}>Sign in</h1>
        <p className="text-sm text-muted-foreground mb-6">Use your FutsalHub account to continue.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block mb-1.5 text-sm" style={{ fontWeight: 600 }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5"
              placeholder="testplayer"
              required
            />
          </div>
          <div>
            <label className="block mb-1.5 text-sm" style={{ fontWeight: 600 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2.5"
              placeholder="••••••••"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 text-white py-2.5 hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-muted-foreground mt-4 text-center">
          New here? <Link to="/register" className="text-emerald-700">Create account</Link>
        </p>
      </div>
    </div>
  );
}
