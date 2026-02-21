import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { ArrowLeft, Calendar, CheckCircle2, MapPin, QrCode, User, XCircle } from "lucide-react";
import { approveFutsal, getFutsalById, rejectFutsal, type FutsalItem } from "../lib/api";
import { toast } from "sonner";

export function AdminFutsalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const futsalId = Number(id);
  const adminBasePath = location.pathname.startsWith("/admin") ? "/admin" : "/super-admin";

  const [futsal, setFutsal] = useState<FutsalItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function loadFutsal() {
      if (!Number.isFinite(futsalId)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await getFutsalById(futsalId);
        setFutsal(result);
      } catch {
        setFutsal(null);
        toast.error("Failed to load futsal details");
      } finally {
        setLoading(false);
      }
    }

    void loadFutsal();
  }, [futsalId]);

  const statusBadgeClass = useMemo(() => {
    if (!futsal) return "bg-muted text-muted-foreground border-border";
    if (futsal.approval_status === "approved") return "bg-primary/10 text-primary border-primary/20";
    if (futsal.approval_status === "pending") return "bg-amber-50 text-amber-900 border-amber-200/80";
    return "bg-destructive/10 text-destructive border-destructive/20";
  }, [futsal]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(`${adminBasePath}/futsals`);
  };

  const handleApproval = async (action: "approve" | "reject") => {
    if (!futsal) return;

    try {
      setActionLoading(true);
      if (action === "approve") {
        await approveFutsal(futsal.id);
      } else {
        await rejectFutsal(futsal.id);
      }

      setFutsal((prev) => prev ? { ...prev, approval_status: action === "approve" ? "approved" : "rejected" } : prev);
      toast.success(action === "approve" ? "Futsal approved" : "Futsal rejected");
    } catch {
      toast.error("Could not update futsal status");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 text-sm text-muted-foreground">Loading futsal details...</div>;
  }

  if (!futsal) {
    return (
      <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6">
        <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="mt-4 text-sm text-muted-foreground">Futsal not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
      <button type="button" onClick={handleBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <section className="rounded-2xl border border-border overflow-hidden shadow-sm" style={{ animation: "ui-page-enter 0.28s ease" }}>
        <div className="relative h-64 md:h-80">
          <img
            src={futsal.image || "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=1600&q=80"}
            alt={futsal.futsal_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/10" />
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <p className="text-xs uppercase tracking-[0.12em] text-white/80">Futsal Submission</p>
            <h1 className="text-2xl md:text-3xl mt-1">{futsal.futsal_name}</h1>
            <p className="text-sm text-white/90 inline-flex items-center gap-1.5 mt-2">
              <MapPin className="w-4 h-4 shrink-0" /> {futsal.location}
            </p>
          </div>
        </div>

        <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border p-4 bg-muted/20">
              <h3 className="text-sm font-semibold mb-2">Overview</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{futsal.description || "No description provided by owner."}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border p-4 bg-card">
                <h3 className="text-sm font-semibold mb-2">Owner Information</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="inline-flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {futsal.owner_name}</p>
                  <p>Owner ID: {futsal.owner}</p>
                  {futsal.latitude && futsal.longitude ? (
                    <p>Coordinates: {futsal.latitude}, {futsal.longitude}</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 bg-card">
                <h3 className="text-sm font-semibold mb-2">Submission Details</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Submitted: {futsal.created_at.slice(0, 10)}</p>
                  <p className="inline-flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5" /> eSewa QR: {futsal.esewa_qr_image ? "Configured" : "Not set"}</p>
                  <p className="inline-flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5" /> Fonepay QR: {futsal.fonepay_qr_image ? "Configured" : "Not set"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4 bg-card">
              <h3 className="text-sm font-semibold mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {(futsal.amenities?.length ? futsal.amenities : ["Not specified"]).map((item) => (
                  <span key={item} className="px-2.5 py-1 rounded-md border border-border text-xs font-medium bg-muted/40">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 h-fit lg:sticky lg:top-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Review Decision</p>
            <p className="text-sm font-semibold mb-3">Current status</p>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize mb-4 border ${statusBadgeClass}`}>
              {futsal.approval_status}
            </span>
            <div className="space-y-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleApproval("approve")}
                className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleApproval("reject")}
                className="w-full px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
