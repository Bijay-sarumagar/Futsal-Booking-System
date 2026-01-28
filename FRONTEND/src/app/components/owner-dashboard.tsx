import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Users, Calendar, DollarSign, BarChart3, ArrowUp, ArrowDown, X, Download, Megaphone } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { getMyBookings, getMyFutsals, getPayments, getReviews, type BookingItem, type PaymentItem, type ReviewItem } from "../lib/api";
import { toast } from "sonner";

const PIE_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"];

export function OwnerDashboard() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");

  const formatMoney = (value: number) => `Rs. ${value.toLocaleString()}`;
  const formatTimeLabel = (value: string) => {
    const [hRaw, mRaw] = value.split(":");
    const hour24 = Number(hRaw);
    const minute = Number(mRaw);
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  useEffect(() => {
    async function loadBookings() {
      try {
        setBookingsLoading(true);
        const ownerBookings = await getMyBookings();
        setBookings(ownerBookings);
      } catch {
        toast.error("Failed to load booking analytics");
      } finally {
        setBookingsLoading(false);
      }
    }

    loadBookings();
  }, []);

  useEffect(() => {
    async function loadRecentReviews() {
      try {
        setReviewsLoading(true);
        const myFutsals = await getMyFutsals();
        if (!myFutsals.length) {
          setRecentReviews([]);
          return;
        }

        const reviewGroups = await Promise.all(myFutsals.slice(0, 5).map((f) => getReviews({ futsal: f.id })));
        const merged = reviewGroups.flat().sort((a, b) =>
          new Date(b.review_date).getTime() - new Date(a.review_date).getTime(),
        );
        setRecentReviews(merged.slice(0, 6));
      } catch {
        toast.error("Failed to load reviews");
      } finally {
        setReviewsLoading(false);
      }
    }

    loadRecentReviews();
  }, []);

  useEffect(() => {
    async function loadPayments() {
      try {
        setPaymentsLoading(true);
        const paymentData = await getPayments();
        setPayments(paymentData);
      } catch {
        toast.error("Failed to load payments");
      } finally {
        setPaymentsLoading(false);
      }
    }

    loadPayments();
  }, []);

  const activeBookings = useMemo(
    () => bookings.filter((booking) => booking.booking_status !== "cancelled"),
    [bookings],
  );

  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - 6);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  const completedPayments = useMemo(
    () => bookings.filter((booking) => booking.payment_status === "completed"),
    [bookings],
  );

  const totalRevenue = useMemo(
    () => activeBookings.reduce((sum, booking) => sum + Number(booking.slot_details.price), 0),
    [activeBookings],
  );

  const thisWeekRevenue = useMemo(() => {
    return activeBookings
      .filter((booking) => {
        const created = new Date(booking.created_at);
        return created >= startOfThisWeek && created <= now;
      })
      .reduce((sum, booking) => sum + Number(booking.slot_details.price), 0);
  }, [activeBookings, now, startOfThisWeek]);

  const lastWeekRevenue = useMemo(() => {
    return activeBookings
      .filter((booking) => {
        const created = new Date(booking.created_at);
        return created >= startOfLastWeek && created < startOfThisWeek;
      })
      .reduce((sum, booking) => sum + Number(booking.slot_details.price), 0);
  }, [activeBookings, startOfLastWeek, startOfThisWeek]);

  const thisWeekBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const created = new Date(booking.created_at);
      return created >= startOfThisWeek && created <= now;
    }).length;
  }, [bookings, now, startOfThisWeek]);

  const lastWeekBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const created = new Date(booking.created_at);
      return created >= startOfLastWeek && created < startOfThisWeek;
    }).length;
  }, [bookings, startOfLastWeek, startOfThisWeek]);

  const cancellationCount = useMemo(
    () => bookings.filter((booking) => booking.booking_status === "cancelled").length,
    [bookings],
  );

  const weeklyRevenue = useMemo(() => {
    const byDay = new Map<string, number>();
    const now = new Date();

    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      byDay.set(key, 0);
    }

    activeBookings.forEach((booking) => {
      const key = new Date(booking.created_at).toISOString().slice(0, 10);
      if (byDay.has(key)) {
        byDay.set(key, (byDay.get(key) || 0) + Number(booking.slot_details.price));
      }
    });

    return Array.from(byDay.entries()).map(([iso, revenue]) => ({
      day: new Date(iso).toLocaleDateString("en", { weekday: "short" }),
      revenue,
    }));
  }, [activeBookings]);

  const monthlyBookings = useMemo(() => {
    const byMonth = new Map<string, number>();
    const now = new Date();

    for (let i = 5; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, 0);
    }

    bookings.forEach((booking) => {
      const d = new Date(booking.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (byMonth.has(key)) {
        byMonth.set(key, (byMonth.get(key) || 0) + 1);
      }
    });

    return Array.from(byMonth.entries()).map(([isoMonth, count]) => {
      const [year, month] = isoMonth.split("-").map(Number);
      return {
        month: new Date(year, month - 1, 1).toLocaleDateString("en", { month: "short" }),
        bookings: count,
      };
    });
  }, [bookings]);

  const slotDistribution = useMemo(() => {
    const buckets = [
      { name: "Morning (6-12)", value: 0 },
      { name: "Afternoon (12-5)", value: 0 },
      { name: "Evening (5-9)", value: 0 },
      { name: "Night (9-10)", value: 0 },
    ];

    activeBookings.forEach((booking) => {
      const hour = Number(booking.slot_details.start_time.slice(0, 2));
      if (hour < 12) buckets[0].value += 1;
      else if (hour < 17) buckets[1].value += 1;
      else if (hour < 21) buckets[2].value += 1;
      else buckets[3].value += 1;
    });

    const total = buckets.reduce((sum, bucket) => sum + bucket.value, 0) || 1;
    return buckets.map((bucket, idx) => ({
      ...bucket,
      value: Math.round((bucket.value / total) * 100),
      color: PIE_COLORS[idx],
    }));
  }, [activeBookings]);

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .map((booking) => ({
        name: booking.user_name || "Player",
        time: `${formatTimeLabel(booking.slot_details.start_time)} - ${formatTimeLabel(booking.slot_details.end_time)}`,
        date: booking.slot_details.slot_date,
        amount: Number(booking.slot_details.price),
        status: booking.booking_status,
      }));
  }, [bookings]);

  const allBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((booking) => ({
        id: booking.id,
        name: booking.user_name || "Player",
        futsal: booking.futsal_details.futsal_name,
        time: `${formatTimeLabel(booking.slot_details.start_time)} - ${formatTimeLabel(booking.slot_details.end_time)}`,
        date: booking.slot_details.slot_date,
        amount: Number(booking.slot_details.price),
        status: booking.booking_status,
        payment: booking.payment_status,
      }));
  }, [bookings]);

  const bookingRate = useMemo(() => {
    const total = bookings.length || 1;
    return Math.round((activeBookings.length / total) * 100);
  }, [bookings, activeBookings]);

  const reviewAvg = useMemo(() => {
    if (!recentReviews.length) return "0.0";
    const value = recentReviews.reduce((sum, review) => sum + review.rating, 0) / recentReviews.length;
    return value.toFixed(1);
  }, [recentReviews]);

  const revenueDelta = thisWeekRevenue - lastWeekRevenue;
  const bookingDelta = thisWeekBookings - lastWeekBookings;
  const activePlayers = new Set(bookings.map((booking) => booking.user)).size;
  const paymentSummary = useMemo(() => {
    const completedAmount = payments
      .filter((item) => item.payment_status === "completed")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const refundedAmount = payments
      .filter((item) => item.payment_status === "refunded")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const pendingCount = payments.filter((item) => item.payment_status === "pending").length;
    return { completedAmount, refundedAmount, pendingCount };
  }, [payments]);
  const stats = [
    {
      label: "Total Revenue",
      value: formatMoney(totalRevenue),
      change: `${revenueDelta >= 0 ? "+" : "-"}${formatMoney(Math.abs(revenueDelta))}`,
      up: revenueDelta >= 0,
      icon: DollarSign,
    },
    {
      label: "Total Bookings",
      value: `${bookings.length}`,
      change: `${bookingDelta >= 0 ? "+" : "-"}${Math.abs(bookingDelta)}`,
      up: bookingDelta >= 0,
      icon: Calendar,
    },
    {
      label: "Booking Rate",
      value: `${bookingRate}%`,
      change: `${cancellationCount} cancelled`,
      up: cancellationCount === 0,
      icon: BarChart3,
    },
    {
      label: "Active Players",
      value: `${activePlayers}`,
      change: `${completedPayments.length} paid bookings`,
      up: completedPayments.length >= cancellationCount,
      icon: Users,
    },
  ];

  const handleDownloadReport = () => {
    const headers = ["Booking ID", "Player", "Futsal", "Date", "Time", "Amount", "Status", "Payment"];
    const rows = allBookings.map((booking) => [
      booking.id,
      booking.name,
      booking.futsal,
      booking.date,
      booking.time,
      booking.amount,
      booking.status,
      booking.payment,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `owner-bookings-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  function saveAnnouncement(title: string, message: string) {
    const announcement = {
      id: Date.now(),
      title,
      message,
      createdAt: new Date().toISOString(),
    };

    const storageKey = "futsalhub.admin.announcements";
    const existing = localStorage.getItem(storageKey);
    const parsed = existing ? (JSON.parse(existing) as typeof announcement[]) : [];
    localStorage.setItem(storageKey, JSON.stringify([announcement, ...parsed]));
    window.dispatchEvent(new CustomEvent("futsalhub:announcement-created"));
  }

  function handleCreateAnnouncement() {
    const title = announcementTitle.trim();
    const message = announcementMessage.trim();
    if (!title || !message) {
      toast.error("Please enter both title and message");
      return;
    }

    saveAnnouncement(title, message);
    setAnnouncementTitle("");
    setAnnouncementMessage("");
    setAnnouncementOpen(false);
    toast.success("Announcement created");
  }

  return (
    <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1>Platform Pulse</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">Global activity and fiscal performance for your futsals</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-11 border border-border bg-card rounded-lg text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button
            type="button"
            onClick={() => setAnnouncementOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-11 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 shrink-0"
          >
            <Megaphone className="w-4 h-4" />
            New Announcement
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {bookingsLoading ? (
          <p className="col-span-full text-muted-foreground text-sm py-4">Loading booking analytics…</p>
        ) : null}
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${s.up ? "text-primary" : "text-destructive"}`}>
                {s.change}
                {s.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              </span>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="mb-4 text-base">Weekly Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="mb-4 text-base">Monthly Bookings Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyBookings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="bookings" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base">Payment History</h3>
            <p className="text-sm text-muted-foreground mt-1">Track completed and refunded owner payments.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              {paymentsLoading ? "Loading…" : `${payments.length} transactions`}
            </div>
            <Link
              to="/owner/payments"
              className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted"
            >
              View all
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs uppercase tracking-wide text-primary">Completed</p>
            <p className="text-lg font-semibold tabular-nums mt-1">Rs. {paymentSummary.completedAmount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-xs uppercase tracking-wide text-destructive">Refunded</p>
            <p className="text-lg font-semibold tabular-nums mt-1">Rs. {paymentSummary.refundedAmount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Count</p>
            <p className="text-lg font-semibold tabular-nums mt-1">{paymentSummary.pendingCount}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Booking</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Futsal</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Amount</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Method</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Txn ID</th>
              </tr>
            </thead>
            <tbody>
              {paymentsLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading payments…</td>
                </tr>
              ) : null}
              {!paymentsLoading && payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No payment transactions yet.</td>
                </tr>
              ) : null}
              {payments.slice(0, 6).map((payment) => (
                <tr key={payment.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2.5">#{payment.booking_details.booking_id}</td>
                  <td className="px-3 py-2.5">{payment.booking_details.futsal}</td>
                  <td className="px-3 py-2.5 tabular-nums">Rs. {Number(payment.amount).toLocaleString()}</td>
                  <td className="px-3 py-2.5 capitalize">{payment.payment_method.replace("_", " ")}</td>
                  <td className="px-3 py-2.5 capitalize">{payment.payment_status}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{payment.transaction_id || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Slot Distribution */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h3 className="mb-4 text-base">Peak Hour Distribution</h3>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={slotDistribution} cx="50%" cy="48%" outerRadius={72} dataKey="value" label={({ value }) => `${value}%`}>
                {slotDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {slotDistribution.map((s) => (
              <div key={s.name} className="flex items-center gap-2 text-[0.8125rem]">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-base">Recent Bookings</h3>
            <button
              type="button"
              onClick={() => setViewAllOpen(true)}
              className="px-3 py-2 min-h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-fit"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-muted/50">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2.5 px-3 font-medium">Player</th>
                  <th className="text-left py-2.5 px-3 font-medium">Date</th>
                  <th className="text-left py-2.5 px-3 font-medium">Time</th>
                  <th className="text-left py-2.5 px-3 font-medium">Amount</th>
                  <th className="text-left py-2.5 px-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="py-3 px-3 font-medium">{b.name}</td>
                    <td className="py-3 px-3 text-muted-foreground">{b.date}</td>
                    <td className="py-3 px-3 text-muted-foreground">{b.time}</td>
                    <td className="py-3 px-3 tabular-nums">Rs. {b.amount}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          b.status === "confirmed"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-amber-50 text-amber-900 border-amber-200/80"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base">Player Reviews</h3>
            <p className="text-sm text-muted-foreground mt-1">Average from latest feedback: {reviewAvg} / 5</p>
          </div>
        </div>
        {reviewsLoading ? <p className="text-sm text-muted-foreground">Loading reviews…</p> : null}
        {!reviewsLoading && recentReviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet for your futsals.</p>
        ) : null}
        <div className="space-y-3">
          {recentReviews.map((review) => (
            <div key={review.id} className="p-4 bg-muted/40 border border-border rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{review.user_name || "Player"}</p>
                <p className="text-xs text-muted-foreground shrink-0">{new Date(review.review_date).toLocaleDateString()}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{review.futsal_name}</p>
              <p className="text-sm text-amber-700 mt-2" aria-label={`Rating ${review.rating} of 5`}>
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
              </p>
              <p className="text-sm mt-2 text-foreground leading-relaxed">{review.comment || "No written comment."}</p>
            </div>
          ))}
        </div>
      </div>

      {viewAllOpen ? (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-5xl border border-border overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
            <div className="bg-primary text-primary-foreground px-5 py-4 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-lg font-semibold">All Owner Bookings</h3>
                <p className="text-primary-foreground/85 text-sm mt-0.5">Complete list of bookings for your futsals</p>
              </div>
              <button
                type="button"
                onClick={() => setViewAllOpen(false)}
                className="p-2 rounded-lg bg-primary-foreground/15 hover:bg-primary-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto flex-1">
              <div className="overflow-x-auto border border-border rounded-xl bg-card">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Player</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Futsal</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Time</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBookings.map((booking) => (
                      <tr key={booking.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-3 py-2.5">{booking.name}</td>
                        <td className="px-3 py-2.5">{booking.futsal}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{booking.date}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{booking.time}</td>
                        <td className="px-3 py-2.5 tabular-nums">Rs. {booking.amount}</td>
                        <td className="px-3 py-2.5 capitalize">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              booking.status === "cancelled"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-primary/10 text-primary border-primary/20"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 capitalize">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              booking.payment === "completed"
                                ? "bg-primary/10 text-primary border-primary/20"
                                : "bg-amber-50 text-amber-900 border-amber-200/80"
                            }`}
                          >
                            {booking.payment}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {allBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-5 text-center text-muted-foreground">No bookings found yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {announcementOpen ? (
        <div className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-card rounded-2xl w-full max-w-lg border border-border overflow-hidden shadow-xl">
            <div className="bg-primary text-primary-foreground px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Create Announcement</h3>
              <button
                type="button"
                onClick={() => setAnnouncementOpen(false)}
                className="p-2 rounded-lg bg-primary-foreground/15 hover:bg-primary-foreground/25"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Title</label>
                <input
                  value={announcementTitle}
                  onChange={(event) => setAnnouncementTitle(event.target.value)}
                  placeholder="Schedule update"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Message</label>
                <textarea
                  value={announcementMessage}
                  onChange={(event) => setAnnouncementMessage(event.target.value)}
                  rows={4}
                  placeholder="Write the announcement to share with users."
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAnnouncementOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateAnnouncement}
                  className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
                >
                  Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
