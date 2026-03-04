import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { LayoutDashboard, UserCog, MapPin, Users, LogOut, X } from "lucide-react";
import { useAuth } from "../auth/auth-context";

const adminLinks = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/owners", label: "Manage Owners", icon: UserCog },
  { to: "/admin/futsals", label: "Approve Futsals", icon: MapPin },
  { to: "/admin/users", label: "User Management", icon: Users },
];

export function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/admin") {
      return location.pathname === "/admin" || location.pathname === "/super-admin";
    }

    const aliasPath = path.replace("/admin", "/super-admin");
    return location.pathname.startsWith(path) || location.pathname.startsWith(aliasPath);
  };

  function requestSignOut() {
    setLogoutConfirmOpen(true);
  }

  function handleSignOut() {
    setLogoutConfirmOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  function cancelSignOut() {
    setLogoutConfirmOpen(false);
  }

  return (
    <div className="w-full py-6 md:py-8">
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-3 md:gap-4">
        <aside className="app-shell__side-panel rounded-2xl border border-border bg-card p-4 md:p-5 h-fit xl:sticky xl:top-24 xl:min-h-[70vh] flex flex-col">
          <div className="h-px bg-border mt-1 mb-4" aria-hidden="true" />

          <nav className="space-y-2 mt-2" aria-label="Super admin navigation">
            {adminLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive(link.to)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <link.icon className="w-4 h-4 shrink-0" />
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-border">
            <button
              type="button"
              onClick={requestSignOut}
              className="ml-auto inline-flex items-center justify-end gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>
        </aside>

        <section>
          <Outlet />
        </section>
      </div>
      {logoutConfirmOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-ui-overlay-enter">
          <div className="bg-white/95 backdrop-blur-xl rounded-[32px] w-full max-w-xl p-8 border border-border/80 shadow-[0_32px_100px_rgba(15,23,42,0.18)] ring-1 ring-primary/10 animate-ui-modal-enter">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-700 font-semibold">Logout confirmation</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">Ready to sign out?</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                  End your session safely and return to the login page. Your account stays secure when you sign out.
                </p>
              </div>
              <button onClick={cancelSignOut} className="p-3 rounded-full bg-muted/80 text-slate-700 hover:bg-muted transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={cancelSignOut}
                className="w-full py-4 rounded-2xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition"
              >
                Keep me signed in
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-4 rounded-2xl bg-destructive text-destructive-foreground text-sm font-semibold shadow-lg shadow-destructive/20 hover:bg-red-600 transition"
              >
                Yes, sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
