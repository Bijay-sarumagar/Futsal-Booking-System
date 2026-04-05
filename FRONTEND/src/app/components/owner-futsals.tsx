import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, CircleX, Clock3, MapPin, PlusCircle } from "lucide-react";
import { getMyFutsals, getSlots, type FutsalItem } from "../lib/api";
import { futsalImages } from "./data";

export function OwnerFutsals() {
  const [futsals, setFutsals] = useState<FutsalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [slotCountsByFutsal, setSlotCountsByFutsal] = useState<Record<number, number>>({});

  const loadMyFutsals = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const data = await getMyFutsals();
      setFutsals(data);
      const today = new Date().toISOString().slice(0, 10);
      const counts = await Promise.all(
        data.map(async (f) => {
          try {
            const slots = await getSlots({ futsal: f.id, slotDate: today });
            return [f.id, slots.length] as const;
          } catch {
            return [f.id, 0] as const;
          }
        }),
      );
      setSlotCountsByFutsal(Object.fromEntries(counts));
    } catch {
      setLoadError("Could not load futsals. Please refresh and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyFutsals();
  }, []);

  const getFutsalImage = (futsalId: number) => {
    const item = futsals.find((f) => f.id === futsalId);
    if (item?.image) return item.image;
    const index = futsals.findIndex((f) => f.id === futsalId);
    return futsalImages[(index >= 0 ? index : 0) % futsalImages.length];
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>My Futsals</h1>
          <p className="text-muted-foreground">View and manage your registered futsals</p>
        </div>
      </div>

      {loadError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-[0.875rem] text-red-700 inline-flex items-center gap-2">
          <CircleX className="w-4 h-4" /> {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-muted-foreground">Loading futsals...</p>
        ) : null}

        {!loading && futsals.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 border border-border rounded-xl bg-white p-6 text-center">
            <PlusCircle className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
            <p className="text-[0.9375rem]" style={{ fontWeight: 600 }}>No futsals registered yet</p>
            <p className="text-muted-foreground text-[0.875rem] mt-1">Go to Manage Slots and register your first futsal.</p>
          </div>
        ) : null}

        {futsals.map((futsal) => (
          <Link
            key={futsal.id}
            to={`/owner/futsals/${futsal.id}`}
            className="group text-left bg-white rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-lg transition-shadow"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={getFutsalImage(futsal.id)}
                alt={futsal.futsal_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="text-[1rem]">{futsal.futsal_name}</h3>
              <p className="text-[0.8125rem] text-muted-foreground inline-flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {futsal.location}</p>
              <p className="text-[0.8125rem] text-muted-foreground mt-2 line-clamp-2">{futsal.description || "No description yet."}</p>
              <p className="text-[0.75rem] text-muted-foreground mt-2">Time slots today: {slotCountsByFutsal[futsal.id] ?? 0}</p>
              <div className="mt-3 text-[0.75rem]" style={{ fontWeight: 600 }}>
                {futsal.approval_status === "approved" ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
                ) : futsal.approval_status === "rejected" ? (
                  <span className="inline-flex items-center gap-1 text-red-700"><CircleX className="w-3.5 h-3.5" /> Denied</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-yellow-700"><Clock3 className="w-3.5 h-3.5" /> Pending</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
