import { useEffect, useMemo, useState } from "react";
import { Check, X, Search, Pencil, Trash2, CheckCircle2, CircleX, AlertTriangle } from "lucide-react";
import { cancelBooking, confirmBooking, deleteBooking, getMyBookings, getSlots, updateBooking, type TimeSlotItem } from "../lib/api";

interface OwnerBookingRow {
  id: number;
  slotId: number;
  futsalId: number;
  futsalName: string;
  playerName: string;
  date: string;
  time: string;
  amount: number;
  paymentMethod: "online" | "offline";
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  status: "confirmed" | "cancelled" | "completed" | "no_show";
}

interface FeedbackDialog {
  variant: "success" | "warning" | "error";
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export function OwnerBookings() {
  const [bookings, setBookings] = useState<OwnerBookingRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<OwnerBookingRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OwnerBookingRow | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlotItem[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [selectedEditDate, setSelectedEditDate] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState(false);
  const [statusEditTarget, setStatusEditTarget] = useState<OwnerBookingRow | null>(null);
  const [statusEditValue, setStatusEditValue] = useState<"completed" | "no_show">("completed");
  const [savingStatusEdit, setSavingStatusEdit] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialog | null>(null);

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

  const loadOwnerBookings = async () => {
    try {
      setLoading(true);
      const data = await getMyBookings();
      const mapped: OwnerBookingRow[] = data.map((booking) => ({
        id: booking.id,
        slotId: booking.slot,
        futsalId: booking.futsal_details.futsal_id,
        futsalName: booking.futsal_details.futsal_name,
        playerName: booking.user_name || `Player #${booking.user}`,
        date: booking.slot_details.slot_date,
        time: `${formatTimeLabel(booking.slot_details.start_time)} - ${formatTimeLabel(booking.slot_details.end_time)}`,
        amount: Number(booking.slot_details.price),
        paymentMethod: booking.payment_status === "completed" ? "online" : "offline",
        paymentStatus: booking.payment_status,
        status: booking.booking_status,
      }));
      setBookings(mapped);
    } catch {
      setFeedbackDialog({
        variant: "error",
        title: "Could not load bookings",
        message: "Please refresh and try again.",
        primaryLabel: "Close",
        onPrimary: () => setFeedbackDialog(null),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerBookings();
  }, []);

  const filtered = bookings
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter((b) => `${b.playerName} ${b.futsalName}`.toLowerCase().includes(search.toLowerCase()));

  const selectedSlotPreview = useMemo(
    () => availableSlots.find((slot) => slot.id === selectedSlotId) || null,
    [availableSlots, selectedSlotId],
  );

  const handleAction = async (id: number, action: "confirmed" | "cancelled") => {
    try {
      if (action === "confirmed") {
        await confirmBooking(id);
      } else {
        await cancelBooking(id);
      }
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: action } : b)));
      setFeedbackDialog({
        variant: "success",
        title: action === "confirmed" ? "Booking confirmed" : "Booking cancelled",
        message: action === "confirmed" ? "Booking marked as confirmed." : "Booking cancelled and slot released.",
        primaryLabel: "Done",
        onPrimary: () => setFeedbackDialog(null),
      });
    } catch {
      setFeedbackDialog({
        variant: "error",
        title: "Update failed",
        message: "Could not update this booking right now.",
        primaryLabel: "Close",
        onPrimary: () => setFeedbackDialog(null),
      });
    }
  };

  const openStatusEditModal = (booking: OwnerBookingRow) => {
    setStatusEditTarget(booking);
    setStatusEditValue(booking.status === "no_show" ? "no_show" : "completed");
  };

  const saveStatusEdit = async () => {
    if (!statusEditTarget) return;

    try {
      setSavingStatusEdit(true);
      await updateBooking(statusEditTarget.id, { booking_status: statusEditValue });
      setBookings((prev) => prev.map((b) => (b.id === statusEditTarget.id ? { ...b, status: statusEditValue } : b)));
      setStatusEditTarget(null);
      setFeedbackDialog({
        variant: "success",
        title: "Booking updated",
        message: `Booking status updated to ${formatLabel(statusEditValue)}.`,
        primaryLabel: "Done",
        onPrimary: () => setFeedbackDialog(null),
      });
    } catch {
      setFeedbackDialog({
        variant: "error",
        title: "Update failed",
        message: "Could not update booking status right now.",
        primaryLabel: "Close",
        onPrimary: () => setFeedbackDialog(null),
      });
    } finally {
      setSavingStatusEdit(false);
    }
  };

  const openEditModal = async (booking: OwnerBookingRow) => {
    try {
      const slots = await getSlots({ futsal: booking.futsalId, slotDate: booking.date });
      setAvailableSlots(slots);
      setSelectedSlotId(booking.slotId);
      setSelectedEditDate(booking.date);
      setEditTarget(booking);
    } catch {
      setFeedbackDialog({
        variant: "error",
        title: "Could not load slots",
        message: "Please try again in a moment.",
        primaryLabel: "Close",
        onPrimary: () => setFeedbackDialog(null),
      });
    }
  };

