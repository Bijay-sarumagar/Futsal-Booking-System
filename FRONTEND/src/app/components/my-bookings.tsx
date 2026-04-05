import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, Clock, MapPin, X, Check, AlertCircle, CheckCircle2, CircleX } from "lucide-react";
import { toast } from "sonner";
import { cancelBooking, getMyBookings } from "../lib/api";

interface BookingStatusDialog {
  variant: "success" | "error";
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export function MyBookings() {
  const [tab, setTab] = useState<"upcoming" | "past" | "cancelled">("upcoming");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [statusDialog, setStatusDialog] = useState<BookingStatusDialog | null>(null);
  const navigate = useNavigate();

  const formatTimeLabel = (value: string) => {
    const [hRaw, mRaw] = value.split(":");
    const hour24 = Number(hRaw);
    const minute = Number(mRaw);
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };
  const formatLabel = (value: string) => value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getMyBookings();
        const mapped = data.map((b) => ({
          id: b.id,
          futsalName: b.futsal_details.futsal_name,
          location: b.futsal_details.location,
          date: b.slot_details.slot_date,
          time: `${formatTimeLabel(b.slot_details.start_time)} - ${formatTimeLabel(b.slot_details.end_time)}`,
          status: b.booking_status,
          amount: Number(b.slot_details.price),
          paymentMethod: b.payment_status === "completed" ? "online" : "offline",
        }));
        setBookings(mapped);
      } catch (_err) {
        toast.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const statusColors: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    completed: "bg-blue-100 text-blue-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-gray-200 text-gray-700",
  };
  const statusIcons: Record<string, any> = { confirmed: Check, completed: Check, pending: Clock, cancelled: X, no_show: AlertCircle };

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const filtered = bookings.filter((b) => {
    if (tab === "upcoming") return b.status !== "cancelled" && b.date >= today;
    if (tab === "cancelled") return b.status === "cancelled";
    return b.date < today;
  });

  const handleCancel = async (id: number) => {
    try {
      setCancelLoading(true);
      await cancelBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "cancelled" as const } : b)));
      setCancelTarget(null);
      setStatusDialog({
        variant: "success",
        title: "Booking cancelled",
        message: "Your slot was released successfully.",
        primaryLabel: "View Bookings",
        secondaryLabel: "Find Futsals",
        onPrimary: () => setStatusDialog(null),
        onSecondary: () => {
          setStatusDialog(null);
          navigate("/player/home");
        },
      });
    } catch (_err) {
      setStatusDialog({
        variant: "error",
        title: "Unable to cancel",
        message: "Please try again in a moment.",
        primaryLabel: "Try Again",
        onPrimary: () => setStatusDialog(null),
      });
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="mb-1">My Bookings</h1>
      <p className="text-muted-foreground mb-6">Manage your futsal reservations</p>

      <div className="flex gap-2 mb-6">
        {(["upcoming", "past", "cancelled"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg capitalize text-[0.875rem] ${tab === t ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? <p className="text-muted-foreground">Loading bookings...</p> : null}
        {filtered.map((b) => {
          const Icon = statusIcons[b.status] || Clock;
          return (
            <div key={b.id} className="bg-white border border-border rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3>{b.futsalName}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[0.75rem] flex items-center gap-1 ${statusColors[b.status]}`}>
                      <Icon className="w-3 h-3" /> {formatLabel(b.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[0.875rem] text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {b.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {b.time}</span>
                    {b.location ? <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {b.location}</span> : null}
                  </div>
                  <div className="flex items-center gap-4 text-[0.875rem]">
                    <span>Rs. {b.amount}</span>
                    <span className="text-muted-foreground">• {b.paymentMethod === "online" ? "Paid Online" : "Pay at Venue"}</span>
                  </div>
                </div>
                {b.status !== "cancelled" && tab === "upcoming" && (
                  <button onClick={() => setCancelTarget(b)} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-[0.875rem] hover:bg-red-50 cursor-pointer">
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No {formatLabel(tab)} bookings</p>
          </div>
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3>Cancel Booking</h3>
              <button onClick={() => setCancelTarget(null)} className="p-1 rounded hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-muted-foreground text-[0.875rem] mb-4">
              Are you sure you want to cancel this booking?
            </p>
            <div className="space-y-2 bg-gray-50 rounded-lg p-3 mb-5 text-[0.875rem]">
              <p><span style={{ fontWeight: 600 }}>Court:</span> {cancelTarget.futsalName}</p>
              <p><span style={{ fontWeight: 600 }}>Date:</span> {cancelTarget.date}</p>
              <p><span style={{ fontWeight: 600 }}>Time:</span> {cancelTarget.time}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelLoading}
                className="py-3 border border-border rounded-xl hover:bg-muted disabled:opacity-60"
              >
                Keep Booking
              </button>
              <button
                onClick={() => handleCancel(cancelTarget.id)}
                disabled={cancelLoading}
                className="py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60"
              >
                {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusDialog ? (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {statusDialog.variant === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <CircleX className="w-5 h-5 text-red-600" />}
                <h3>{statusDialog.title}</h3>
              </div>
              <button onClick={() => setStatusDialog(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[0.875rem] text-muted-foreground mb-6">{statusDialog.message}</p>
            <div className="flex justify-end gap-2">
              {statusDialog.secondaryLabel && statusDialog.onSecondary ? (
                <button onClick={statusDialog.onSecondary} className="px-4 py-2 border border-border rounded-lg text-[0.875rem] hover:bg-muted">
                  {statusDialog.secondaryLabel}
                </button>
              ) : null}
              <button
                onClick={statusDialog.onPrimary}
                className={`px-4 py-2 rounded-lg text-[0.875rem] text-white ${statusDialog.variant === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                {statusDialog.primaryLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
