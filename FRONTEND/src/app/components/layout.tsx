import { useEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { MapPin, Menu, X, Bell, User, Home, Search, LayoutDashboard, Shield, LogOut, Megaphone, Swords, CalendarCheck2, CreditCard, Sparkles, Bot } from "lucide-react";
import futsalLogo from "@/assets/images/futsalhub-logo.png";
import { Toaster } from "sonner";
import { useAuth } from "../auth/auth-context";
import { getFutsals, getMyBookings, getMyNotifications, getOwnersForAdmin, getUsersForAdmin, markAllNotificationsAsRead, markNotificationAsRead } from "../lib/api";
import { PlayerChatbot } from "./player-chatbot";

type UserRole = "player" | "owner" | "admin";
type AppNotification = {
  id: string;
  backendId?: number;
  notificationType: "announcement" | "booking" | "payment" | "alert" | "review" | "opponent" | "system";
  text: string;
  time: string;
  unread: boolean;
  details: string;
  route: string;
  createdAt: number;
};

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [announcementVersion, setAnnouncementVersion] = useState(0);

  const readStorageKey = user ? `futsalhub.readNotifications.${user.id}.${user.role}` : null;

  const getReadIds = () => {
    if (!readStorageKey) return new Set<string>();
    try {
      const raw = localStorage.getItem(readStorageKey);
      if (!raw) return new Set<string>();
      const ids = JSON.parse(raw) as string[];
      return new Set(ids);
    } catch {
      return new Set<string>();
    }
  };

  const storeReadIds = (ids: Set<string>) => {
    if (!readStorageKey) return;
    localStorage.setItem(readStorageKey, JSON.stringify(Array.from(ids)));
  };

  const role: UserRole = user?.role || "player";
  const usePlayerContentFrame = role === "player" && location.pathname !== "/player/home";
  const formatRelativeTime = (timestamp: number) => {
    const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: AppNotification["notificationType"]) => {
    if (type === "opponent") return { icon: Swords, className: "text-emerald-700 bg-emerald-100" };
    if (type === "booking") return { icon: CalendarCheck2, className: "text-blue-700 bg-blue-100" };
    if (type === "payment") return { icon: CreditCard, className: "text-amber-700 bg-amber-100" };
    if (type === "announcement") return { icon: Megaphone, className: "text-violet-700 bg-violet-100" };
    return { icon: Sparkles, className: "text-slate-700 bg-slate-100" };
  };

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

  useEffect(() => {
    function onAnnouncementCreated() {
      setAnnouncementVersion((prev) => prev + 1);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === "futsalhub.admin.announcements") {
        setAnnouncementVersion((prev) => prev + 1);
      }
    }

    window.addEventListener("futsalhub:announcement-created", onAnnouncementCreated as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("futsalhub:announcement-created", onAnnouncementCreated as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    async function loadNotifications() {
      if (!user) {
        setNotifications([]);
        return;
      }

      const readIds = getReadIds();
      const announcementRoute = user.role === "owner" ? "/owner" : user.role === "admin" ? "/super-admin" : "/player/home";

      const rawAnnouncements = localStorage.getItem("futsalhub.admin.announcements");
      const parsedAnnouncements = rawAnnouncements
        ? (JSON.parse(rawAnnouncements) as Array<{ id: number; title: string; message: string; createdAt: string }>)
        : [];

      const announcementNotifications: AppNotification[] = parsedAnnouncements.slice(0, 10).map((item) => {
        const notificationId = `announcement-${item.id}`;
        return {
          id: notificationId,
          notificationType: "announcement",
          text: `Announcement: ${item.title}`,
          time: new Date(item.createdAt).toLocaleString(),
          unread: !readIds.has(notificationId),
          details: item.message,
          route: announcementRoute,
          createdAt: new Date(item.createdAt).getTime(),
        };
      });

      let roleNotifications: AppNotification[] = [];

      if (user.role === "admin") {
        try {
          const [owners, futsals, users] = await Promise.all([
            getOwnersForAdmin(),
            getFutsals(),
            getUsersForAdmin(),
          ]);

          const ownerNotifications: AppNotification[] = owners.slice(0, 5).map((owner) => {
            const fullName = `${owner.first_name} ${owner.last_name}`.trim() || owner.username;
            const notificationId = `admin-owner-${owner.id}`;
            const ownerStatusLabel = owner.status === "active" ? "active" : "inactive";
            return {
              id: notificationId,
              notificationType: "alert",
              text: `New owner registered: ${fullName}`,
              time: new Date(owner.created_at).toLocaleString(),
              unread: !readIds.has(notificationId),
              details: `Owner account created with status ${ownerStatusLabel}.`,
              route: "/super-admin/owners",
              createdAt: new Date(owner.created_at).getTime(),
            };
          });

          const futsalNotifications: AppNotification[] = futsals
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map((item) => {
              const notificationId = `admin-futsal-${item.id}`;
              return {
                id: notificationId,
                notificationType: "alert",
                text: `New futsal listing: ${item.futsal_name}`,
                time: new Date(item.created_at).toLocaleString(),
                unread: !readIds.has(notificationId),
                details: `${item.owner_name} submitted a futsal in ${item.location}.`,
                route: "/super-admin/futsals",
                createdAt: new Date(item.created_at).getTime(),
              };
            });

          const userNotifications: AppNotification[] = users
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 5)
            .map((item) => {
              const notificationId = `admin-user-${item.id}`;
              const userStatusLabel = item.status === "active" ? "active" : "inactive";
              return {
                id: notificationId,
                notificationType: "alert",
                text: `New user registered: ${item.username}`,
                time: new Date(item.created_at).toLocaleString(),
                unread: !readIds.has(notificationId),
                details: `Role: ${item.role} | Status: ${userStatusLabel}`,
                route: "/super-admin/users",
                createdAt: new Date(item.created_at).getTime(),
              };
            });

          roleNotifications = [...ownerNotifications, ...futsalNotifications, ...userNotifications];
        } catch {
          roleNotifications = [];
        }
      } else {
        try {
          const [bookings, backendNotifications] = await Promise.all([getMyBookings(), getMyNotifications()]);
          const sorted = [...bookings].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          roleNotifications = sorted.slice(0, 8).map((booking) => {
            const time = new Date(booking.created_at).toLocaleString();
            const notificationId = `booking-${booking.id}`;
            if (user.role === "owner") {
              const ownerMessage = booking.payment_status === "completed"
                ? `${booking.user_name || "A player"} booked and paid for ${booking.futsal_details.futsal_name}.`
                : `${booking.user_name || "A player"} booked ${booking.futsal_details.futsal_name}.`;
              return {
                id: notificationId,
                notificationType: "booking",
                text: ownerMessage,
                time,
                unread: booking.booking_status === "confirmed" && !readIds.has(notificationId),
                details: `Date: ${booking.slot_details.slot_date} | Time: ${formatTimeLabel(booking.slot_details.start_time)} - ${formatTimeLabel(booking.slot_details.end_time)} | Amount: Rs. ${booking.slot_details.price}`,
                route: "/owner/bookings",
                createdAt: new Date(booking.created_at).getTime(),
              };
            }

            return {
              id: notificationId,
              notificationType: "booking",
              text: `Booked: ${booking.futsal_details.futsal_name} on ${booking.slot_details.slot_date}.`,
              time,
              unread: booking.booking_status === "confirmed" && !readIds.has(notificationId),
              details: `Time: ${formatTimeLabel(booking.slot_details.start_time)} - ${formatTimeLabel(booking.slot_details.end_time)} | Amount: Rs. ${booking.slot_details.price}`,
              route: "/my-bookings",
              createdAt: new Date(booking.created_at).getTime(),
            };
          });

          const apiNotifications: AppNotification[] = backendNotifications.slice(0, 8).map((item) => ({
            id: `notif-${item.id}`,
            backendId: item.id,
            notificationType: item.notification_type,
            text: item.message,
            time: new Date(item.created_at).toLocaleString(),
            unread: !item.is_read && !readIds.has(`notif-${item.id}`),
            details: item.notification_type === "opponent" ? "Open Opponent Finder to respond." : "",
            route: item.notification_type === "opponent" ? "/find-opponents" : "/player/home",
            createdAt: new Date(item.created_at).getTime(),
          }));

          roleNotifications = [...apiNotifications, ...roleNotifications];
        } catch {
          roleNotifications = [];
        }
      }

      const merged = [...announcementNotifications, ...roleNotifications]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 14);

      setNotifications(merged);
    }

    loadNotifications();
  }, [user, location.pathname, announcementVersion]);

  async function markAllAsRead() {
    const readIds = getReadIds();
    notifications.forEach((notification) => readIds.add(notification.id));
    storeReadIds(readIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));

    if (user?.role !== "admin") {
      try {
        await markAllNotificationsAsRead();
      } catch {
        // Keep UI responsive even if backend read sync fails.
      }
    }
  }

  async function openNotification(notification: AppNotification) {
    const readIds = getReadIds();
    readIds.add(notification.id);
    storeReadIds(readIds);
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, unread: false } : n)));

    if (notification.backendId) {
      try {
        await markNotificationAsRead(notification.backendId);
      } catch {
        // Ignore backend mark-read failures to avoid blocking navigation.
      }
    }

    setNotifOpen(false);
    navigate(notification.route);
  }

  const unreadCount = notifications.filter((n) => n.unread).length;

  const navLinks = {
    player: [
      { to: "/player/home", label: "Home", icon: Home },
      { to: "/search", label: "Find Futsals", icon: Search },
      { to: "/my-bookings", label: "My Bookings", icon: LayoutDashboard },
      { to: "/find-opponents", label: "Find Opponents", icon: User },
      { to: "/player/chatbot", label: "AI Chat", icon: Bot },
    ],
    owner: [],
    admin: [],
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
    <div className="app-shell min-h-screen bg-background flex flex-col">
      <Toaster position="top-right" offset={72} mobileOffset={72} />
      {/* Header */}
      <header
        className="app-shell__header sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/80"
        style={{ boxShadow: "var(--shadow-header)" }}
      >
        <div className="app-shell__header-inner w-full px-4 sm:px-6 md:px-8 flex items-center justify-between min-h-16 py-2 md:py-0">
          <Link
            to={roleHome}
            className="app-shell__brand flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            <img src={futsalLogo} alt="FutsalHub logo" className="w-12 h-12 object-contain" />
            <span className="app-shell__brand-text text-lg font-semibold text-foreground tracking-tight">FutsalHub</span>
          </Link>

          {/* Desktop Nav */}
          {links.length > 0 ? (
            <nav className="app-shell__desktop-nav hidden md:flex items-center gap-1" aria-label="Main">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`app-shell__nav-link px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                    isActive(l.to) ? "app-shell__nav-link--active bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          ) : <div className="hidden md:block" />}

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="app-shell__role-badge hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium bg-muted/50 text-foreground">
              {role === "player" && <User className="w-4 h-4" />}
              {role === "owner" && <LayoutDashboard className="w-4 h-4" />}
              {role === "admin" && <Shield className="w-4 h-4" />}
              {role !== "admin" ? <span className="capitalize">{role}</span> : null}
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                aria-expanded={notifOpen}
                aria-haspopup="true"
                className="app-shell__icon-btn relative min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-card" aria-hidden />
                ) : null}
              </button>
              {notifOpen && (
                <div
                  className="app-shell__notice-popover absolute right-0 top-full mt-2 bg-card border border-border rounded-2xl w-[min(100vw-2rem,24rem)] z-50 overflow-hidden"
                  style={{ boxShadow: "var(--shadow-popover)" }}
                >
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2 bg-muted/35">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground">Activity</h4>
                    {notifications.length > 0 ? (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
                      >
                        Mark all as read
                      </button>
                    ) : null}
                  </div>
                  <div className="max-h-[26rem] overflow-y-auto py-1">
                    {notifications.map((n) => (
                      <button
                        type="button"
                        key={n.id}
                        onClick={() => openNotification(n)}
                        className={`app-shell__notice-item w-full text-left px-4 py-3.5 border-b border-border/70 last:border-0 hover:bg-muted/65 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                          n.unread ? "bg-primary/5" : "bg-card"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getNotificationIcon(n.notificationType).className}`}>
                            {(() => {
                              const Icon = getNotificationIcon(n.notificationType).icon;
                              return <Icon className="w-4 h-4" />;
                            })()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="text-[0.93rem] font-semibold text-foreground leading-snug line-clamp-2">{n.text}</span>
                              {n.unread ? <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" aria-hidden /> : null}
                            </span>
                            {n.details ? <span className="block text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{n.details}</span> : null}
                            <span className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground mt-2">{formatRelativeTime(n.createdAt)}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                    {notifications.length === 0 ? (
                      <div className="p-6 text-sm text-muted-foreground text-center">No notifications yet.</div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="app-shell__avatar min-h-10 min-w-10 h-10 w-10 shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              title="Open profile"
            >
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || "U"
              )}
            </button>

            <button
              type="button"
              onClick={requestSignOut}
              className="app-shell__signout hidden sm:inline-flex items-center justify-end gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <LogOut className="w-4 h-4 shrink-0" /> Sign out
            </button>

            {/* Mobile menu */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="app-shell__icon-btn md:hidden min-h-10 min-w-10 inline-flex items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="app-shell__mobile-nav md:hidden border-t border-border bg-card px-4 py-3 space-y-1" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={`app-shell__mobile-link flex items-center gap-3 px-3 py-3.5 rounded-lg text-sm font-medium min-h-11 ${
                  isActive(l.to) ? "app-shell__mobile-link--active bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <l.icon className="w-5 h-5 shrink-0" />
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={requestSignOut}
              className="w-full mt-2 flex items-center justify-end gap-3 px-3 py-3.5 rounded-lg text-sm font-medium text-muted-foreground border border-border hover:bg-muted min-h-11"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              Sign out
            </button>
          </nav>
        )}
      </header>

      {logoutConfirmOpen ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-ui-overlay-enter">
          <div className="bg-white/95 backdrop-blur-xl rounded-[32px] w-full max-w-xl p-8 border border-border/80 shadow-[0_32px_100px_rgba(15,23,42,0.18)] ring-1 ring-primary/10 animate-ui-modal-enter">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-700 font-semibold">Logout confirmation</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900">Ready to sign out?</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                  You can sign out now and return to the login page. Your active session will end safely.
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
      {/* Content */}
      <main className="flex-1">
        {usePlayerContentFrame ? (
          <div className="app-shell__player-content">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {role === "player" && location.pathname !== "/player/chatbot" ? <PlayerChatbot /> : null}

      {/* Footer */}
      <footer className="app-shell__footer bg-foreground text-background/70 py-10 md:py-12">
        <div className="app-shell__footer-grid max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <MapPin className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="app-shell__footer-logo text-background font-semibold tracking-tight">FutsalHub</span>
            </div>
            <p className="text-sm leading-relaxed">Book your favourite futsal courts across Nepal. Easy, fast, and reliable.</p>
          </div>
          <div>
            <h4 className="text-background font-semibold mb-3 text-sm">For Players</h4>
            <ul className="space-y-2 text-sm">
              <li>Find Futsals</li>
              <li>My Bookings</li>
              <li>Reviews</li>
              <li>Find Opponents</li>
            </ul>
          </div>
          <div>
            <h4 className="text-background font-semibold mb-3 text-sm">For Owners</h4>
            <ul className="space-y-2 text-sm">
              <li>Register Your Futsal</li>
              <li>Dashboard</li>
              <li>Analytics</li>
              <li>Support</li>
            </ul>
          </div>
          <div>
            <h4 className="text-background font-semibold mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>About Us</li>
              <li>Contact</li>
              <li>Privacy Policy</li>
              <li>Terms & Conditions</li>
            </ul>
          </div>
        </div>
        <div className="app-shell__footer-bottom max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-8 border-t border-background/15 text-center text-xs">
          © 2026 FutsalHub. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
