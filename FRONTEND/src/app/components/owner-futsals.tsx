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
    <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>My Futsals</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">View and manage your registered futsals</p>
        </div>
      </div>

      {loadError ? (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive inline-flex items-start gap-2">
          <CircleX className="w-4 h-4 shrink-0 mt-0.5" /> {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {loading ? (
          <p className="text-muted-foreground col-span-full text-sm">Loading futsals…</p>
        ) : null}

        {!loading && futsals.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 border border-dashed border-border rounded-xl bg-card p-8 md:p-10 text-center shadow-sm">
            <PlusCircle className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="text-base font-semibold text-foreground">No futsals registered yet</p>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">Go to Manage Slots and register your first futsal.</p>
          </div>
        ) : null}

        {futsals.map((futsal) => (
          <Link
            key={futsal.id}
            to={`/owner/futsals/${futsal.id}`}
            className="group text-left bg-card rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={getFutsalImage(futsal.id)}
                alt={futsal.futsal_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4 md:p-5">
              <h3 className="text-base font-semibold">{futsal.futsal_name}</h3>
              <p className="text-sm text-muted-foreground inline-flex items-center gap-1.5 mt-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {futsal.location}
              </p>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{futsal.description || "No description yet."}</p>
              <p className="text-xs text-muted-foreground mt-3">Time slots today: {slotCountsByFutsal[futsal.id] ?? 0}</p>
              <div className="mt-3 text-xs font-semibold">
                {futsal.approval_status === "approved" ? (
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                ) : futsal.approval_status === "rejected" ? (
                  <span className="inline-flex items-center gap-1.5 text-destructive">
                    <CircleX className="w-3.5 h-3.5" /> Denied
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-800">
                    <Clock3 className="w-3.5 h-3.5" /> Pending
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
