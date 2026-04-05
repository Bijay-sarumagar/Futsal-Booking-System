import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, CircleX, Clock3, MapPin, Pencil, X } from "lucide-react";
import { getFutsalById, getSlots, updateFutsal, updateSlot, type FutsalItem, type TimeSlotItem } from "../lib/api";
import { futsalImages } from "./data";

interface FeedbackDialog {
  variant: "success" | "error";
  title: string;
  message: string;
}

export function OwnerFutsalDetail() {
  const { id } = useParams();
  const futsalId = Number(id);

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const parseLocalDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const getInitialSelectedDate = () => {
    const today = formatLocalDate(new Date());
    try {
      const raw = localStorage.getItem("futsalhub.owner.lastCreatedSlot");
      if (!raw) return today;
      const parsed = JSON.parse(raw) as { futsalId?: number; slotDate?: string };
      if (parsed?.futsalId === futsalId && parsed?.slotDate) {
        return parsed.slotDate;
      }
    } catch {
      return today;
    }
    return today;
  };

  const [futsal, setFutsal] = useState<FutsalItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(getInitialSelectedDate);
  const [slots, setSlots] = useState<TimeSlotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [slotEditOpen, setSlotEditOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingSlotId, setSavingSlotId] = useState<number | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialog | null>(null);
  const [selectedSlotDetail, setSelectedSlotDetail] = useState<TimeSlotItem | null>(null);
  const [selectedEditableSlotId, setSelectedEditableSlotId] = useState<number | null>(null);
  const [slotEditDraft, setSlotEditDraft] = useState<{
    slot_date: string;
    start_time: string;
    end_time: string;
    price: string;
    availability_status: TimeSlotItem["availability_status"];
  } | null>(null);
  const [editForm, setEditForm] = useState({
    futsal_name: "",
    location: "",
    description: "",
    latitude: "",
    longitude: "",
  });

  const normalizeTime = (value: string) => value.slice(0, 5);
  const formatTimeLabel = (value: string) => {
    const [hRaw, mRaw] = value.split(":");
    const hour24 = Number(hRaw);
    const minute = Number(mRaw);
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };
  const formatAvailability = (value: TimeSlotItem["availability_status"]) => value.charAt(0).toUpperCase() + value.slice(1);
  const isSlotPast = (slotDate: string, endTime: string) => {
    const today = formatLocalDate(new Date());
    if (slotDate !== today) return false;
    const slotEnd = new Date(`${slotDate}T${normalizeTime(endTime)}:00`);
    return slotEnd <= new Date();
  };

  useEffect(() => {
    async function loadFutsal() {
      if (!Number.isFinite(futsalId)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const futsalData = await getFutsalById(futsalId);
        setFutsal(futsalData);
        setEditForm({
          futsal_name: futsalData.futsal_name,
          location: futsalData.location,
          description: futsalData.description || "",
          latitude: futsalData.latitude ? String(futsalData.latitude) : "",
          longitude: futsalData.longitude ? String(futsalData.longitude) : "",
        });
      } catch {
        setFutsal(null);
      } finally {
        setLoading(false);
      }
    }

    loadFutsal();
  }, [futsalId]);

  useEffect(() => {
    async function loadSlots() {
      if (!Number.isFinite(futsalId)) {
        return;
      }

      try {
        setSlotLoading(true);
        const slotData = await getSlots({ futsal: futsalId, slotDate: selectedDate });
        setSlots(slotData);
      } catch {
        setSlots([]);
      } finally {
        setSlotLoading(false);
      }
    }

    loadSlots();
  }, [futsalId, selectedDate]);

  useEffect(() => {
    if (!slots.length) {
      setSelectedEditableSlotId(null);
      setSelectedSlotDetail(null);
      setSlotEditDraft(null);
      setSlotEditOpen(false);
    }
    if (selectedSlotDetail && !slots.some((slot) => slot.id === selectedSlotDetail.id)) {
      setSelectedSlotDetail(null);
    }
  }, [slots]);

  const dates = useMemo(() => {
    const base = parseLocalDate(selectedDate);
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return {
        value: formatLocalDate(d),
        label: d.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" }),
      };
    });
  }, [selectedDate]);

  const timelineSlots = useMemo(() => {
    const slotByRange = new Map(
      slots.map((slot) => [`${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`, slot]),
    );
    const today = formatLocalDate(new Date());
    const now = new Date();

    return Array.from({ length: 14 }, (_, offset) => {
      const hour = 7 + offset;
      const nextHour = hour + 1;
      const start = `${String(hour).padStart(2, "0")}:00`;
      const end = `${String(nextHour).padStart(2, "0")}:00`;
      const source = slotByRange.get(`${start}-${end}`);
      const isToday = selectedDate === today;
      const slotEndDateTime = new Date(`${selectedDate}T${end}:00`);
      const isPast = isToday && slotEndDateTime <= now;
      const isAvailable = !!source && source.availability_status === "available" && !isPast;

      return {
        key: `${start}-${end}`,
        startLabel: formatTimeLabel(start),
        endLabel: formatTimeLabel(end),
        source,
        isAvailable,
        isPast,
      };
    });
  }, [slots, selectedDate]);

  const saveFutsalEdit = async () => {
    if (!futsal) return;

    try {
      setSavingEdit(true);
      const updated = await updateFutsal(futsal.id, {
        futsal_name: editForm.futsal_name.trim(),
        location: editForm.location.trim(),
        description: editForm.description.trim(),
        latitude: editForm.latitude.trim() || null,
        longitude: editForm.longitude.trim() || null,
      });

      setFutsal(updated);
      setEditForm({
        futsal_name: updated.futsal_name,
        location: updated.location,
        description: updated.description || "",
        latitude: updated.latitude ? String(updated.latitude) : "",
        longitude: updated.longitude ? String(updated.longitude) : "",
      });
      setEditOpen(false);
      setFeedbackDialog({
        variant: "success",
        title: "Futsal updated",
        message: "Your futsal details were saved to the database successfully.",
      });
    } catch (err) {
      setFeedbackDialog({
        variant: "error",
        title: "Update failed",
        message: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const saveSlotEdit = async () => {
    if (!selectedEditableSlotId || !slotEditDraft) return;

    if (slotEditDraft.start_time >= slotEditDraft.end_time) {
      setFeedbackDialog({
        variant: "error",
        title: "Invalid time range",
        message: "End time must be later than start time.",
      });
      return;
    }

    try {
      setSavingSlotId(selectedEditableSlotId);
      const updated = await updateSlot(selectedEditableSlotId, {
        slot_date: slotEditDraft.slot_date,
        start_time: `${slotEditDraft.start_time}:00`,
        end_time: `${slotEditDraft.end_time}:00`,
        price: slotEditDraft.price,
        availability_status: slotEditDraft.availability_status,
      });

      setSlots((prev) => prev.map((slot) => (slot.id === updated.id ? updated : slot)));
      setFeedbackDialog({
        variant: "success",
        title: "Slot updated",
        message: "Slot changes were saved successfully.",
      });
      setSlotEditOpen(false);
    } catch (err) {
      setFeedbackDialog({
        variant: "error",
        title: "Slot update failed",
        message: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSavingSlotId(null);
    }
  };

  const cancelSlotEdit = () => {
    const original = slots.find((slot) => slot.id === selectedEditableSlotId);
    if (!original) return;
    setSlotEditDraft({
      slot_date: original.slot_date,
      start_time: normalizeTime(original.start_time),
      end_time: normalizeTime(original.end_time),
      price: String(original.price),
      availability_status: original.availability_status,
    });
    setSlotEditOpen(false);
  };

  const openSlotEditor = (slot: TimeSlotItem) => {
    setSelectedEditableSlotId(slot.id);
    setSlotEditDraft({
      slot_date: slot.slot_date,
      start_time: normalizeTime(slot.start_time),
      end_time: normalizeTime(slot.end_time),
      price: String(slot.price),
      availability_status: slot.availability_status,
    });
    setSlotEditOpen(true);
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-6 text-muted-foreground">Loading futsal details...</div>;
  }

  if (!futsal) {
    return <div className="max-w-7xl mx-auto px-4 py-6 text-muted-foreground">Futsal not found.</div>;
  }

  const heroImage = futsal.image || futsalImages[futsal.id % futsalImages.length];
  const amenityList = futsal.amenities?.length ? futsal.amenities : ["Changing Room", "Parking", "Drinking Water", "Toilet"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link to="/owner/futsals" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-[0.875rem] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to my futsals
      </Link>

      <div className="rounded-xl overflow-hidden h-72 md:h-96 relative">
        <img src={heroImage} alt={futsal.futsal_name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-white/90 rounded-full text-[0.8125rem]" style={{ fontWeight: 600 }}>
            ⚽ Futsal Court
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1>{futsal.futsal_name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-4 h-4" /> {futsal.location}
              </div>
              <div className="text-[0.875rem] text-muted-foreground">Owner: {futsal.owner_name || "N/A"}</div>
            </div>
            <p className="text-muted-foreground mt-3">{futsal.description || "No futsal description provided yet."}</p>
          </div>

          <div>
            <h3 className="mb-3">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {amenityList.map((a) => (
                <span key={a} className="px-3 py-1.5 rounded-lg border border-border bg-white shadow-sm text-[0.875rem] text-foreground">
                  {a}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3">Time Slots</h3>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {dates.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDate(d.value)}
                  className={`px-4 py-2 rounded-lg text-[0.8125rem] whitespace-nowrap border transition-colors ${
                    selectedDate === d.value ? "bg-emerald-600 text-white border-emerald-600" : "border-border hover:bg-muted"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {slotLoading ? (
              <p className="text-[0.875rem] text-muted-foreground mb-3">Loading slots...</p>
            ) : null}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {timelineSlots.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    if (s.source) setSelectedSlotDetail(s.source);
                  }}
                  disabled={!s.source}
                  className={`p-3 rounded-lg border text-[0.8125rem] text-left ${
                    !s.source
                      ? "bg-gray-50 text-gray-500 border-gray-200 cursor-default"
                      : s.isAvailable
                      ? "border-emerald-200 bg-emerald-50 cursor-pointer hover:border-emerald-300"
                      : s.isPast
                      ? "bg-gray-100 text-gray-600 border-gray-300 cursor-default"
                      : "bg-red-50 text-red-700 border-red-200 cursor-pointer hover:border-red-300"
                  }`}
                >
                  <div style={{ fontWeight: 500 }}>{s.startLabel} - {s.endLabel}</div>
                  <div className={`text-[0.75rem] mt-0.5 ${s.isAvailable ? "text-muted-foreground" : s.isPast ? "text-gray-600" : "text-red-700"}`}>
                    {s.source ? (s.isPast ? "Time Passed" : `Rs. ${s.source.price}`) : "Unavailable"}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[0.75rem] text-muted-foreground mt-2">Click a created time slot to view details and edit from the right panel.</p>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="mb-4">Manage This Futsal</h3>

            <button onClick={() => setEditOpen(true)} className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-2">
              <Pencil className="w-4 h-4" /> Edit Futsal
            </button>

            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="mb-2">Selected Time Slot</h4>
              {selectedSlotDetail ? (
                <div className="space-y-1 text-[0.8125rem] text-muted-foreground">
                  <p><span style={{ fontWeight: 600 }}>Date:</span> {selectedSlotDetail.slot_date}</p>
                  <p><span style={{ fontWeight: 600 }}>Time:</span> {formatTimeLabel(selectedSlotDetail.start_time)} - {formatTimeLabel(selectedSlotDetail.end_time)}</p>
                  <p><span style={{ fontWeight: 600 }}>Price:</span> Rs. {selectedSlotDetail.price}</p>
                  <p><span style={{ fontWeight: 600 }}>Status:</span> {isSlotPast(selectedSlotDetail.slot_date, selectedSlotDetail.end_time) ? "Time Passed" : formatAvailability(selectedSlotDetail.availability_status)}</p>
                  {!isSlotPast(selectedSlotDetail.slot_date, selectedSlotDetail.end_time) ? (
                    <button
                      onClick={() => openSlotEditor(selectedSlotDetail)}
                      className="mt-2 w-full py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Edit Slot
                    </button>
                  ) : (
                    <p className="mt-2 text-[0.75rem] text-muted-foreground">Past slots are auto-closed and do not require manual status changes.</p>
                  )}
                </div>
              ) : (
                <p className="text-[0.8125rem] text-muted-foreground">Click any created time slot to view details here.</p>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-border space-y-2 text-[0.8125rem] text-muted-foreground">
              <p>Selected date: {selectedDate}</p>
              <p>Total slots loaded: {slots.length}</p>
              <div className="pt-2">
                {futsal.approval_status === "approved" ? (
                  <p className="inline-flex items-center gap-1 text-emerald-700" style={{ fontWeight: 600 }}><CheckCircle2 className="w-4 h-4" /> Approved</p>
                ) : futsal.approval_status === "rejected" ? (
                  <p className="inline-flex items-center gap-1 text-red-700" style={{ fontWeight: 600 }}><CircleX className="w-4 h-4" /> Denied</p>
                ) : (
                  <p className="inline-flex items-center gap-1 text-yellow-700" style={{ fontWeight: 600 }}><Clock3 className="w-4 h-4" /> Pending</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl border border-border p-6 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3>Edit Futsal</h3>
              <button onClick={() => setEditOpen(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              <input value={editForm.futsal_name} onChange={(e) => setEditForm((prev) => ({ ...prev, futsal_name: e.target.value }))} placeholder="Futsal name" className="w-full px-3 py-2 rounded-lg border border-border" />
              <input value={editForm.location} onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Location" className="w-full px-3 py-2 rounded-lg border border-border" />
              <div className="grid grid-cols-2 gap-3">
                <input value={editForm.latitude} onChange={(e) => setEditForm((prev) => ({ ...prev, latitude: e.target.value }))} placeholder="Latitude" className="w-full px-3 py-2 rounded-lg border border-border" />
                <input value={editForm.longitude} onChange={(e) => setEditForm((prev) => ({ ...prev, longitude: e.target.value }))} placeholder="Longitude" className="w-full px-3 py-2 rounded-lg border border-border" />
              </div>
              <textarea value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} rows={4} placeholder="Description" className="w-full px-3 py-2 rounded-lg border border-border" />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => setEditOpen(false)} className="py-2.5 rounded-lg border border-border hover:bg-muted">Cancel</button>
              <button onClick={saveFutsalEdit} disabled={savingEdit} className="py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {slotEditOpen && slotEditDraft ? (
        <div className="fixed inset-0 z-[65] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Edit Time Slot</h3>
              <button onClick={() => setSlotEditOpen(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Date</label>
                <input type="date" value={slotEditDraft.slot_date} onChange={(e) => setSlotEditDraft((prev) => (prev ? { ...prev, slot_date: e.target.value } : prev))} className="w-full px-3 py-2 rounded-lg border border-border" />
              </div>
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Status</label>
                <select value={slotEditDraft.availability_status} onChange={(e) => setSlotEditDraft((prev) => (prev ? { ...prev, availability_status: e.target.value as TimeSlotItem["availability_status"] } : prev))} className="w-full px-3 py-2 rounded-lg border border-border">
                  <option value="available">Available</option>
                  <option value="booked">Booked</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Start Time</label>
                <input type="time" value={slotEditDraft.start_time} onChange={(e) => setSlotEditDraft((prev) => (prev ? { ...prev, start_time: e.target.value } : prev))} className="w-full px-3 py-2 rounded-lg border border-border" />
              </div>
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">End Time</label>
                <input type="time" value={slotEditDraft.end_time} onChange={(e) => setSlotEditDraft((prev) => (prev ? { ...prev, end_time: e.target.value } : prev))} className="w-full px-3 py-2 rounded-lg border border-border" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Price</label>
                <input value={slotEditDraft.price} onChange={(e) => setSlotEditDraft((prev) => (prev ? { ...prev, price: e.target.value } : prev))} className="w-full px-3 py-2 rounded-lg border border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={cancelSlotEdit} className="py-2.5 rounded-lg border border-border hover:bg-muted">Cancel</button>
              <button onClick={saveSlotEdit} disabled={!selectedEditableSlotId || savingSlotId === selectedEditableSlotId} className="py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                {savingSlotId === selectedEditableSlotId ? "Saving..." : "Save Slot"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedbackDialog ? (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-border p-6">
            <div className="flex items-center gap-2 mb-2">
              {feedbackDialog.variant === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <CircleX className="w-5 h-5 text-red-600" />}
              <h3>{feedbackDialog.title}</h3>
            </div>
            <p className="text-[0.875rem] text-muted-foreground mb-5">{feedbackDialog.message}</p>
            <div className="flex justify-end">
              <button onClick={() => setFeedbackDialog(null)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
