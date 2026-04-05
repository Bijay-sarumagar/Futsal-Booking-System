import { useEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { MapPin, Menu, X, Bell, User, Home, Search, LayoutDashboard, Shield, LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { useAuth } from "../auth/auth-context";
import { getMyBookings } from "../lib/api";

type UserRole = "player" | "owner" | "admin";

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<Array<{ id: number; text: string; time: string; unread: boolean; details: string; route: string }>>([]);
  const [selectedNotification, setSelectedNotification] = useState<{ id: number; text: string; time: string; details: string; route: string } | null>(null);

  const readStorageKey = user ? `futsalhub.readNotifications.${user.id}.${user.role}` : null;

  const getReadIds = () => {
    if (!readStorageKey) return new Set<number>();
    try {
      const raw = localStorage.getItem(readStorageKey);
      if (!raw) return new Set<number>();
      const ids = JSON.parse(raw) as number[];
      return new Set(ids);
    } catch {
      return new Set<number>();
    }
  };

  const storeReadIds = (ids: Set<number>) => {
    if (!readStorageKey) return;
    localStorage.setItem(readStorageKey, JSON.stringify(Array.from(ids)));
  };

  const role: UserRole = user?.role || "player";
  const formatTimeLabel = (value: string) => {
    const [hRaw, mRaw] = value.split(":");
    const hour24 = Number(hRaw);
    const minute = Number(mRaw);
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!notifRef.current?.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotifOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  function handleSignOut() {
    logout();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    async function loadNotifications() {
      if (!user) {
        setNotifications([]);
        return;
      }

      try {
        const bookings = await getMyBookings();
        const sorted = [...bookings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const readIds = getReadIds();

        const mapped = sorted.slice(0, 8).map((booking) => {
          const time = new Date(booking.created_at).toLocaleString();
          if (user.role === "owner") {
            const ownerMessage = booking.payment_status === "completed"
              ? `${booking.user_name || "A player"} booked and paid for ${booking.futsal_details.futsal_name}.`
              : `${booking.user_name || "A player"} booked ${booking.futsal_details.futsal_name}.`;
            return {
              id: booking.id,
              text: ownerMessage,
              time,
              unread: booking.booking_status === "confirmed" && !readIds.has(booking.id),
              details: `Date: ${booking.slot_details.slot_date} | Time: ${formatTimeLabel(booking.slot_details.start_time)} - ${formatTimeLabel(booking.slot_details.end_time)} | Amount: Rs. ${booking.slot_details.price}`,
              route: "/owner/bookings",
            };
          }

          return {
            id: booking.id,
            text: `Booked: ${booking.futsal_details.futsal_name} on ${booking.slot_details.slot_date}.`,
            time,
            unread: booking.booking_status === "confirmed" && !readIds.has(booking.id),
            details: `Time: ${formatTimeLabel(booking.slot_details.start_time)} - ${formatTimeLabel(booking.slot_details.end_time)} | Amount: Rs. ${booking.slot_details.price}`,
            route: "/my-bookings",
          };
        });

        setNotifications(mapped);
      } catch {
        setNotifications([]);
      }
    }

    loadNotifications();
  }, [user, location.pathname]);

  function markAllAsRead() {
    const readIds = getReadIds();
    notifications.forEach((notification) => readIds.add(notification.id));
    storeReadIds(readIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function openNotification(notification: { id: number; text: string; time: string; details: string; route: string }) {
    const readIds = getReadIds();
    readIds.add(notification.id);
    storeReadIds(readIds);
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, unread: false } : n)));
    setSelectedNotification(notification);
  }

  const unreadCount = notifications.filter((n) => n.unread).length;

  const navLinks = {
    player: [
      { to: "/player/home", label: "Home", icon: Home },
      { to: "/search", label: "Find Futsals", icon: Search },
      { to: "/my-bookings", label: "My Bookings", icon: LayoutDashboard },
    ],
    owner: [
      { to: "/owner", label: "Dashboard", icon: LayoutDashboard },
      { to: "/owner/futsals", label: "View Futsals", icon: MapPin },
      { to: "/owner/bookings", label: "Bookings", icon: Home },
      { to: "/owner/slots", label: "Manage Slots", icon: Search },
    ],
    admin: [
      { to: "/super-admin", label: "Super Admin", icon: Shield },
      { to: "/super-admin/owners", label: "Manage Owners", icon: User },
      { to: "/super-admin/futsals", label: "All Futsals", icon: MapPin },
    ],
  };

  const links = navLinks[role];
  const isActive = (path: string) => {
    if (path === "/owner/futsals") {
      return location.pathname === path || location.pathname.startsWith("/owner/futsals/");
    }
    return location.pathname === path;
  };

  const roleHome = role === "owner" ? "/owner" : role === "admin" ? "/super-admin" : "/player/home";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-right" />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link to={roleHome} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-[1.125rem] text-foreground" style={{ fontWeight: 700 }}>FutsalHub</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 rounded-lg transition-colors ${isActive(l.to) ? "bg-emerald-50 text-emerald-700" : "text-muted-foreground hover:bg-muted"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-[0.8125rem] bg-muted/40">
              {role === "player" && <User className="w-4 h-4" />}
              {role === "owner" && <LayoutDashboard className="w-4 h-4" />}
              {role === "admin" && <Shield className="w-4 h-4" />}
              <span className="capitalize">{role === "admin" ? "super admin" : role}</span>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 ? <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> : null}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg w-80 z-50">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <h4>Notifications</h4>
                    {notifications.length > 0 ? (
                      <button onClick={markAllAsRead} className="text-[0.75rem] text-emerald-600 hover:underline">
                        Mark all as read
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => openNotification(n)}
                        className={`w-full text-left p-3 border-b border-border last:border-0 hover:bg-muted/60 transition-colors ${n.unread ? "bg-emerald-50/50" : ""}`}
                      >
                        <p className="text-[0.875rem]">{n.text}</p>
                        <p className="text-[0.75rem] text-muted-foreground mt-1">{n.time}</p>
                      </button>
                    ))}
                    {notifications.length === 0 ? (
                      <div className="p-3 text-[0.8125rem] text-muted-foreground">No notifications yet.</div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <button
              onClick={() => navigate("/profile")}
              className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-[0.875rem] overflow-hidden"
              style={{ fontWeight: 600 }}
              title="Open profile"
            >
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase() || "U"
              )}
            </button>

            <button onClick={handleSignOut} className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-[0.8125rem] hover:bg-muted">
              <LogOut className="w-4 h-4" /> Sign out
            </button>

            {/* Mobile menu */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-white px-4 py-2">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg ${isActive(l.to) ? "bg-emerald-50 text-emerald-700" : "text-muted-foreground"}`}
              >
                <l.icon className="w-5 h-5" />
                {l.label}
              </Link>
            ))}
            <button onClick={handleSignOut} className="w-full mt-2 flex items-center gap-3 px-3 py-3 rounded-lg text-muted-foreground border border-border">
              <LogOut className="w-5 h-5" />
              Sign out
            </button>
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {selectedNotification ? (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-border overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-[1rem]" style={{ fontWeight: 700 }}>Notification</h3>
              <button onClick={() => setSelectedNotification(null)} className="p-1 rounded bg-white/20 hover:bg-white/30">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-[0.9375rem]" style={{ fontWeight: 600 }}>{selectedNotification.text}</p>
              <p className="text-[0.8125rem] text-muted-foreground mt-2">{selectedNotification.details}</p>
              <p className="text-[0.75rem] text-muted-foreground mt-2">{selectedNotification.time}</p>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setSelectedNotification(null)} className="px-4 py-2 border border-border rounded-lg text-[0.875rem] hover:bg-muted">
                  Close
                </button>
                <button
                  onClick={() => {
                    const route = selectedNotification.route;
                    setSelectedNotification(null);
                    setNotifOpen(false);
                    navigate(route);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[0.875rem] hover:bg-emerald-700"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="text-white" style={{ fontWeight: 700 }}>FutsalHub</span>
            </div>
            <p className="text-[0.875rem]">Book your favourite futsal courts across Nepal. Easy, fast, and reliable.</p>
          </div>
          <div>
            <h4 className="text-white mb-3">For Players</h4>
            <ul className="space-y-2 text-[0.875rem]">
              <li>Find Futsals</li><li>My Bookings</li><li>Reviews</li><li>Find Opponents</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white mb-3">For Owners</h4>
            <ul className="space-y-2 text-[0.875rem]">
              <li>Register Your Futsal</li><li>Dashboard</li><li>Analytics</li><li>Support</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white mb-3">Company</h4>
            <ul className="space-y-2 text-[0.875rem]">
              <li>About Us</li><li>Contact</li><li>Privacy Policy</li><li>Terms & Conditions</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-gray-800 text-center text-[0.8125rem]">
          © 2026 FutsalHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
