import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock, MapPin, Swords, UserRound, XCircle, Gauge, Flame, Rocket, Circle, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";
import { closeOpponentPost, createOpponentPost, getOpponentPosts, joinOpponentPost, leaveOpponentPost, OpponentPostItem } from "../lib/api";
import { useAuth } from "../auth/auth-context";

const SKILL_LABEL: Record<OpponentPostItem["skill_level"], string> = {
  casual: "Casual",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const SKILL_META = {
  casual: { icon: Circle, className: "bg-slate-100 text-slate-700" },
  intermediate: { icon: Gauge, className: "bg-blue-100 text-blue-700" },
  advanced: { icon: Rocket, className: "bg-violet-100 text-violet-700" },
} as const;

const STATUS_META = {
  open: { icon: Flame, className: "bg-emerald-100 text-emerald-700" },
  matched: { icon: CheckCircle2, className: "bg-blue-100 text-blue-700" },
  closed: { icon: Lock, className: "bg-gray-200 text-gray-700" },
} as const;

const STATUS_LABEL = {
  open: "Open",
  matched: "Matched",
  closed: "Closed",
} as const;

export function PlayerOpponentFinder() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<OpponentPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joiningPostId, setJoiningPostId] = useState<number | null>(null);
  const [leavingPostId, setLeavingPostId] = useState<number | null>(null);
  const [closingPostId, setClosingPostId] = useState<number | null>(null);
  const [cancelRequestTarget, setCancelRequestTarget] = useState<number | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<{
    variant: "success" | "error" | "battle";
    title: string;
    message: string;
    primaryLabel: string;
    onPrimary: () => void;
  } | null>(null);
  const [form, setForm] = useState({
    location: "",
    preferred_date: new Date().toISOString().slice(0, 10),
    preferred_start_time: "18:00",
    preferred_end_time: "19:00",
    skill_level: "casual" as OpponentPostItem["skill_level"],
    notes: "",
  });

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const availableNowPosts = useMemo(
    () => posts.filter((post) => post.status === "open"),
    [posts],
  );

  const historyPosts = useMemo(
    () => posts.filter((post) => post.status !== "open" && (post.user === user?.id || post.matched_with === user?.id)),
    [posts, user?.id],
  );

  const formatRelativeTime = (value: string) => {
    const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatTimeLabel = (value: string) => {
    const [hRaw, mRaw] = value.split(":");
    const hour24 = Number(hRaw);
    const minute = Number(mRaw);
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  async function loadPosts() {
    try {
      setLoading(true);
      const data = await getOpponentPosts();
      setPosts(data);
    } catch {
      toast.error("Failed to load opponent posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  async function handleCreatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.location.trim()) {
      toast.error("Please enter a location");
      return;
    }

    try {
      setSubmitting(true);
      const created = await createOpponentPost({
        location: form.location.trim(),
        preferred_date: form.preferred_date,
        preferred_start_time: form.preferred_start_time,
        preferred_end_time: form.preferred_end_time,
        skill_level: form.skill_level,
        notes: form.notes.trim(),
      });

      setPosts((prev) => [created, ...prev]);
      toast.success("Opponent request posted. Other players were notified.");
      setForm((prev) => ({ ...prev, location: "", notes: "" }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post request");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(postId: number) {
    try {
      setJoiningPostId(postId);
      await joinOpponentPost(postId);
      await loadPosts();
      setFeedbackDialog({
        variant: "battle",
        title: "Opponent Matched",
        message: "You are now matched for this game. Check notifications for details.",
        primaryLabel: "Great",
        onPrimary: () => setFeedbackDialog(null),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to join post");
    } finally {
      setJoiningPostId(null);
    }
  }

  async function handleLeaveMatch(postId: number) {
    try {
      setLeavingPostId(postId);
      await leaveOpponentPost(postId);
      await loadPosts();
      setFeedbackDialog({
        variant: "success",
        title: "Match Cancelled",
        message: "You left the match. The opponent request is open again for the owner.",
        primaryLabel: "Done",
        onPrimary: () => setFeedbackDialog(null),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to cancel match");
    } finally {
      setLeavingPostId(null);
    }
  }

  async function handleClose(postId: number) {
    try {
      setClosingPostId(postId);
      await closeOpponentPost(postId);
      await loadPosts();
      setFeedbackDialog({
        variant: "success",
        title: "Request Cancelled",
        message: "Your opponent request has been cancelled successfully.",
        primaryLabel: "Done",
        onPrimary: () => setFeedbackDialog(null),
      });
    } catch (error) {
      setFeedbackDialog({
        variant: "error",
        title: "Unable to Cancel Request",
        message: error instanceof Error ? error.message : "Unable to close post",
        primaryLabel: "Okay",
        onPrimary: () => setFeedbackDialog(null),
      });
    } finally {
      setClosingPostId(null);
    }
  }

  function openCancelRequestDialog(postId: number) {
    setCancelRequestTarget(postId);
  }

  async function confirmCancelRequest() {
    if (cancelRequestTarget === null) return;
    const targetId = cancelRequestTarget;
    setCancelRequestTarget(null);
    await handleClose(targetId);
  }

  return (
    <div className="w-full py-6 md:py-8">
      <h1 className="mb-1">Find Opponents</h1>
      <p className="text-muted-foreground mb-7">Post your preferred time and location, then match with other players.</p>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5 items-start">
        <form onSubmit={handleCreatePost} className="bg-white border border-border rounded-2xl p-5 md:p-6 space-y-4">
          <h3 className="text-lg">Post Request</h3>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="opponent-location">Location</label>
            <input
              id="opponent-location"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="e.g. Baneshwor Futsal"
              className="w-full rounded-lg border border-border px-3 py-2.5"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="opponent-date">Date</label>
            <input
              id="opponent-date"
              type="date"
              min={today}
              value={form.preferred_date}
              onChange={(e) => setForm((prev) => ({ ...prev, preferred_date: e.target.value }))}
              className="w-full rounded-lg border border-border px-3 py-2.5"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="opponent-start">From</label>
              <input
                id="opponent-start"
                type="time"
                value={form.preferred_start_time}
                onChange={(e) => setForm((prev) => ({ ...prev, preferred_start_time: e.target.value }))}
                className="w-full rounded-lg border border-border px-3 py-2.5 min-h-11 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="opponent-end">To</label>
              <input
                id="opponent-end"
                type="time"
                value={form.preferred_end_time}
                onChange={(e) => setForm((prev) => ({ ...prev, preferred_end_time: e.target.value }))}
                className="w-full rounded-lg border border-border px-3 py-2.5 min-h-11 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="opponent-skill">Skill</label>
            <select
              id="opponent-skill"
              value={form.skill_level}
              onChange={(e) => setForm((prev) => ({ ...prev, skill_level: e.target.value as OpponentPostItem["skill_level"] }))}
              className="w-full rounded-lg border border-border px-3 py-2.5"
            >
              <option value="casual">Casual</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="opponent-notes">Notes</label>
            <textarea
              id="opponent-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Any extra details"
              className="w-full rounded-lg border border-border px-3 py-2.5 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Posting..." : "Post Request"}
          </button>
        </form>

        <div className="relative space-y-4 xl:pt-0">
          <div className="flex justify-start sm:justify-end xl:absolute xl:-top-14 xl:right-0 xl:z-10">
            <button
              type="button"
              onClick={() => setShowHistory((prev) => !prev)}
              className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted"
            >
              {showHistory ? "Hide History" : "View History"}
            </button>
          </div>

          {loading ? <p className="text-muted-foreground">Loading posts...</p> : null}
          {!loading && availableNowPosts.length === 0 ? (
            <div className="bg-white border border-border rounded-2xl p-8 text-center text-muted-foreground">
              No available requests right now.
            </div>
          ) : null}

          {availableNowPosts.map((post) => {
            const isMine = user?.id === post.user;
            const amMatcher = user?.id === post.matched_with;
            const canJoin = !isMine && post.status === "open";
            const canLeaveMatch = amMatcher && post.status === "matched";
            const canClose = isMine && post.status !== "closed";

            return (
              <div key={post.id} className="bg-white border border-border rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      {post.user_profile_picture ? (
                        <img
                          src={post.user_profile_picture}
                          alt={post.user_name}
                          className="w-11 h-11 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <span className="w-11 h-11 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-sm">
                          {post.user_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div>
                        <h3 className="text-lg leading-tight">{post.user_name}</h3>
                        <p className="text-xs uppercase tracking-[0.04em] text-muted-foreground">Posted {formatRelativeTime(post.created_at)}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${SKILL_META[post.skill_level].className}`}>
                        {(() => {
                          const SkillIcon = SKILL_META[post.skill_level].icon;
                          return <SkillIcon className="w-3.5 h-3.5" />;
                        })()}
                        {SKILL_LABEL[post.skill_level]}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs ${STATUS_META[post.status].className}`}>
                        {(() => {
                          const StatusIcon = STATUS_META[post.status].icon;
                          return <StatusIcon className="w-3.5 h-3.5" />;
                        })()}
                        {STATUS_LABEL[post.status]}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> {post.location}</span>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap"><Clock className="w-4 h-4" /> {post.preferred_date} | {formatTimeLabel(post.preferred_start_time)} - {formatTimeLabel(post.preferred_end_time)}</span>
                    </div>

                    {post.notes ? <p className="text-sm">{post.notes}</p> : null}
                    {post.status === "matched" && post.matched_with_name ? (
                      <p className="text-sm text-primary inline-flex items-center gap-1"><UserRound className="w-4 h-4" /> Matched with {post.matched_with_name}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canJoin ? (
                      <button
                        type="button"
                        onClick={() => handleJoin(post.id)}
                        disabled={joiningPostId === post.id}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-60"
                      >
                        <Swords className="w-4 h-4" />
                        {joiningPostId === post.id ? "Joining..." : "Join"}
                      </button>
                    ) : null}
                    {canLeaveMatch ? (
                      <button
                        type="button"
                        onClick={() => handleLeaveMatch(post.id)}
                        disabled={leavingPostId === post.id}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 text-sm disabled:opacity-60"
                      >
                        <XCircle className="w-4 h-4" />
                        {leavingPostId === post.id ? "Cancelling..." : "Cancel Match"}
                      </button>
                    ) : null}
                    {canClose ? (
                      <button
                        type="button"
                        onClick={() => openCancelRequestDialog(post.id)}
                        disabled={closingPostId === post.id}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm disabled:opacity-60"
                      >
                        <XCircle className="w-4 h-4" />
                        {closingPostId === post.id ? "Cancelling..." : "Cancel Request"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {showHistory ? (
            <div className="space-y-3 pt-2">
              <h3 className="text-base">Previous History</h3>
              {historyPosts.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  No previous matched or closed finds in your history yet.
                </div>
              ) : null}
              {historyPosts.map((post) => (
                <div key={post.id} className="rounded-xl border border-border p-4 bg-white">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {post.user_profile_picture ? (
                      <img
                        src={post.user_profile_picture}
                        alt={post.user_name}
                        className="w-8 h-8 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-xs">
                        {post.user_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="font-medium">{post.user_name}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${STATUS_META[post.status].className}`}>
                      {STATUS_LABEL[post.status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{post.location} | {post.preferred_date} | {formatTimeLabel(post.preferred_start_time)} - {formatTimeLabel(post.preferred_end_time)}</p>
                  {post.matched_with_name ? (
                    <p className="text-sm text-primary mt-1">Matched with {post.matched_with_name}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {cancelRequestTarget !== null ? (
        <div className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <h3>Cancel Request</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Are you sure you want to cancel finding an opponent?</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelRequestTarget(null)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => void confirmCancelRequest()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90"
              >
                Cancel Request
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedbackDialog ? (
        <div className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center gap-2 mb-2">
              {feedbackDialog.variant === "battle" ? <Swords className="w-5 h-5 text-primary" /> : null}
              {feedbackDialog.variant === "success" ? <CheckCircle2 className="w-5 h-5 text-primary" /> : null}
              {feedbackDialog.variant === "error" ? <XCircle className="w-5 h-5 text-destructive" /> : null}
              <h3>{feedbackDialog.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">{feedbackDialog.message}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={feedbackDialog.onPrimary}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${feedbackDialog.variant === "error" ? "bg-destructive text-destructive-foreground hover:opacity-90" : "bg-primary text-primary-foreground hover:opacity-90"}`}
              >
                {feedbackDialog.primaryLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
