import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Building2, ShieldCheck, Users, MapPin, ArrowRight, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { getFutsals, getOwnersForAdmin } from "../lib/api";

const cards = [
  {
    title: "Owner Verification",
    description: "Approve or suspend futsal owner accounts.",
    to: "/super-admin/owners",
    icon: Users,
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    title: "Futsal Approvals",
    description: "Review pending futsal registrations and update status.",
    to: "/super-admin/futsals",
    icon: MapPin,
    accent: "bg-blue-50 text-blue-700 border-blue-200",
  },
];

export function SuperAdminPage() {
  const [ownerCount, setOwnerCount] = useState(0);
  const [futsalCount, setFutsalCount] = useState(0);
  const [pendingFutsals, setPendingFutsals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        const [owners, futsals] = await Promise.all([getOwnersForAdmin(), getFutsals()]);
        setOwnerCount(owners.length);
        setFutsalCount(futsals.length);
        setPendingFutsals(futsals.filter((item) => item.approval_status === "pending").length);
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, []);

  const approvedFutsals = useMemo(() => Math.max(futsalCount - pendingFutsals, 0), [futsalCount, pendingFutsals]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="rounded-2xl border border-border p-6 md:p-8 bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-700 text-white mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1>Super Admin Control Center</h1>
            <p className="text-emerald-100 mt-1">
              Manage platform approvals, monitor account health, and control marketplace quality.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-[0.75rem] text-muted-foreground">Total Owners</p>
          <p className="text-[1.5rem] mt-1" style={{ fontWeight: 700 }}>{loading ? "..." : ownerCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-[0.75rem] text-muted-foreground">Total Futsals</p>
          <p className="text-[1.5rem] mt-1" style={{ fontWeight: 700 }}>{loading ? "..." : futsalCount}</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-[0.75rem] text-yellow-700">Pending Reviews</p>
          <p className="text-[1.5rem] mt-1 text-yellow-700" style={{ fontWeight: 700 }}>{loading ? "..." : pendingFutsals}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[0.75rem] text-emerald-700">Approved Futsals</p>
          <p className="text-[1.5rem] mt-1 text-emerald-700" style={{ fontWeight: 700 }}>{loading ? "..." : approvedFutsals}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {cards.map((card) => (
          <Link key={card.title} to={card.to} className={`rounded-2xl border p-5 transition-colors hover:bg-muted/40 ${card.accent}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[1rem]" style={{ fontWeight: 700 }}>{card.title}</p>
                <p className="text-[0.875rem] mt-1 opacity-90">{card.description}</p>
              </div>
              <card.icon className="w-5 h-5 shrink-0" />
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-[0.8125rem]" style={{ fontWeight: 600 }}>
              Open Panel <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-[0.9375rem]">Platform Health</h3>
          </div>
          <p className="text-[0.875rem] text-muted-foreground">All admin services are live. Use the panels above for operations.</p>
          <div className="mt-3 space-y-2 text-[0.8125rem]">
            <p className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Approval API online</p>
            <p className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Owner management ready</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Clock3 className="w-4 h-4 text-sky-600" />
            <h3 className="text-[0.9375rem]">Recommended Workflow</h3>
          </div>
          <ul className="text-[0.875rem] text-muted-foreground space-y-1">
            <li>1. Approve owner account.</li>
            <li>2. Approve owner futsal listing.</li>
            <li>3. Verify owner creates time slots.</li>
            <li>4. Player booking becomes available automatically.</li>
          </ul>
          <div className="mt-3 inline-flex items-center gap-1 text-[0.8125rem] text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            Focus on pending reviews to reduce onboarding delays.
          </div>
        </div>
      </div>
    </div>
  );
}
