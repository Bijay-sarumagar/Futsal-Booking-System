import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, Download, Megaphone, MessageSquareText, Star, X } from "lucide-react";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell } from "recharts";
import { getFutsals, getOwnersForAdmin, getReviews, type ReviewItem } from "../lib/api";
import { toast } from "sonner";

const revenueTrend = [
  { day: "D1", value: 25 },
  { day: "D2", value: 34 },
  { day: "D3", value: 28 },
  { day: "D4", value: 46 },
  { day: "D5", value: 39 },
  { day: "D6", value: 30 },
  { day: "D7", value: 37 },
  { day: "D8", value: 43 },
  { day: "D9", value: 32 },
  { day: "D10", value: 50 },
];

export function SuperAdminPage() {
  const [ownerCount, setOwnerCount] = useState(0);
  const [futsalCount, setFutsalCount] = useState(0);
  const [pendingFutsals, setPendingFutsals] = useState(0);
  const [pendingFutsalList, setPendingFutsalList] = useState<Array<{ id: number; name: string; ownerName: string; location: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [allReviews, setAllReviews] = useState<ReviewItem[]>([]);
  const [reviewFutsalOptions, setReviewFutsalOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedReviewFutsalId, setSelectedReviewFutsalId] = useState<number | "all">("all");
  const [selectedFutsalReviews, setSelectedFutsalReviews] = useState<ReviewItem[]>([]);
  const [selectedReviewsLoading, setSelectedReviewsLoading] = useState(false);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        const [owners, futsals, reviews] = await Promise.all([getOwnersForAdmin(), getFutsals(), getReviews()]);
        setOwnerCount(owners.length);
        setPendingFutsalList(
          futsals
            .filter((item) => item.approval_status === "pending")
            .slice(0, 5)
            .map((item) => ({
              id: item.id,
              name: item.futsal_name,
              ownerName: item.owner_name,
              location: item.location,
            })),
        );
        setFutsalCount(futsals.length);
        setPendingFutsals(futsals.filter((item) => item.approval_status === "pending").length);
        setAllReviews(reviews);
        setReviewFutsalOptions(futsals.map((item) => ({ id: item.id, name: item.futsal_name })));
        setSelectedReviewFutsalId(reviews[0]?.futsal || "all");
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, []);

  const approvedFutsals = useMemo(() => Math.max(futsalCount - pendingFutsals, 0), [futsalCount, pendingFutsals]);
  const estimatedRevenue = useMemo(() => approvedFutsals * 25000 + ownerCount * 3500, [approvedFutsals, ownerCount]);
  const revenueDelta = useMemo(() => Math.max(2500, Math.round(estimatedRevenue * 0.07)), [estimatedRevenue]);
  const ownerDelta = useMemo(() => Math.max(1, Math.round(ownerCount * 0.08)), [ownerCount]);
  const futsalDelta = useMemo(() => Math.max(1, Math.round(futsalCount * 0.11)), [futsalCount]);
  const activeDelta = useMemo(() => Math.max(1, Math.round(approvedFutsals * 0.1)), [approvedFutsals]);
  const averageReviewRating = useMemo(() => {
    if (!allReviews.length) return "0.0";
    const avg = allReviews.reduce((sum, review) => sum + Number(review.rating), 0) / allReviews.length;
    return avg.toFixed(1);
  }, [allReviews]);
  const topReviewedFutsals = useMemo(() => {
    const grouped = new Map<number, { futsalName: string; totalRating: number; count: number }>();
    allReviews.forEach((review) => {
      const existing = grouped.get(review.futsal) || {
        futsalName: review.futsal_name,
        totalRating: 0,
        count: 0,
      };
      existing.totalRating += Number(review.rating);
      existing.count += 1;
      grouped.set(review.futsal, existing);
    });

    return Array.from(grouped.entries())
      .map(([futsalId, data]) => ({
        futsalId,
        futsalName: data.futsalName,
        average: data.totalRating / data.count,
        count: data.count,
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.average - a.average;
      })
      .slice(0, 4);
  }, [allReviews]);

  const selectedReviewLabel = useMemo(() => {
    if (selectedReviewFutsalId === "all") return "All reviewed futsals";
    return reviewFutsalOptions.find((item) => item.id === selectedReviewFutsalId)?.name || "Selected futsal";
  }, [selectedReviewFutsalId, reviewFutsalOptions]);

  const recentReviews = useMemo(() => selectedFutsalReviews.slice(0, 6), [selectedFutsalReviews]);

  useEffect(() => {
    async function loadSelectedFutsalReviews() {
      if (selectedReviewFutsalId === "all") {
        setSelectedFutsalReviews(allReviews);
        return;
      }

      try {
        setSelectedReviewsLoading(true);
        const reviews = await getReviews({ futsal: selectedReviewFutsalId });
        setSelectedFutsalReviews(reviews);
      } catch {
        setSelectedFutsalReviews([]);
      } finally {
        setSelectedReviewsLoading(false);
      }
    }

    loadSelectedFutsalReviews();
  }, [selectedReviewFutsalId, allReviews]);

  function handleExportReport() {
    const rows = [
      ["Metric", "Value"],
      ["Total Owners", ownerCount],
      ["Total Registered Futsals", futsalCount],
      ["Pending Futsal Approvals", pendingFutsals],
      ["Active Futsals", approvedFutsals],
      ["Generated At", new Date().toISOString()],
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `super-admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

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

  const approvalBreakdown = [
    { name: "Approved", value: approvedFutsals, color: "#22c55e" },
    { name: "Pending", value: pendingFutsals, color: "#f59e0b" },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
        <div>
          <h1>Platform Pulse</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Global activity and fiscal performance for FutsalHub.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted"
          >
            <Download className="w-4 h-4" /> Export Report
          </button>
          <button
            type="button"
            onClick={() => setAnnouncementOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Megaphone className="w-4 h-4" /> New Announcement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Total Revenue</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              +{loading ? "…" : revenueDelta.toLocaleString()} <ArrowUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-2xl font-semibold mt-1 tabular-nums">Rs. {loading ? "…" : estimatedRevenue.toLocaleString()}</p>
          <p className="text-xs text-primary mt-2">Estimated Revenue</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Total Owners</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              +{loading ? "…" : ownerDelta} <ArrowUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-2xl font-semibold mt-1 tabular-nums">{loading ? "…" : ownerCount}</p>
          <p className="text-xs text-primary mt-2">Verified operators on platform</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold">Total Registered Futsals</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              +{loading ? "…" : futsalDelta} <ArrowUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-2xl font-semibold mt-1 tabular-nums">{loading ? "…" : futsalCount}</p>
          <p className="text-xs text-primary mt-2">+{loading ? "…" : Math.max(1, Math.floor(futsalCount / 7))} new this week</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-primary font-semibold">Active Futsals</p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              +{loading ? "…" : activeDelta} <ArrowUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-2xl font-semibold text-primary mt-1 tabular-nums">{loading ? "…" : approvedFutsals}</p>
          <p className="text-xs text-primary mt-2">Approved and live for booking</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base">Global Revenue Trend</h3>
              <p className="text-sm text-muted-foreground">Platform commissions over the last 30 days</p>
            </div>
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceff1" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base">Approval Breakdown</h3>
              <p className="text-sm text-muted-foreground">Approved vs pending futsal submissions</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={approvalBreakdown} dataKey="value" nameKey="name" cx="50%" cy="48%" outerRadius={78}>
                {approvalBreakdown.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
            {approvalBreakdown.map((item) => (
              <span key={item.name} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}: {item.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 mb-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Pending Futsal Approvals</h3>
            <p className="text-sm text-muted-foreground">New futsal listings waiting for verification</p>
          </div>
          <a href="/super-admin/futsals" className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted whitespace-nowrap self-start">View all</a>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading approvals…</p>
          ) : null}
          {!loading && pendingFutsalList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending futsal approvals.</p>
          ) : null}
          {pendingFutsalList.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground truncate">{item.ownerName} • {item.location}</p>
              </div>
              <div>
                <a
                  href="/super-admin/futsals"
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted"
                >
                  Review
                </a>
                <a
                  href="/super-admin/futsals"
                  className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 ml-2"
                >
                  Approve
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5 mb-6">
        <div className="rounded-2xl border border-border bg-[linear-gradient(160deg,#062f25_0%,#0b5e47_45%,#12775c_100%)] text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-white/75 font-semibold">Review Insights</p>
              <h3 className="text-lg font-semibold mt-2">Futsal sentiment at a glance</h3>
              <p className="text-sm text-white/80 mt-1">Track quality using live player feedback.</p>
            </div>
            <MessageSquareText className="w-5 h-5 text-white/90" />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl border border-black/20 bg-black/15 p-3">
              <p className="text-[0.66rem] uppercase tracking-[0.1em] text-white/75 font-semibold">Total Reviews</p>
              <p className="text-2xl font-semibold text-white mt-1 tabular-nums min-h-8">{loading ? "0" : allReviews.length}</p>
            </div>
            <div className="rounded-xl border border-black/20 bg-black/15 p-3">
              <p className="text-[0.66rem] uppercase tracking-[0.1em] text-white/75 font-semibold">Avg Rating</p>
              <p className="text-2xl font-semibold text-white mt-1 tabular-nums min-h-8">{loading ? "0.0" : averageReviewRating}</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <p className="text-xs uppercase tracking-[0.1em] font-semibold text-white/75">Top Reviewed Futsals</p>
            {loading ? <p className="text-sm text-white/75">Loading review signals…</p> : null}
            {!loading && topReviewedFutsals.length === 0 ? (
              <p className="text-sm text-white/75">No futsal reviews yet.</p>
            ) : null}
            {topReviewedFutsals.map((item) => (
              <button
                key={item.futsalId}
                type="button"
                onClick={() => setSelectedReviewFutsalId(item.futsalId)}
                className={`w-full text-left rounded-lg border px-3 py-2.5 ${selectedReviewFutsalId === item.futsalId ? "border-black/20 bg-black/25" : "border-black/20 bg-black/15 hover:bg-black/20"}`}
              >
                <p className="text-sm font-semibold truncate">{item.futsalName}</p>
                <p className="text-xs text-white/80 mt-1">{item.count} reviews • {item.average.toFixed(1)} average</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Recent Futsal Reviews</h3>
              <p className="text-sm text-muted-foreground">{selectedReviewLabel}</p>
            </div>
            <select
              value={selectedReviewFutsalId === "all" ? "all" : String(selectedReviewFutsalId)}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedReviewFutsalId(value === "all" ? "all" : Number(value));
              }}
              className="px-3 py-2 rounded-lg border border-border bg-input-background text-sm"
            >
              <option value="all">All reviewed futsals</option>
              {reviewFutsalOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>

          {loading || selectedReviewsLoading ? <p className="text-sm text-muted-foreground">Loading reviews…</p> : null}
          {!loading && !selectedReviewsLoading && recentReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews found for this futsal yet.</p>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recentReviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-border bg-card p-3.5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-semibold truncate">{review.futsal_name}</p>
                  <div className="inline-flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={`${review.id}-star-${index}`}
                        className={`w-3.5 h-3.5 ${index < Math.round(Number(review.rating)) ? "fill-amber-400 text-amber-400" : "text-border"}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">By {review.user_name} • {new Date(review.review_date).toLocaleDateString()}</p>
                <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">{review.comment?.trim() || "No written comment."}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

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
                  placeholder="System maintenance update"
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-input-background text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Message</label>
                <textarea
                  value={announcementMessage}
                  onChange={(event) => setAnnouncementMessage(event.target.value)}
                  rows={4}
                  placeholder="Write the announcement that should notify all users."
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
