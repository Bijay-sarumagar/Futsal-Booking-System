import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { LayoutDashboard, MapPin, CalendarDays, Clock3, Wallet, LogOut, X } from "lucide-react";
import { useAuth } from "../auth/auth-context";

const ownerLinks = [
  { to: "/owner", label: "Overview", icon: LayoutDashboard },
  { to: "/owner/futsals", label: "View Futsals", icon: MapPin },
  { to: "/owner/bookings", label: "Bookings", icon: CalendarDays },
  { to: "/owner/slots", label: "Manage Slots", icon: Clock3 },
  { to: "/owner/payments", label: "Payment History", icon: Wallet },
];

export function OwnerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/owner") return location.pathname === "/owner";
    return location.pathname.startsWith(path);
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
    <div className="owner-layout-wrap w-full py-6 md:py-8">
      <div className="owner-layout-container">
        <div className="owner-layout-grid">
          <aside className="owner-sidebar owner-sidebar-panel app-shell__side-panel rounded-2xl border border-border bg-card p-4 md:p-5 h-fit">
            <div className="h-px bg-border mt-1 mb-4" aria-hidden="true" />

            <nav aria-label="Navigation" className="owner-nav-wrap">
              <ul className="owner-nav-list">
                {ownerLinks.map((link) => (
                  <li key={link.to} className="owner-nav-item">
                    <Link to={link.to} className={`owner-nav-link${isActive(link.to) ? " active" : ""}`}>
                      <link.icon className="nav-icon" style={{ width: "15px", height: "15px", flexShrink: 0 }} />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="owner-signout-wrap">
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

          <section className="owner-content" style={{ minWidth: 0 }}>
            <Outlet />
          </section>
        </div>
      </div>
      {logoutConfirmOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-ui-overlay-enter">
          <div className="bg-white/95 backdrop-blur-xl rounded-[32px] w-full max-w-xl p-8 border border-border/80 shadow-[0_32px_100px_rgba(15,23,42,0.18)] ring-1 ring-primary/10 animate-ui-modal-enter">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-700 font-semibold">Logout confirmation</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">Ready to sign out?</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                  End your session safely and return to the login page. Your unsaved data will remain secure.
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
                Stay signed in
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