  const loadEditSlots = async (futsalId: number, slotDate: string) => {
    const slots = await getSlots({ futsal: futsalId, slotDate });
    setAvailableSlots(slots);
  };

  const handleEditDateChange = async (dateValue: string) => {
    if (!editTarget) return;
    setSelectedEditDate(dateValue);
    setSelectedSlotId(null);
    try {
      await loadEditSlots(editTarget.futsalId, dateValue);
    } catch {
      setFeedbackDialog({
        variant: "error",
        title: "Could not load slots",
        message: "Please choose a different date.",
        primaryLabel: "Close",
        onPrimary: () => setFeedbackDialog(null),
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget || !selectedSlotId) {
      return;
    }

    try {
      setSavingEdit(true);
      const updated = await updateBooking(editTarget.id, { slot: selectedSlotId });
      const fallbackSlot = availableSlots.find((slot) => slot.id === selectedSlotId) || null;
      const nextDate = updated.slot_details?.slot_date || fallbackSlot?.slot_date || selectedEditDate || editTarget.date;
      const nextStart = updated.slot_details?.start_time || fallbackSlot?.start_time || null;
      const nextEnd = updated.slot_details?.end_time || fallbackSlot?.end_time || null;
      const nextAmount = updated.slot_details?.price || (fallbackSlot ? String(fallbackSlot.price) : String(editTarget.amount));

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === editTarget.id
            ? {
                ...booking,
                slotId: updated.slot,
                date: nextDate,
                time: nextStart && nextEnd
                  ? `${formatTimeLabel(nextStart)} - ${formatTimeLabel(nextEnd)}`
                  : booking.time,
                amount: Number(nextAmount),
              }
            : booking,
        ),
      );
      setEditTarget(null);
      setFeedbackDialog({
        variant: "success",
        title: "Booking updated",
        message: "Time and amount were updated successfully.",
        primaryLabel: "Great",
        onPrimary: () => setFeedbackDialog(null),
      });
    } catch (err) {
      setFeedbackDialog({
        variant: "error",
        title: "Could not edit booking",
        message: err instanceof Error ? err.message : "Try selecting a different slot.",
        primaryLabel: "Close",
        onPrimary: () => setFeedbackDialog(null),
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!deleteTarget) return;

    try {
      setDeletingBooking(true);
      await deleteBooking(deleteTarget.id);
      setBookings((prev) => prev.filter((booking) => booking.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedbackDialog({
        variant: "success",
        title: "Booking deleted",
        message: "The booking was removed successfully.",
        primaryLabel: "Done",
        onPrimary: () => setFeedbackDialog(null),
      });
    } catch {
      setFeedbackDialog({
        variant: "error",
        title: "Delete failed",
        message: "Could not delete this booking right now.",
        primaryLabel: "Close",
        onPrimary: () => setFeedbackDialog(null),
      });
    } finally {
      setDeletingBooking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="mb-1">Manage Bookings</h1>
      <p className="text-muted-foreground mb-6">View and manage all court bookings</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search player or futsal..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-input-background" />
        </div>
        <div className="flex gap-2">
          {["all", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-[0.8125rem] ${statusFilter === s ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}`}>
              {formatLabel(s)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border text-[0.8125rem] text-muted-foreground">
                <th className="text-left px-4 py-3 font-[500]">Booking ID</th>
                <th className="text-left px-4 py-3 font-[500]">Player</th>
                <th className="text-left px-4 py-3 font-[500]">Date</th>
                <th className="text-left px-4 py-3 font-[500]">Time</th>
                <th className="text-left px-4 py-3 font-[500]">Amount</th>
                <th className="text-left px-4 py-3 font-[500]">Payment</th>
                <th className="text-left px-4 py-3 font-[500]">Status</th>
                <th className="text-left px-4 py-3 font-[500]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">Loading bookings...</td>
                </tr>
              ) : null}
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 text-[0.875rem]">
                  <td className="px-4 py-3 text-muted-foreground">{b.id}</td>
                  <td className="px-4 py-3">
                    <div>{b.playerName}</div>
                    <div className="text-[0.75rem] text-muted-foreground">{b.futsalName}</div>
                  </td>
                  <td className="px-4 py-3">{b.date}</td>
                  <td className="px-4 py-3">{b.time}</td>
                  <td className="px-4 py-3">Rs. {b.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[0.75rem] ${b.paymentMethod === "online" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                      {formatLabel(b.paymentMethod)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[0.75rem] ${
                      b.status === "confirmed"
                        ? "bg-emerald-100 text-emerald-700"
                        : b.status === "completed"
                        ? "bg-blue-100 text-blue-700"
                        : b.status === "no_show"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-red-100 text-red-700"
                    }`}>{formatLabel(b.status)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {b.status === "confirmed" ? (
                        <button onClick={() => openEditModal(b)} className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-[0.75rem]" title="Edit booking">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      ) : null}
                      {(b.status === "completed" || b.status === "no_show") ? (
                        <button onClick={() => openStatusEditModal(b)} className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-[0.75rem]" title="Edit status">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      ) : null}
                      {b.status === "confirmed" ? (
                        <button onClick={() => handleAction(b.id, "cancelled")} className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 text-[0.75rem]" title="Cancel booking">
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      ) : null}
                      {(b.status === "completed" || b.status === "no_show" || b.status === "cancelled") ? (
                        <button onClick={() => setDeleteTarget(b)} className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 text-[0.75rem]" title="Delete booking">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No bookings found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {editTarget ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3>Edit Booking</h3>
              <button onClick={() => setEditTarget(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="text-[0.8125rem] text-muted-foreground">Player: {editTarget.playerName}</div>
              <div className="text-[0.8125rem] text-muted-foreground">Futsal: {editTarget.futsalName}</div>
              <input
                type="date"
                value={selectedEditDate}
                onChange={(e) => handleEditDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border"
              />
              <select
                value={selectedSlotId ?? ""}
                onChange={(e) => setSelectedSlotId(Number(e.target.value) || null)}
                className="w-full px-3 py-2 rounded-lg border border-border"
              >
                <option value="">Select available slot</option>
                {availableSlots
                  .filter((slot) => slot.availability_status === "available" || slot.id === selectedSlotId)
                  .map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {`${formatTimeLabel(slot.start_time)} - ${formatTimeLabel(slot.end_time)}`}
                    </option>
                  ))}
              </select>
              <div className="rounded-lg bg-muted/40 p-3 text-[0.875rem]">
                <p><span style={{ fontWeight: 600 }}>New Amount:</span> Rs. {selectedSlotPreview ? Number(selectedSlotPreview.price) : editTarget.amount}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setEditTarget(null)} className="py-2.5 border border-border rounded-lg hover:bg-muted">Cancel</button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3>Delete Booking</h3>
              <button onClick={() => setDeleteTarget(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[0.875rem] text-muted-foreground mb-4">Are you sure you want to permanently delete this booking?</p>
            <div className="rounded-lg bg-muted/40 p-3 mb-5 text-[0.875rem]">
              <p><span style={{ fontWeight: 600 }}>Player:</span> {deleteTarget.playerName}</p>
              <p><span style={{ fontWeight: 600 }}>Time:</span> {deleteTarget.time}</p>
              <p><span style={{ fontWeight: 600 }}>Amount:</span> Rs. {deleteTarget.amount}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeleteTarget(null)} className="py-2.5 border border-border rounded-lg hover:bg-muted">Keep</button>
              <button
                onClick={handleDeleteBooking}
                disabled={deletingBooking}
                className="py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingBooking ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {statusEditTarget ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3>Edit Booking Status</h3>
              <button onClick={() => setStatusEditTarget(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 mb-5 text-[0.875rem] text-muted-foreground">
              <p><span style={{ fontWeight: 600 }}>Player:</span> {statusEditTarget.playerName}</p>
              <p><span style={{ fontWeight: 600 }}>Time:</span> {statusEditTarget.time}</p>
            </div>
            <div className="mb-5">
              <label className="block text-[0.75rem] text-muted-foreground mb-1">Status</label>
              <select
                value={statusEditValue}
                onChange={(e) => setStatusEditValue(e.target.value as "completed" | "no_show")}
                className="w-full px-3 py-2 rounded-lg border border-border"
              >
                <option value="completed">Completed</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStatusEditTarget(null)} className="py-2.5 border border-border rounded-lg hover:bg-muted">Cancel</button>
              <button
                onClick={saveStatusEdit}
                disabled={savingStatusEdit}
                className="py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingStatusEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedbackDialog ? (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {feedbackDialog.variant === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : null}
                {feedbackDialog.variant === "warning" ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : null}
                {feedbackDialog.variant === "error" ? <CircleX className="w-5 h-5 text-red-600" /> : null}
                <h3>{feedbackDialog.title}</h3>
              </div>
              <button onClick={() => setFeedbackDialog(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[0.875rem] text-muted-foreground mb-6">{feedbackDialog.message}</p>
            <div className="flex justify-end gap-2">
              {feedbackDialog.secondaryLabel && feedbackDialog.onSecondary ? (
                <button onClick={feedbackDialog.onSecondary} className="px-4 py-2 border border-border rounded-lg text-[0.875rem] hover:bg-muted">
                  {feedbackDialog.secondaryLabel}
                </button>
              ) : null}
              <button
                onClick={feedbackDialog.onPrimary}
                className={`px-4 py-2 rounded-lg text-white text-[0.875rem] ${feedbackDialog.variant === "success" ? "bg-emerald-600 hover:bg-emerald-700" : feedbackDialog.variant === "warning" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}`}
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
