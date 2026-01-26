import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, Clock, MapPin, X, Check, AlertCircle, CheckCircle2, CircleX, Camera } from "lucide-react";
import { toast } from "sonner";
import { cancelBooking, getMyBookings, uploadPaymentProof } from "../lib/api";

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
  const [showHistory, setShowHistory] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [proofUploadTarget, setProofUploadTarget] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
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
          paymentStatus: b.payment_status,
          paymentProofImage: b.payment_proof_image || null,
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
  const upcomingBookings = bookings.filter((b) => b.status !== "cancelled" && b.date >= today);
  const historyBookings = bookings.filter((b) => b.status === "cancelled" || b.date < today);

  const handleCancel = async (id: number) => {
    const target = bookings.find((b) => b.id === id);
    const willRefund = target?.paymentStatus === "completed";

    try {
      setCancelLoading(true);
      await cancelBooking(id);
      setBookings((prev) => prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: "cancelled" as const,
              paymentStatus: willRefund ? "refunded" as const : "failed" as const,
            }
          : b,
      ));
      setCancelTarget(null);
      setStatusDialog({
        variant: "success",
        title: "Booking cancelled",
        message: willRefund
          ? "Your slot was released and payment was marked refunded."
          : "Your slot was released successfully.",
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

  const handleUploadProof = async () => {
    if (!proofUploadTarget || !proofFile) return;

    try {
      setProofUploading(true);
      await uploadPaymentProof({ booking_id: proofUploadTarget.id, payment_proof_image: proofFile });
      setBookings((prev) => prev.map((b) =>
        b.id === proofUploadTarget.id ? { ...b, paymentProofImage: URL.createObjectURL(proofFile) } : b,
      ));
      setStatusDialog({
        variant: "success",
        title: "Proof uploaded",
        message: "Payment screenshot was uploaded for owner verification.",
        primaryLabel: "Done",
        onPrimary: () => setStatusDialog(null),
      });
      setProofUploadTarget(null);
      setProofFile(null);
    } catch (_err) {
      setStatusDialog({
        variant: "error",
        title: "Upload failed",
        message: "Could not upload payment proof. Please try again.",
        primaryLabel: "Close",
        onPrimary: () => setStatusDialog(null),
      });
    } finally {
      setProofUploading(false);
    }
  };

  return (
    <div className="w-full py-6 md:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="mb-1">My Bookings</h1>
          <p className="text-muted-foreground">Manage your futsal reservations</p>
        </div>

        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="self-start sm:self-auto px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted"
        >
          {showHistory ? "Hide History" : "View History"}
        </button>
      </div>

      <div className="space-y-4">
        {loading ? <p className="text-muted-foreground">Loading bookings...</p> : null}
        {upcomingBookings.map((b) => {
          const Icon = statusIcons[b.status] || Clock;
          return (
            <div key={b.id} className="bg-white border border-border rounded-2xl p-5 md:p-6 shadow-sm">
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
                    <span className="font-medium">Rs. {b.amount}</span>
                    <span className="text-muted-foreground">• {b.paymentStatus === "completed" ? "Paid Online" : b.paymentStatus === "refunded" ? "Refunded" : b.paymentStatus === "pending" ? "Payment Pending" : "Payment Not Completed"}</span>
                  </div>
                  <div className="mt-2 text-[0.8125rem]">
                    {b.paymentProofImage ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-700 whitespace-nowrap">
                        <Camera className="w-3.5 h-3.5" /> Proof uploaded
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {b.status !== "cancelled" && (
                    <button
                      onClick={() => setCancelTarget(b)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-[0.875rem] hover:bg-red-50 cursor-pointer"
                    >
                      Cancel Booking
                    </button>
                  )}
                  {b.status === "confirmed" && b.paymentStatus === "pending" ? (
                    <button
                      onClick={() => setProofUploadTarget(b)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-primary/30 text-primary rounded-xl text-[0.875rem] hover:bg-primary/5 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Proof
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {upcomingBookings.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No upcoming bookings</p>
          </div>
        )}
      </div>

      {showHistory ? (
        <div className="space-y-4 mt-8">
          <h3 className="text-base">Booking History</h3>
          {historyBookings.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No past or cancelled bookings in your history yet.
            </div>
          ) : null}
          {historyBookings.map((b) => {
            const Icon = statusIcons[b.status] || Clock;
            return (
              <div key={`history-${b.id}`} className="rounded-xl border border-border p-4 bg-white">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="font-medium">{b.futsalName}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusColors[b.status]}`}>
                    <Icon className="w-3 h-3" /> {formatLabel(b.status)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {b.location ? `${b.location} | ` : ""}
                  {b.date} | {b.time}
                </p>
                <p className="text-sm mt-1">Rs. {b.amount}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {proofUploadTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3>Proof</h3>
              <button onClick={() => setProofUploadTarget(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your payment screenshot for owner verification.
            </p>
            <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-muted/50 text-sm text-muted-foreground cursor-pointer hover:bg-muted">
              <Camera className="w-4 h-4" /> Choose screenshot
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
            {proofFile ? (
              <p className="text-[0.85rem] text-muted-foreground mt-3">Selected file: {proofFile.name}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => setProofUploadTarget(null)} disabled={proofUploading} className="py-3 border border-border rounded-xl hover:bg-muted disabled:opacity-60">
                Cancel
              </button>
              <button onClick={handleUploadProof} disabled={!proofFile || proofUploading} className="py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-60">
                {proofUploading ? "Uploading..." : "Submit Proof"}
              </button>
            </div>
          </div>
        </div>
      )}

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
