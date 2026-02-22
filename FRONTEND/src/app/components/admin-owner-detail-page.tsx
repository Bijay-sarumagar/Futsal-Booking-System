import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, Calendar, CheckCircle2, Eye, Mail, MapPin, Phone, XCircle } from "lucide-react";
import { approveFutsal, getOwnerVerificationSummary, rejectFutsal, setOwnerStatus, type OwnerVerificationSummary } from "../lib/api";
import { toast } from "sonner";

function toOwnerUiStatus(status: "active" | "inactive" | "suspended"): "approved" | "pending" | "rejected" {
  if (status === "active") return "approved";
  if (status === "suspended") return "rejected";
  return "pending";
}

function toOwnerApiStatus(status: "approved" | "rejected"): "active" | "suspended" {
  if (status === "approved") return "active";
  return "suspended";
}

export function AdminOwnerDetailPage() {
  const { ownerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ownerIdNum = Number(ownerId);
  const adminBasePath = location.pathname.startsWith("/admin") ? "/admin" : "/super-admin";

  const [ownerDetail, setOwnerDetail] = useState<OwnerVerificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownerActionLoading, setOwnerActionLoading] = useState(false);
  const [futsalActionLoadingId, setFutsalActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadOwnerDetail() {
      if (!Number.isFinite(ownerIdNum)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const detail = await getOwnerVerificationSummary(ownerIdNum);
        setOwnerDetail(detail);
      } catch {
        setOwnerDetail(null);
        toast.error("Could not load owner details");
      } finally {
        setLoading(false);
      }
    }

    void loadOwnerDetail();
  }, [ownerIdNum]);

  const ownerDisplayName = useMemo(() => {
    if (!ownerDetail) return "Owner";
    return `${ownerDetail.owner.first_name} ${ownerDetail.owner.last_name}`.trim() || ownerDetail.owner.username;
  }, [ownerDetail]);

  const ownerUiStatus = useMemo(() => {
    if (!ownerDetail) return "pending" as const;
    return toOwnerUiStatus(ownerDetail.owner.status);
  }, [ownerDetail]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(`${adminBasePath}/owners`);
  };

  const handleOwnerStatus = async (nextStatus: "approved" | "rejected") => {
    if (!ownerDetail) return;

    try {
      setOwnerActionLoading(true);
      await setOwnerStatus(ownerDetail.owner.id, toOwnerApiStatus(nextStatus));
      setOwnerDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          owner: {
            ...prev.owner,
            status: toOwnerApiStatus(nextStatus),
          },
        };
      });
      toast.success("Owner status updated");
    } catch {
      toast.error("Could not update owner status");
    } finally {
      setOwnerActionLoading(false);
    }
  };

  const handleFutsalDecision = async (futsalId: number, action: "approve" | "reject") => {
    try {
      setFutsalActionLoadingId(futsalId);
      if (action === "approve") {
        await approveFutsal(futsalId);
      } else {
        await rejectFutsal(futsalId);
      }

      setOwnerDetail((prev) => {
        if (!prev) return prev;
        const nextStatus: "approved" | "rejected" = action === "approve" ? "approved" : "rejected";
        const nextFutsals = prev.futsals.map((item) => (
          item.id === futsalId ? { ...item, approval_status: nextStatus } : item
        ));

        return {
          ...prev,
          futsals: nextFutsals,
          totals: {
            ...prev.totals,
            approved_count: nextFutsals.filter((item) => item.approval_status === "approved").length,
            pending_count: nextFutsals.filter((item) => item.approval_status === "pending").length,
            rejected_count: nextFutsals.filter((item) => item.approval_status === "rejected").length,
          },
        };
      });

      toast.success(action === "approve" ? "Futsal approved" : "Futsal rejected");
    } catch {
      toast.error("Could not update futsal status");
    } finally {
      setFutsalActionLoadingId(null);
    }
  };

  if (loading) {
    return <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 text-sm text-muted-foreground">Loading owner details...</div>;
  }

  if (!ownerDetail) {
    return (
      <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6">
        <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="mt-4 text-sm text-muted-foreground">Owner not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
      <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <section className="rounded-2xl border border-border overflow-hidden shadow-sm" style={{ animation: "ui-page-enter 0.28s ease" }}>
        <div className="bg-[linear-gradient(120deg,#0f8f68_0%,#0f7f5f_42%,#0f6f56_100%)] text-primary-foreground p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {ownerDetail.owner.profile_picture ? (
                <img src={ownerDetail.owner.profile_picture} alt={ownerDisplayName} className="w-16 h-16 rounded-full object-cover border border-primary-foreground/35" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-foreground/20 border border-primary-foreground/35 flex items-center justify-center text-lg font-semibold">
                  {ownerDisplayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.12em] text-primary-foreground/80">Owner Profile</p>
                <h1 className="text-2xl mt-1 truncate">{ownerDisplayName}</h1>
                <p className="text-sm text-primary-foreground/85 mt-1">@{ownerDetail.owner.username}</p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${ownerUiStatus === "approved" ? "bg-primary-foreground/15 border-primary-foreground/35" : ownerUiStatus === "pending" ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-red-100 text-red-900 border-red-300"}`}>
              {ownerUiStatus}
            </span>
          </div>
        </div>

        <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border p-3 bg-muted/30">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Futsals</p>
                <p className="text-lg font-semibold mt-1">{ownerDetail.totals.futsal_count}</p>
              </div>
              <div className="rounded-xl border border-primary/25 p-3 bg-primary/5">
                <p className="text-xs uppercase tracking-wide text-primary">Approved</p>
                <p className="text-lg font-semibold mt-1 text-primary">{ownerDetail.totals.approved_count}</p>
              </div>
              <div className="rounded-xl border border-amber-200 p-3 bg-amber-50">
                <p className="text-xs uppercase tracking-wide text-amber-900">Pending</p>
                <p className="text-lg font-semibold mt-1 text-amber-900">{ownerDetail.totals.pending_count}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 bg-card">
              <h3 className="text-sm font-semibold mb-2">Owner Information</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="inline-flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {ownerDetail.owner.email}</p>
                <p className="inline-flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {ownerDetail.owner.phone || "N/A"}</p>
                <p className="inline-flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Joined: {ownerDetail.owner.created_at.slice(0, 10)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-x-auto bg-card">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Futsal</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Location</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ownerDetail.futsals.map((futsal) => (
                    <tr key={futsal.id} className="border-t border-border hover:bg-muted/25">
                      <td className="px-3 py-2.5 font-medium">{futsal.futsal_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {futsal.location}</td>
                      <td className="px-3 py-2.5 capitalize">{futsal.approval_status}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-2">
                          <Link to={`${adminBasePath}/futsals/${futsal.id}`} className="px-2.5 py-1.5 rounded-md border border-border inline-flex items-center gap-1 hover:bg-muted">
                            <Eye className="w-3.5 h-3.5" /> View
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleFutsalDecision(futsal.id, "approve")}
                            disabled={futsalActionLoadingId === futsal.id}
                            className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleFutsalDecision(futsal.id, "reject")}
                            disabled={futsalActionLoadingId === futsal.id}
                            className="px-2.5 py-1.5 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {ownerDetail.futsals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-5 text-center text-muted-foreground">No futsals registered by this owner yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 h-fit lg:sticky lg:top-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Owner Decision</p>
            <p className="text-sm font-semibold mb-3">Set account status</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void handleOwnerStatus("approved")}
                disabled={ownerActionLoading}
                className="w-full px-3 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve Owner
              </button>
              <button
                type="button"
                onClick={() => void handleOwnerStatus("rejected")}
                disabled={ownerActionLoading}
                className="w-full px-3 py-2.5 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject Owner
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
