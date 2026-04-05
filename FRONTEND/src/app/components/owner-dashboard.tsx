import { useEffect, useMemo, useState } from "react";
import { Users, Calendar, DollarSign, BarChart3, ArrowUp, ArrowDown, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { getMyBookings, getMyFutsals, getReviews, type BookingItem, type ReviewItem } from "../lib/api";
import { toast } from "sonner";

const PIE_COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"];

export function OwnerDashboard() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [recentReviews, setRecentReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Owner Dashboard</h1>
          <p className="text-muted-foreground">Live performance and booking analytics</p>
        </div>
        <button onClick={handleDownloadReport} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-[0.875rem] hover:bg-emerald-700">
          Download Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {bookingsLoading ? <p className="col-span-full text-muted-foreground text-[0.875rem]">Loading booking analytics...</p> : null}
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <span className={`flex items-center gap-1 text-[0.8125rem] ${s.up ? "text-emerald-600" : "text-red-500"}`}>
                {s.change}
                {s.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              </span>
            </div>
            <p className="text-[1.5rem]" style={{ fontWeight: 700 }}>{s.value}</p>
            <p className="text-[0.8125rem] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="mb-4">Weekly Revenue</h3>
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
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="mb-4">Monthly Bookings Trend</h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Slot Distribution */}
        <div className="bg-white border border-border rounded-xl p-5">
          <h3 className="mb-4">Peak Hour Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={slotDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${value}%`}>
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
        <div className="lg:col-span-2 bg-white border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3>Recent Bookings</h3>
            <button
              onClick={() => setViewAllOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[0.8125rem] hover:bg-emerald-700"
              style={{ fontWeight: 500 }}
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-[0.8125rem] text-muted-foreground">
                  <th className="text-left py-2 font-[500]">Player</th>
                  <th className="text-left py-2 font-[500]">Date</th>
                  <th className="text-left py-2 font-[500]">Time</th>
                  <th className="text-left py-2 font-[500]">Amount</th>
                  <th className="text-left py-2 font-[500]">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b, i) => (
                  <tr key={i} className="border-b border-border last:border-0 text-[0.875rem]">
                    <td className="py-3">{b.name}</td>
                    <td className="py-3 text-muted-foreground">{b.date}</td>
                    <td className="py-3 text-muted-foreground">{b.time}</td>
                    <td className="py-3">Rs. {b.amount}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[0.75rem] ${b.status === "confirmed" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
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

      <div className="mt-6 bg-white border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3>Player Reviews</h3>
            <p className="text-[0.8125rem] text-muted-foreground">Average from latest feedback: {reviewAvg} / 5</p>
          </div>
        </div>
        {reviewsLoading ? (
          <p className="text-[0.875rem] text-muted-foreground">Loading reviews...</p>
        ) : null}
        {!reviewsLoading && recentReviews.length === 0 ? (
          <p className="text-[0.875rem] text-muted-foreground">No reviews yet for your futsals.</p>
        ) : null}
        <div className="space-y-3">
          {recentReviews.map((review) => (
            <div key={review.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-[0.875rem]" style={{ fontWeight: 600 }}>{review.user_name || "Player"}</p>
                <p className="text-[0.75rem] text-muted-foreground">{new Date(review.review_date).toLocaleDateString()}</p>
              </div>
              <p className="text-[0.75rem] text-muted-foreground">{review.futsal_name}</p>
              <p className="text-[0.8125rem] text-amber-600 mt-1">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
              <p className="text-[0.875rem] mt-1">{review.comment || "No written comment."}</p>
            </div>
          ))}
        </div>
      </div>

      {viewAllOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-[1.125rem]" style={{ fontWeight: 700 }}>All Owner Bookings</h3>
                <p className="text-emerald-100 text-[0.8125rem]">Complete list of bookings for your futsals</p>
              </div>
              <button onClick={() => setViewAllOpen(false)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-[0.875rem]">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-3 py-2 font-[500]">Player</th>
                      <th className="text-left px-3 py-2 font-[500]">Futsal</th>
                      <th className="text-left px-3 py-2 font-[500]">Date</th>
                      <th className="text-left px-3 py-2 font-[500]">Time</th>
                      <th className="text-left px-3 py-2 font-[500]">Amount</th>
                      <th className="text-left px-3 py-2 font-[500]">Status</th>
                      <th className="text-left px-3 py-2 font-[500]">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allBookings.map((booking) => (
                      <tr key={booking.id} className="border-t border-border">
                        <td className="px-3 py-2">{booking.name}</td>
                        <td className="px-3 py-2">{booking.futsal}</td>
                        <td className="px-3 py-2 text-muted-foreground">{booking.date}</td>
                        <td className="px-3 py-2 text-muted-foreground">{booking.time}</td>
                        <td className="px-3 py-2">Rs. {booking.amount}</td>
                        <td className="px-3 py-2 capitalize">
                          <span className={`px-2 py-0.5 rounded-full text-[0.75rem] ${booking.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 capitalize">
                          <span className={`px-2 py-0.5 rounded-full text-[0.75rem] ${booking.payment === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
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
    </div>
  );
}
