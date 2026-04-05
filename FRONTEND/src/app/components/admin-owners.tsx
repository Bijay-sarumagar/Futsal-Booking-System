import { useEffect, useState } from "react";
import { Search, Check, X, Phone, Mail, Eye, ShieldCheck, Building2, MapPin, Calendar, Loader2, Trash2, User } from "lucide-react";
import { approveFutsal, deleteOwnerByAdmin, getOwnerVerificationSummary, getOwnersForAdmin, rejectFutsal, setOwnerStatus, type OwnerVerificationSummary } from "../lib/api";
import { toast } from "sonner";

interface Owner {
  id: number;
  username: string;
  name: string;
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

export function AdminOwners() {
  const [ownerList, setOwnerList] = useState<Owner[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<{ id: number; action: "approved" | "rejected" } | null>(null);
  const [ownerDetail, setOwnerDetail] = useState<OwnerVerificationSummary | null>(null);
  const [ownerDetailLoading, setOwnerDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedFutsalFromOwner, setSelectedFutsalFromOwner] = useState<OwnerVerificationSummary["futsals"][number] | null>(null);
  const [futsalDecisionLoading, setFutsalDecisionLoading] = useState(false);

  useEffect(() => {
    async function loadOwners() {
      try {
        setLoading(true);
        const owners = await getOwnersForAdmin();
        const mapped: Owner[] = owners.map((owner) => ({
          id: owner.id,
          username: owner.username,
          name: `${owner.first_name} ${owner.last_name}`.trim() || owner.username,
          email: owner.email,
          phone: owner.phone || "N/A",
          futsalName: "Owner account",
          district: "N/A",
          status: mapOwnerStatus(owner.status),
          appliedDate: owner.created_at.slice(0, 10),
        }));
        setOwnerList(mapped);
      } catch {
        toast.error("Failed to load owners");
      } finally {
        setLoading(false);
      }
    }

    loadOwners();
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

  const openOwnerView = async (ownerId: number) => {
    try {
      setOwnerDetailLoading(true);
      const details = await getOwnerVerificationSummary(ownerId);
      setOwnerDetail(details);
    } catch {
      toast.error("Failed to load owner verification details");
    } finally {
      setOwnerDetailLoading(false);
    }
  };

  const handleDeleteOwner = async (owner: Owner) => {
    try {
      setDeleteLoading(true);
      await deleteOwnerByAdmin(owner.id);
      setOwnerList((prev) => prev.filter((item) => item.id !== owner.id));
      if (ownerDetail?.owner.id === owner.id) {
        setOwnerDetail(null);
      }
      toast.success("Owner deleted successfully");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete owner");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOwnerFutsalDecision = async (futsalId: number, action: "approve" | "reject") => {
    try {
      setFutsalDecisionLoading(true);
      if (action === "approve") {
        await approveFutsal(futsalId);
      } else {
        await rejectFutsal(futsalId);
      }

      setOwnerDetail((prev) => {
        if (!prev) return prev;
        const nextStatus = action === "approve" ? "approved" : "rejected";
        const nextFutsals = prev.futsals.map((item) =>
          item.id === futsalId ? { ...item, approval_status: nextStatus } : item,
        );

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

      setSelectedFutsalFromOwner((prev) => {
        if (!prev || prev.id !== futsalId) return prev;
        return { ...prev, approval_status: action === "approve" ? "approved" : "rejected" };
      });

      toast.success(action === "approve" ? "Futsal approved" : "Futsal rejected");
    } catch {
      toast.error("Failed to update futsal status");
    } finally {
      setFutsalDecisionLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="mb-1">Manage Futsal Owners</h1>
      <p className="text-muted-foreground mb-6">Approve, review, and manage futsal owner registrations</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search owners or futsals..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input-background" />
        </div>
        <div className="flex gap-2">
          {["all", "approved", "pending", "rejected"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-[0.8125rem] capitalize ${statusFilter === s ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? <p className="text-muted-foreground">Loading owners...</p> : null}
        {filtered.map((o) => (
          <div key={o.id} className="bg-white border border-border rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[1rem] shrink-0" style={{ fontWeight: 600 }}>
                  {o.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3>{o.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[0.75rem] ${
                      o.status === "approved" ? "bg-emerald-100 text-emerald-700" : o.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    }`}>{o.status}</span>
                  </div>
                  <p className="text-[0.75rem] text-muted-foreground mt-1">@{o.username}</p>
                  <p style={{ fontWeight: 500 }} className="text-[0.875rem] mt-0.5">{o.futsalName}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-[0.8125rem] text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {o.phone}</span>
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {o.email}</span>
                  </div>
                  <p className="text-[0.75rem] text-muted-foreground mt-1">Applied: {o.appliedDate}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openOwnerView(o.id)} className="px-3 py-1.5 border border-border rounded-lg text-[0.8125rem] hover:bg-muted flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={() => setDeleteTarget(o)} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-[0.8125rem] hover:bg-red-50 flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
                {o.status === "pending" && (
                  <>
                    <button onClick={() => setActionTarget({ id: o.id, action: "approved" })} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[0.8125rem] hover:bg-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => setActionTarget({ id: o.id, action: "rejected" })} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-[0.8125rem] hover:bg-red-50 flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 ? (
          <div className="bg-white border border-border rounded-xl p-5 text-muted-foreground text-[0.875rem]">
            No owners found.
          </div>
        ) : null}
      </div>

      {actionTarget ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3>{actionTarget.action === "approved" ? "Approve Owner" : "Reject Owner"}</h3>
              <button onClick={() => setActionTarget(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[0.875rem] text-muted-foreground mb-6">
              {actionTarget.action === "approved"
                ? "This will mark the owner as approved and active in the database."
                : "This will reject the owner verification and suspend owner access in the database."}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActionTarget(null)} className="px-4 py-2 border border-border rounded-lg text-[0.875rem] hover:bg-muted">
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleAction(actionTarget.id, actionTarget.action);
                  setActionTarget(null);
                }}
                className={`px-4 py-2 rounded-lg text-[0.875rem] text-white ${actionTarget.action === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {ownerDetail || ownerDetailLoading ? (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 text-white p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.75rem] uppercase tracking-[0.12em] text-emerald-100">Owner Verification Profile</p>
                  <h2 className="text-[1.5rem] mt-1" style={{ fontWeight: 700 }}>{ownerDetail?.owner.first_name} {ownerDetail?.owner.last_name}</h2>
                  <p className="text-emerald-100 text-[0.875rem] mt-1">@{ownerDetail?.owner.username}</p>
                </div>
                <button onClick={() => setOwnerDetail(null)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {ownerDetailLoading ? (
                <div className="py-8 flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading verification details...
                </div>
              ) : ownerDetail ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                    <div className="rounded-xl border border-border p-3 bg-muted/30">
                      <p className="text-[0.75rem] text-muted-foreground">Total Futsals</p>
                      <p className="text-[1.125rem]" style={{ fontWeight: 700 }}>{ownerDetail.totals.futsal_count}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 p-3 bg-emerald-50">
                      <p className="text-[0.75rem] text-emerald-700">Approved</p>
                      <p className="text-[1.125rem] text-emerald-700" style={{ fontWeight: 700 }}>{ownerDetail.totals.approved_count}</p>
                    </div>
                    <div className="rounded-xl border border-yellow-200 p-3 bg-yellow-50">
                      <p className="text-[0.75rem] text-yellow-700">Pending</p>
                      <p className="text-[1.125rem] text-yellow-700" style={{ fontWeight: 700 }}>{ownerDetail.totals.pending_count}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                    <div className="rounded-xl border border-border p-4">
                      <h4 className="text-[0.875rem] mb-2">Owner Account</h4>
                      <div className="space-y-1 text-[0.8125rem] text-muted-foreground">
                        <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {ownerDetail.owner.email}</p>
                        <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {ownerDetail.owner.phone || "N/A"}</p>
                        <p className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Status: {ownerDetail.owner.status}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border p-4">
                      <h4 className="text-[0.875rem] mb-2">Verification Activity</h4>
                      <div className="space-y-1 text-[0.8125rem] text-muted-foreground">
                        <p className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Rejected Futsals: {ownerDetail.totals.rejected_count}</p>
                        <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Joined: {ownerDetail.owner.created_at.slice(0, 10)}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[0.875rem] mb-2">Owned Futsals</h4>
                    <div className="border border-border rounded-xl overflow-hidden">
                      <table className="w-full text-[0.8125rem]">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="text-left px-3 py-2 font-[500]">Futsal</th>
                            <th className="text-left px-3 py-2 font-[500]">Location</th>
                            <th className="text-left px-3 py-2 font-[500]">Status</th>
                            <th className="text-left px-3 py-2 font-[500]">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ownerDetail.futsals.map((futsal) => (
                            <tr key={futsal.id} className="border-t border-border">
                              <td className="px-3 py-2" style={{ fontWeight: 500 }}>{futsal.futsal_name}</td>
                              <td className="px-3 py-2 text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {futsal.location}</span></td>
                              <td className="px-3 py-2 capitalize">
                                <span className={`px-2 py-0.5 rounded-full ${futsal.approval_status === "approved" ? "bg-emerald-100 text-emerald-700" : futsal.approval_status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                                  {futsal.approval_status}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <button onClick={() => setSelectedFutsalFromOwner(futsal)} className="px-2.5 py-1 border border-border rounded-md hover:bg-muted inline-flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                          {ownerDetail.futsals.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No futsals registered by this owner yet.</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {selectedFutsalFromOwner ? (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden border border-border">
            <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-700 text-white p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.75rem] uppercase tracking-[0.12em] text-blue-100">Owner Futsal Review</p>
                  <h3 className="text-[1.5rem] mt-1" style={{ fontWeight: 700 }}>{selectedFutsalFromOwner.futsal_name}</h3>
                  <p className="text-blue-100 text-[0.875rem] inline-flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {selectedFutsalFromOwner.location}</p>
                </div>
                <button onClick={() => setSelectedFutsalFromOwner(null)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 rounded-xl border border-border p-4">
                <h4 className="text-[0.875rem] mb-2">Submission Info</h4>
                <div className="space-y-1 text-[0.8125rem] text-muted-foreground">
                  <p className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> Owner: {ownerDetail?.owner.first_name} {ownerDetail?.owner.last_name}</p>
                  <p className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Submitted: {selectedFutsalFromOwner.created_at.slice(0, 10)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 h-fit">
                <p className="text-[0.75rem] text-muted-foreground uppercase tracking-wide mb-1">Decision</p>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-[0.75rem] capitalize mb-4 ${selectedFutsalFromOwner.approval_status === "approved" ? "bg-emerald-100 text-emerald-700" : selectedFutsalFromOwner.approval_status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                  {selectedFutsalFromOwner.approval_status}
                </span>
                <div className="space-y-2">
                  <button
                    disabled={futsalDecisionLoading}
                    onClick={() => handleOwnerFutsalDecision(selectedFutsalFromOwner.id, "approve")}
                    className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white text-[0.875rem] hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {futsalDecisionLoading ? "Working..." : "Approve"}
                  </button>
                  <button
                    disabled={futsalDecisionLoading}
                    onClick={() => handleOwnerFutsalDecision(selectedFutsalFromOwner.id, "reject")}
                    className="w-full px-3 py-2 rounded-lg bg-rose-600 text-white text-[0.875rem] hover:bg-rose-700 disabled:opacity-60"
                  >
                    {futsalDecisionLoading ? "Working..." : "Reject"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3>Delete Owner Account</h3>
              <button onClick={() => setDeleteTarget(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[0.875rem] text-muted-foreground mb-6">
              This will permanently delete owner <span style={{ fontWeight: 600 }}>{deleteTarget.name}</span> and related records.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-border rounded-lg text-[0.875rem] hover:bg-muted">
                Cancel
              </button>
              <button
                disabled={deleteLoading}
                onClick={() => handleDeleteOwner(deleteTarget)}
                className="px-4 py-2 rounded-lg text-[0.875rem] text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete Owner"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
