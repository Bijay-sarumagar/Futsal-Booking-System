import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, CircleX, Clock3, MapPin, Pencil, Trash2, X } from "lucide-react";
import { createSlot, deleteFutsal, getFutsalById, getSlots, updateFutsal, updateSlot, type FutsalItem, type TimeSlotItem } from "../lib/api";
import { futsalImages } from "./data";

interface FeedbackDialog {
  variant: "success" | "error";
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
}

const RECURRING_WEEKS_AHEAD = 52;

export function OwnerFutsalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
        if (parsed.slotDate < today) return today;
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
  const [timelineAutoRepeatWeekly, setTimelineAutoRepeatWeekly] = useState(true);
  const [creatingTimelineSlotKey, setCreatingTimelineSlotKey] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingSlotId, setSavingSlotId] = useState<number | null>(null);
  const [deletingFutsal, setDeletingFutsal] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState<FeedbackDialog | null>(null);
  const [imageUpload, setImageUpload] = useState<File | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
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
    map_link: "",
    latitude: "",
    longitude: "",
    preferred_qr_provider: "esewa" as "esewa" | "fonepay",
  });
  const [qrUploads, setQrUploads] = useState({
    esewa_qr_image: null as File | null,
    fonepay_qr_image: null as File | null,
  });

  const extractCoordinatesFromMapLink = (value: string): { latitude: string; longitude: string } | null => {
    if (!value.trim()) return null;

    const plainCoordMatch = value.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (plainCoordMatch) {
      return {
        latitude: Number(plainCoordMatch[1]).toFixed(8),
        longitude: Number(plainCoordMatch[2]).toFixed(8),
      };
    }

    const patterns: RegExp[] = [
      /@(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&]query=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
      /!8m2!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (!match) continue;
      return {
        latitude: Number(match[1]).toFixed(8),
        longitude: Number(match[2]).toFixed(8),
      };
    }

    return null;
  };

  const applyCoordinatesFromMapLink = () => {
    const coords = extractCoordinatesFromMapLink(editForm.map_link);
    if (!coords) {
      setFeedbackDialog({
        variant: "error",
        title: "Coordinates not found",
        message: "Could not detect latitude/longitude from this map link.",
      });
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }));
    setFeedbackDialog({
      variant: "success",
      title: "Coordinates applied",
      message: "Latitude and longitude were filled from the map link.",
    });
  };

  const normalizeTime = (value: string) => value.slice(0, 5);
  const toMinutes = (value: string) => {
    const [hRaw, mRaw] = value.split(":");
    return Number(hRaw) * 60 + Number(mRaw);
  };
  const recurringDatesFrom = (value: string, weeksAhead: number) => {
    const base = parseLocalDate(value);
    return Array.from({ length: weeksAhead }, (_, week) => {
      const d = new Date(base);
      d.setDate(base.getDate() + (week * 7));
      return formatLocalDate(d);
    });
  };
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
          map_link: "",
          latitude: futsalData.latitude ? String(futsalData.latitude) : "",
          longitude: futsalData.longitude ? String(futsalData.longitude) : "",
          preferred_qr_provider: futsalData.preferred_qr_provider || "esewa",
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
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return {
        value: formatLocalDate(d),
        label: d.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" }),
      };
    });
  }, []);

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
      const isPastDay = selectedDate < today;
      const slotEndDateTime = new Date(`${selectedDate}T${end}:00`);
      const isPast = isPastDay || (isToday && slotEndDateTime <= now);
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

  const addTimelineSlot = async (startTime: string, endTime: string) => {
    if (!Number.isFinite(futsalId)) return;

    if (toMinutes(startTime) >= toMinutes(endTime)) {
      setFeedbackDialog({
        variant: "error",
        title: "Invalid time range",
        message: "End time must be later than start time.",
      });
      return;
    }

    const slotKey = `${startTime}-${endTime}`;
    try {
      setCreatingTimelineSlotKey(slotKey);

      const futsalSlots = await getSlots({ futsal: futsalId });
      const existingSlotKeys = new Set(
        futsalSlots.map((slot) => `${slot.slot_date}|${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`),
      );

      const targetDates = timelineAutoRepeatWeekly
        ? recurringDatesFrom(selectedDate, RECURRING_WEEKS_AHEAD)
        : [selectedDate];
      const datesToCreate = targetDates.filter((dateValue) => !existingSlotKeys.has(`${dateValue}|${slotKey}`));

      if (!datesToCreate.length) {
        setFeedbackDialog({
          variant: "error",
          title: "Slot already exists",
          message: "This time slot is already present for the selected schedule.",
        });
        return;
      }

      const sameTimeReference = futsalSlots.find(
        (slot) => normalizeTime(slot.start_time) === startTime && normalizeTime(slot.end_time) === endTime,
      );
      const fallbackPrice = sameTimeReference?.price
        || slots.find((slot) => slot.availability_status === "available")?.price
        || "1500";

      let createdCount = 0;
      for (const dateValue of datesToCreate) {
        try {
          await createSlot({
            futsal: futsalId,
            slot_date: dateValue,
            start_time: `${startTime}:00`,
            end_time: `${endTime}:00`,
            price: String(fallbackPrice),
          });
          createdCount += 1;
        } catch (createErr) {
          const msg = createErr instanceof Error ? createErr.message.toLowerCase() : "";
          if (msg.includes("unique") || msg.includes("already exists")) {
            continue;
          }
          throw createErr;
        }
      }

      localStorage.setItem("futsalhub.owner.lastCreatedSlot", JSON.stringify({
        futsalId,
        slotDate: selectedDate,
      }));

      const slotData = await getSlots({ futsal: futsalId, slotDate: selectedDate });
      setSlots(slotData);

      setFeedbackDialog({
        variant: "success",
        title: "Slot added",
        message: createdCount > 0
          ? timelineAutoRepeatWeekly
            ? "Slot created and repeated weekly for upcoming weeks."
            : "Slot created for the selected date."
          : "Slot schedule is already up to date.",
      });
    } catch (err) {
      setFeedbackDialog({
        variant: "error",
        title: "Could not add slot",
        message: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setCreatingTimelineSlotKey(null);
    }
  };

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
        preferred_qr_provider: editForm.preferred_qr_provider,
        image: imageUpload,
        esewa_qr_image: qrUploads.esewa_qr_image,
        fonepay_qr_image: qrUploads.fonepay_qr_image,
      });

      setFutsal(updated);
      setEditForm({
        futsal_name: updated.futsal_name,
        location: updated.location,
        description: updated.description || "",
        map_link: "",
        latitude: updated.latitude ? String(updated.latitude) : "",
        longitude: updated.longitude ? String(updated.longitude) : "",
        preferred_qr_provider: updated.preferred_qr_provider || "esewa",
      });
      setQrUploads({ esewa_qr_image: null, fonepay_qr_image: null });
      setImageUpload(null);
      setEditOpen(false);
      setFeedbackDialog({
        variant: "success",
        title: "Futsal updated",
        message: "Your futsal details were updated successfully.",
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

  const deleteFutsalNow = async () => {
    if (!futsal) return;
    setDeletingFutsal(true);

    try {
      await deleteFutsal(futsal.id);
      setDeleteConfirmOpen(false);
      setFeedbackDialog({
        variant: "success",
        title: "Futsal deleted",
        message: "Futsal deleted successfully.",
        primaryLabel: "Done",
        onPrimary: () => {
          setFeedbackDialog(null);
          navigate("/owner/futsals");
        },
      });
    } catch (err) {
      setFeedbackDialog({
        variant: "error",
        title: "Deletion failed",
        message: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDeletingFutsal(false);
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
    return <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 text-sm text-muted-foreground">Loading futsal details…</div>;
  }

  if (!futsal) {
    return <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 text-sm text-muted-foreground">Futsal not found.</div>;
  }

  const heroImage = futsal.image || futsalImages[futsal.id % futsalImages.length];
  const amenityList = futsal.amenities?.length ? futsal.amenities : ["Changing Room", "Parking", "Drinking Water", "Toilet"];

  return (
    <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
      <Link
        to="/owner/futsals"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" /> Back to my futsals
      </Link>

      <div className="rounded-xl overflow-hidden h-72 md:h-96 relative">
        <img src={heroImage} alt={futsal.futsal_name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <span className="px-3 py-1.5 bg-card/95 backdrop-blur-sm rounded-full text-xs font-semibold text-foreground border border-border/50 shadow-sm">
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
                <span key={a} className="px-3 py-1.5 rounded-lg border border-border bg-card text-sm text-foreground shadow-sm">
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
                  className={`px-4 py-2 min-h-10 rounded-lg text-sm whitespace-nowrap border transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selectedDate === d.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted bg-card"
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
                    if (s.source) {
                      setSelectedSlotDetail(s.source);
                      return;
                    }
                    if (!s.isPast) {
                      const [start, end] = s.key.split("-");
                      void addTimelineSlot(start, end);
                    }
                  }}
                  disabled={(!s.source && s.isPast) || creatingTimelineSlotKey === s.key}
                  className={`p-3 rounded-lg border text-sm text-left transition-colors ${
                    !s.source
                      ? s.isPast
                        ? "bg-muted/40 text-muted-foreground border-border cursor-default"
                        : "border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 hover:border-primary/40"
                      : s.isAvailable
                        ? "border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 hover:border-primary/40"
                        : s.isPast
                          ? "bg-muted/60 text-muted-foreground border-border cursor-default"
                          : "bg-destructive/5 text-destructive border-destructive/20 cursor-pointer hover:bg-destructive/10"
                  }`}
                >
                  <div className="font-medium">{s.startLabel} - {s.endLabel}</div>
                  <div
                    className={`text-xs mt-0.5 ${s.isAvailable ? "text-muted-foreground" : s.isPast ? "text-muted-foreground" : "text-destructive"}`}
                  >
                    {s.source
                      ? (s.isPast ? "Time Passed" : `Rs. ${s.source.price}`)
                      : s.isPast
                        ? "Unavailable"
                        : creatingTimelineSlotKey === s.key
                          ? "Adding..."
                          : "Add Slot"}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[0.75rem] text-muted-foreground mt-2">Click an empty slot to add it quickly, or click an existing slot to view/edit details.</p>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-card border-2 border-primary/15 rounded-xl p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold">Manage This Futsal</h3>

            <button
              type="button"
              onClick={() => {
                setImageUpload(null);
                setEditOpen(true);
              }}
              className="w-full py-3 min-h-11 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Pencil className="w-4 h-4" /> Edit Futsal
            </button>

            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="w-full mt-3 py-3 min-h-11 border border-destructive text-destructive rounded-xl hover:bg-destructive/5 transition-all inline-flex items-center justify-center gap-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2"
            >
              <Trash2 className="w-4 h-4" /> Delete Futsal
            </button>

            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="mb-2">Selected Time Slot</h4>
              {selectedSlotDetail ? (
                <div className="space-y-1 text-[0.8125rem] text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">Date:</span> {selectedSlotDetail.slot_date}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Time:</span> {formatTimeLabel(selectedSlotDetail.start_time)} -{" "}
                    {formatTimeLabel(selectedSlotDetail.end_time)}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Price:</span> Rs. {selectedSlotDetail.price}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Status:</span>{" "}
                    {isSlotPast(selectedSlotDetail.slot_date, selectedSlotDetail.end_time)
                      ? "Time Passed"
                      : formatAvailability(selectedSlotDetail.availability_status)}
                  </p>
                  {!isSlotPast(selectedSlotDetail.slot_date, selectedSlotDetail.end_time) ? (
                    <button
                      type="button"
                      onClick={() => openSlotEditor(selectedSlotDetail)}
                      className="mt-3 w-full py-2.5 min-h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
              <label className="inline-flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={timelineAutoRepeatWeekly}
                  onChange={(e) => setTimelineAutoRepeatWeekly(e.target.checked)}
                  className="rounded border-border"
                />
                Auto-repeat weekly when adding from timeline
              </label>
              <div className="pt-2">
                {futsal.approval_status === "approved" ? (
                  <p className="inline-flex items-center gap-1.5 text-primary font-semibold">
                    <CheckCircle2 className="w-4 h-4" /> Approved
                  </p>
                ) : futsal.approval_status === "rejected" ? (
                  <p className="inline-flex items-center gap-1.5 text-destructive font-semibold">
                    <CircleX className="w-4 h-4" /> Denied
                  </p>
                ) : (
                  <p className="inline-flex items-center gap-1.5 text-amber-800 font-semibold">
                    <Clock3 className="w-4 h-4" /> Pending
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {editOpen ? (
        <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-3xl border border-border p-6 max-h-[88vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold">Edit Futsal</h3>
              <button type="button" onClick={() => setEditOpen(false)} className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                value={editForm.futsal_name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, futsal_name: e.target.value }))}
                placeholder="Futsal name"
                className="w-full px-3 py-2.5 min-h-11 rounded-lg border border-border bg-input-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <input
                value={editForm.location}
                onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Location"
                className="w-full px-3 py-2.5 min-h-11 rounded-lg border border-border bg-input-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <div className="flex gap-2">
                <input
                  value={editForm.map_link}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, map_link: e.target.value }))}
                  placeholder="Google Maps link (optional)"
                  className="w-full px-3 py-2.5 min-h-11 rounded-lg border border-border bg-input-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <button
                  type="button"
                  onClick={applyCoordinatesFromMapLink}
                  className="px-3 py-2.5 min-h-11 rounded-lg border border-border hover:bg-muted text-sm font-medium"
                >
                  Use Link
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={editForm.latitude}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, latitude: e.target.value }))}
                  placeholder="Latitude"
                  className="w-full px-3 py-2.5 min-h-11 rounded-lg border border-border bg-input-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <input
                  value={editForm.longitude}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, longitude: e.target.value }))}
                  placeholder="Longitude"
                  className="w-full px-3 py-2.5 min-h-11 rounded-lg border border-border bg-input-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={4}
                placeholder="Description"
                className="w-full px-3 py-2 rounded-lg border border-border bg-input-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">Futsal Image</label>
                  <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:bg-muted cursor-pointer text-[0.8125rem]">
                    Upload Futsal Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageUpload(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                  {imageUpload ? (
                    <p className="text-[0.75rem] text-muted-foreground mt-1">Selected: {imageUpload.name}</p>
                  ) : futsal.image ? (
                    <p className="text-[0.75rem] text-muted-foreground mt-1">Current image is already set.</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">Preferred QR Provider</label>
                  <select
                    value={editForm.preferred_qr_provider}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, preferred_qr_provider: e.target.value as "esewa" | "fonepay" }))}
                    className="w-full px-3 py-2.5 min-h-11 rounded-lg border border-border bg-input-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="esewa">eSewa</option>
                    <option value="fonepay">Fonepay</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">eSewa QR</label>
                  <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:bg-muted cursor-pointer text-[0.8125rem]">
                    Upload eSewa QR
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setQrUploads((prev) => ({ ...prev, esewa_qr_image: e.target.files?.[0] || null }))}
                      className="hidden"
                    />
                  </label>
                  {qrUploads.esewa_qr_image ? (
                    <p className="text-[0.75rem] text-muted-foreground mt-1">Selected: {qrUploads.esewa_qr_image.name}</p>
                  ) : futsal.esewa_qr_image ? (
                    <p className="text-[0.75rem] text-muted-foreground mt-1">Current QR is set.</p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">Fonepay QR</label>
                  <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-border hover:bg-muted cursor-pointer text-[0.8125rem]">
                    Upload Fonepay QR
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setQrUploads((prev) => ({ ...prev, fonepay_qr_image: e.target.files?.[0] || null }))}
                      className="hidden"
                    />
                  </label>
                  {qrUploads.fonepay_qr_image ? (
                    <p className="text-[0.75rem] text-muted-foreground mt-1">Selected: {qrUploads.fonepay_qr_image.name}</p>
                  ) : futsal.fonepay_qr_image ? (
                    <p className="text-[0.75rem] text-muted-foreground mt-1">Current QR is set.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button type="button" onClick={() => setEditOpen(false)} className="py-2.5 min-h-11 rounded-lg border border-border hover:bg-muted text-sm font-medium">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveFutsalEdit}
                disabled={savingEdit}
                className="py-2.5 min-h-11 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {savingEdit ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {slotEditOpen && slotEditDraft ? (
        <div className="fixed inset-0 z-[65] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-xl border border-border p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold">Edit Time Slot</h3>
              <button type="button" onClick={() => setSlotEditOpen(false)} className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="w-4 h-4" />
              </button>
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
              <button type="button" onClick={cancelSlotEdit} className="py-2.5 min-h-11 rounded-lg border border-border hover:bg-muted text-sm font-medium">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSlotEdit}
                disabled={!selectedEditableSlotId || savingSlotId === selectedEditableSlotId}
                className="py-2.5 min-h-11 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {savingSlotId === selectedEditableSlotId ? "Saving…" : "Save Slot"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md border border-border p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <CircleX className="w-5 h-5 text-destructive shrink-0" />
              <h3 className="text-base font-semibold">Delete Futsal</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Deleting this futsal will remove it permanently from your account. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2.5 min-h-11 rounded-lg border border-border hover:bg-muted text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteFutsalNow}
                disabled={deletingFutsal}
                className="px-4 py-2.5 min-h-11 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-60 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50 focus-visible:ring-offset-2"
              >
                {deletingFutsal ? "Deleting…" : "Delete Futsal"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {feedbackDialog ? (
        <div className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md border border-border p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              {feedbackDialog.variant === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              ) : (
                <CircleX className="w-5 h-5 text-destructive shrink-0" />
              )}
              <h3 className="text-base font-semibold">{feedbackDialog.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{feedbackDialog.message}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (feedbackDialog.onPrimary) {
                    feedbackDialog.onPrimary();
                    return;
                  }
                  setFeedbackDialog(null);
                }}
                className="px-4 py-2.5 min-h-11 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {feedbackDialog.primaryLabel || "Close"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
