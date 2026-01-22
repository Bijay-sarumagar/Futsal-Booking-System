import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft, Search, Check, X, Phone, Mail, Eye, Trash2 } from "lucide-react";
import { deleteOwnerByAdmin, getOwnersForAdmin, setOwnerStatus } from "../lib/api";
import { toast } from "sonner";

interface Owner {
  id: number;
  username: string;
  name: string;
  profilePicture: string | null;
  email: string;
  phone: string;
  futsalName: string;
  district: string;
  status: "approved" | "pending" | "rejected";
  appliedDate: string;
}

function mapOwnerStatus(status: "active" | "inactive" | "suspended"): Owner["status"] {
  if (status === "active") return "approved";
  if (status === "suspended") return "rejected";
  return "pending";
}

function ownerStatusToApi(status: Owner["status"]): "active" | "inactive" | "suspended" {
  if (status === "approved") return "active";
  if (status === "rejected") return "suspended";
  return "inactive";
}

function ownerStatusLabel(status: Owner["status"]): string {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  return "Rejected";
}

export function AdminOwners() {
  const navigate = useNavigate();
  const location = useLocation();
  const [ownerList, setOwnerList] = useState<Owner[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionTarget, setActionTarget] = useState<{ id: number; action: "approved" | "rejected" } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const adminBasePath = location.pathname.startsWith("/admin") ? "/admin" : "/super-admin";

  const loadOwners = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const owners = await getOwnersForAdmin();
      const mapped: Owner[] = owners.map((owner) => ({
        id: owner.id,
        username: owner.username,
        name: `${owner.first_name} ${owner.last_name}`.trim() || owner.username,
        profilePicture: owner.profile_picture || null,
        email: owner.email,
        phone: owner.phone || "N/A",
        futsalName: "Owner account",
        district: "N/A",
        status: mapOwnerStatus(owner.status),
        appliedDate: owner.created_at.slice(0, 10),
      }));
      setOwnerList(mapped);
    } catch {
      setOwnerList([]);
      setLoadError("Owners could not be loaded right now. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOwners();
  }, []);

  const filtered = ownerList
    .filter((o) => statusFilter === "all" || o.status === statusFilter)
    .filter((o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.futsalName.toLowerCase().includes(search.toLowerCase()) ||
      o.username.toLowerCase().includes(search.toLowerCase())
    );

  const handleAction = async (id: number, action: "approved" | "rejected") => {
    try {
      await setOwnerStatus(id, ownerStatusToApi(action));
      setOwnerList((prev) => prev.map((o) => (o.id === id ? { ...o, status: action } : o)));
      toast.success(action === "approved" ? "Owner approved successfully" : "Owner rejected");
    } catch {
      toast.error("Failed to update owner status");
    }
  };

  const openOwnerView = (ownerId: number) => {
    navigate(`${adminBasePath}/owners/${ownerId}`);
  };

  const handleDeleteOwner = async (owner: Owner) => {
    try {
      setDeleteLoading(true);
      await deleteOwnerByAdmin(owner.id);
      setOwnerList((prev) => prev.filter((item) => item.id !== owner.id));
      toast.success("Owner deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete owner");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
      <h1 className="mb-1">Manage Futsal Owners</h1>
      <p className="text-muted-foreground mb-6 text-sm md:text-base">Approve, review, and manage futsal owner registrations</p>

      {loadError ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center justify-between gap-3">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadOwners()}
            className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-medium hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="w-full sm:flex-1 sm:max-w-2xl relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search owners or futsals..."
            className="w-full pl-10 pr-4 py-2.5 min-h-11 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:mr-4 md:mr-6">
          {["all", "approved", "pending", "rejected"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 min-h-10 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">Loading owners…</div>
        ) : null}
        {filtered.map((o) => (
          <div key={o.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-center">
              <div className="flex items-start gap-4 min-w-0">
                {o.profilePicture ? (
                  <img
                    src={o.profilePicture}
                    alt={o.name}
                    className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center text-base font-semibold border border-border shrink-0">
                    {o.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate">{o.name}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        o.status === "approved"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : o.status === "pending"
                            ? "bg-amber-50 text-amber-900 border-amber-200/80"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}
                    >
                      {ownerStatusLabel(o.status)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">@{o.username}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{o.futsalName}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Phone className="w-3.5 h-3.5 shrink-0" /> {o.phone}
                    </span>
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" /> {o.email}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Applied: {o.appliedDate}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end md:mr-3">
                <button
                  type="button"
                  onClick={() => openOwnerView(o.id)}
                  className="px-2.5 py-1.5 min-h-9 border border-border rounded-lg text-sm font-medium hover:bg-muted inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(o)}
                  className="px-2.5 py-1.5 min-h-9 border border-destructive/30 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                {o.status !== "approved" ? (
                  <button
                    type="button"
                    onClick={() => setActionTarget({ id: o.id, action: "approved" })}
                    className="px-2.5 py-1.5 min-h-9 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                ) : null}
                {o.status !== "rejected" ? (
                  <button
                    type="button"
                    onClick={() => setActionTarget({ id: o.id, action: "rejected" })}
                    className="px-2.5 py-1.5 min-h-9 border border-destructive/30 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">No owners found.</div>
        ) : null}
      </div>

      {actionTarget ? (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6 border border-border shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <button type="button" onClick={() => setActionTarget(null)} className="p-1 rounded hover:bg-muted" aria-label="Back">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                {actionTarget.action === "approved" ? "Approve Owner" : "Reject Owner"}
              </h3>
              <button type="button" onClick={() => setActionTarget(null)} className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {actionTarget.action === "approved"
                ? "This will mark the owner as approved and active in the database."
                : "This will reject the owner verification and suspend owner access in the database."}
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionTarget(null)}
                className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleAction(actionTarget.id, actionTarget.action);
                  setActionTarget(null);
                }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  actionTarget.action === "approved" ? "bg-primary hover:opacity-90" : "bg-destructive hover:opacity-90"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6 border border-border shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="p-1 rounded hover:bg-muted" aria-label="Back">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                Delete Owner Account
              </h3>
              <button type="button" onClick={() => setDeleteTarget(null)} className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              This will permanently delete owner <span className="font-semibold text-foreground">{deleteTarget.name}</span> and related records.
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => handleDeleteOwner(deleteTarget)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-destructive-foreground bg-destructive hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {deleteLoading ? "Deleting…" : "Delete Owner"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
