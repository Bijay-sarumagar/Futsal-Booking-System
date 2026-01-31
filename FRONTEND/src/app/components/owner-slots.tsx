import { useEffect, useMemo, useState } from "react";
import { Camera, Clock, Edit2, Save, Trash2, CheckCircle2, CircleX, AlertTriangle, Plus, X } from "lucide-react";
import { createFutsal, createSlot, deleteSlot, getMyFutsals, getSlots, updateSlot } from "../lib/api";

interface SlotConfig {
  id: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  price: number;
  availabilityStatus: "available" | "booked" | "maintenance";
}

interface SlotDialogState {
  variant: "success" | "warning" | "error";
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

const DEFAULT_AMENITIES = ["Changing Room", "Parking", "Drinking Water", "Toilet"];
const RECURRING_WEEKS_AHEAD = 52;

export function OwnerSlots() {
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [futsalOptions, setFutsalOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedFutsalId, setSelectedFutsalId] = useState<number | null>(null);
  const [viewDate, setViewDate] = useState(formatLocalDate(new Date()));
  const [editTarget, setEditTarget] = useState<SlotConfig | null>(null);
  const [editDraft, setEditDraft] = useState<{
    slotDate: string;
    startTime: string;
    endTime: string;
    price: string;
    availabilityStatus: "available" | "booked" | "maintenance";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);
  const [creatingFutsal, setCreatingFutsal] = useState(false);
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [createSlotModalOpen, setCreateSlotModalOpen] = useState(false);
  const [deletingSlot, setDeletingSlot] = useState<number | null>(null);
  const [dialogState, setDialogState] = useState<SlotDialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SlotConfig | null>(null);
  const [futsalForm, setFutsalForm] = useState({
    futsal_name: "",
    location: "",
    map_link: "",
    description: "",
    amenities: [] as string[],
    latitude: "",
    longitude: "",
    image: null as File | null,
    preferred_qr_provider: "esewa" as "esewa" | "fonepay",
    esewa_qr_image: null as File | null,
    fonepay_qr_image: null as File | null,
  });
  const [customAmenity, setCustomAmenity] = useState("");
  const [slotForm, setSlotForm] = useState({
    slot_date: formatLocalDate(new Date()),
    start_time: "18:00",
    end_time: "19:00",
    price: "1500",
  });
  const [repeatWeekly, setRepeatWeekly] = useState(true);

  const formatTimeLabel = (value: string) => {
    const [hRaw, mRaw] = value.split(":");
    const hour24 = Number(hRaw);
    const minute = Number(mRaw);
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  const normalizeTime = (value: string) => value.slice(0, 5);
  const toMinutes = (value: string) => {
    const [hRaw, mRaw] = value.split(":");
    return Number(hRaw) * 60 + Number(mRaw);
  };
  const parseLocalDate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const weekDatesFrom = (value: string) => {
    const base = parseLocalDate(value);
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return formatLocalDate(d);
    });
  };
  const recurringWeekDatesFrom = (value: string, weeksAhead: number) => {
    const baseWeek = weekDatesFrom(value);
    const sunday = parseLocalDate(baseWeek[0]);
    const allDates: string[] = [];
    for (let week = 0; week < weeksAhead; week += 1) {
      for (let day = 0; day < 7; day += 1) {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + (week * 7) + day);
        allDates.push(formatLocalDate(d));
      }
    }
    return allDates;
  };

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

  const applyCoordinatesFromLocation = async () => {
    const query = futsalForm.location.trim();
    if (!query) {
      setDialogState({
        variant: "warning",
        title: "Location required",
        message: "Enter a location name first.",
        primaryLabel: "Close",
        onPrimary: () => setDialogState(null),
      });
      return;
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${query}, Nepal`)}`);
      const data = (await response.json()) as Array<{ lat: string; lon: string }>;
      if (!data.length) {
        setDialogState({
          variant: "warning",
          title: "Location not found",
          message: "Could not find coordinates for this location. Try a more specific name.",
          primaryLabel: "Close",
          onPrimary: () => setDialogState(null),
        });
        return;
      }

      setFutsalForm((prev) => ({
        ...prev,
        latitude: Number(data[0].lat).toFixed(8),
        longitude: Number(data[0].lon).toFixed(8),
      }));
    } catch {
      setDialogState({
        variant: "error",
        title: "Lookup failed",
        message: "Unable to fetch coordinates right now. Please try again.",
        primaryLabel: "Close",
        onPrimary: () => setDialogState(null),
      });
    }
  };

  const applyCoordinatesFromMapLink = () => {
    const coords = extractCoordinatesFromMapLink(futsalForm.map_link);
    if (!coords) {
      setDialogState({
        variant: "warning",
        title: "Coordinates not found",
        message: "Could not detect latitude/longitude from this map link. You can still enter them manually.",
        primaryLabel: "Close",
        onPrimary: () => setDialogState(null),
      });
      return;
    }

    setFutsalForm((prev) => ({
      ...prev,
      latitude: coords.latitude,
      longitude: coords.longitude,
    }));
  };

  const loadSlotsForFutsal = async (futsalId: number, slotDate?: string) => {
    const slotList = await getSlots({ futsal: futsalId, slotDate });
    const mapped: SlotConfig[] = slotList.map((slot) => ({
      id: slot.id,
      slotDate: slot.slot_date,
      startTime: normalizeTime(slot.start_time),
      endTime: normalizeTime(slot.end_time),
      price: Number(slot.price),
      availabilityStatus: slot.availability_status,
    }));
    setSlots(mapped);
  };

  const loadOwnerData = async (futsalIdOverride?: number) => {
    const myFutsals = await getMyFutsals();
    setFutsalOptions(myFutsals.map((f) => ({ id: f.id, name: f.futsal_name })));

    const selectedId = futsalIdOverride || selectedFutsalId || myFutsals[0]?.id || null;
    setSelectedFutsalId(selectedId);

    if (!selectedId) {
      setSlots([]);
      return;
    }

    await loadSlotsForFutsal(selectedId, viewDate);
  };

  useEffect(() => {
    async function loadSlots() {
      try {
        setLoading(true);
        setInitialLoadFailed(false);
        await loadOwnerData();
        setInitialLoadComplete(true);
      } catch {
        setInitialLoadFailed(true);
        setSelectedFutsalId(null);
        setSlots([]);
        setDialogState({
          variant: "error",
          title: "Could not load slots",
          message: "Please refresh and try again.",
          primaryLabel: "Close",
          onPrimary: () => setDialogState(null),
        });
      } finally {
        setLoading(false);
      }
    }

    loadSlots();
  }, []);

  useEffect(() => {
    async function reloadForFutsal() {
      if (!selectedFutsalId) {
        setSlots([]);
        return;
      }
      try {
        await loadSlotsForFutsal(selectedFutsalId, viewDate);
      } catch {
        const fallbackFutsalId = futsalOptions[0]?.id;
        if (fallbackFutsalId && fallbackFutsalId !== selectedFutsalId) {
          setSelectedFutsalId(fallbackFutsalId);
          return;
        }

        setDialogState({
          variant: "error",
          title: "Could not load selected futsal slots",
          message: "Try selecting another futsal or refresh the page.",
          primaryLabel: "Close",
          onPrimary: () => setDialogState(null),
        });
      }
    }

    if (!loading && initialLoadComplete && !initialLoadFailed) {
      reloadForFutsal();
    }
  }, [selectedFutsalId, viewDate, loading, futsalOptions, initialLoadComplete, initialLoadFailed]);

  const startEdit = (slot: SlotConfig) => {
    setEditTarget(slot);
    setEditDraft({
      slotDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      price: String(slot.price),
      availabilityStatus: slot.availabilityStatus,
    });
  };

  const cancelEdit = () => {
    setEditTarget(null);
    setEditDraft(null);
  };

  const saveEdit = async (id: number) => {
    if (!editDraft) return;
    if (editDraft.startTime >= editDraft.endTime) {
      setDialogState({
        variant: "warning",
        title: "Invalid time range",
        message: "End time must be later than start time.",
        primaryLabel: "Fix Time",
        onPrimary: () => setDialogState(null),
      });
      return;
    }

    try {
      const updated = await updateSlot(id, {
        slot_date: editDraft.slotDate,
        start_time: `${editDraft.startTime}:00`,
        end_time: `${editDraft.endTime}:00`,
        price: editDraft.price,
        availability_status: editDraft.availabilityStatus,
      });
      setSlots((prev) => prev.map((s) => (
        s.id === id
          ? {
              ...s,
              slotDate: updated.slot_date,
              startTime: normalizeTime(updated.start_time),
              endTime: normalizeTime(updated.end_time),
              price: Number(updated.price),
              availabilityStatus: updated.availability_status,
            }
          : s
      )));
      setEditTarget(null);
      setEditDraft(null);
      setDialogState({
        variant: "success",
        title: "Slot updated",
        message: "Time, status, and price saved successfully.",
        primaryLabel: "Done",
        onPrimary: () => setDialogState(null),
      });
    } catch {
      setDialogState({
        variant: "error",
        title: "Could not save slot",
        message: "Please check time and values, then try again.",
        primaryLabel: "Close",
        onPrimary: () => setDialogState(null),
      });
    }
  };

  const handleCreateFutsal = async () => {
    if (!futsalForm.futsal_name.trim() || !futsalForm.location.trim()) {
      setDialogState({
        variant: "warning",
        title: "Missing details",
        message: "Futsal name and location are required.",
        primaryLabel: "Add Details",
        onPrimary: () => setDialogState(null),
      });
      return;
    }

    try {
      setCreatingFutsal(true);
      const created = await createFutsal({
        futsal_name: futsalForm.futsal_name.trim(),
        location: futsalForm.location.trim(),
        description: futsalForm.description.trim() || undefined,
        amenities: futsalForm.amenities,
        latitude: futsalForm.latitude.trim() || undefined,
        longitude: futsalForm.longitude.trim() || undefined,
        image: futsalForm.image,
        preferred_qr_provider: futsalForm.preferred_qr_provider,
        esewa_qr_image: futsalForm.esewa_qr_image,
        fonepay_qr_image: futsalForm.fonepay_qr_image,
      });
      setFutsalForm({
        futsal_name: "",
        location: "",
        map_link: "",
        description: "",
        amenities: [],
        latitude: "",
        longitude: "",
        image: null,
        preferred_qr_provider: "esewa",
        esewa_qr_image: null,
        fonepay_qr_image: null,
      });
      setCustomAmenity("");
      setRegisterModalOpen(false);
      await loadOwnerData(created.id);
      setDialogState({
        variant: "success",
        title: "Futsal registered",
        message: "Your futsal was created and sent for admin approval.",
        primaryLabel: "Great",
        onPrimary: () => setDialogState(null),
      });
    } catch (err) {
      setDialogState({
        variant: "error",
        title: "Registration failed",
        message: err instanceof Error ? err.message : "Unable to register futsal now.",
        primaryLabel: "Try Again",
        onPrimary: () => setDialogState(null),
      });
    } finally {
      setCreatingFutsal(false);
    }
  };

  const handleCreateSlot = async () => {
    if (!selectedFutsalId) {
      setDialogState({
        variant: "warning",
        title: "Select futsal first",
        message: "Choose a futsal before creating a slot.",
        primaryLabel: "Select",
        onPrimary: () => setDialogState(null),
      });
      return;
    }

    if (slotForm.start_time >= slotForm.end_time) {
      setDialogState({
        variant: "warning",
        title: "Invalid time range",
        message: "End time must be later than start time.",
        primaryLabel: "Fix Time",
        onPrimary: () => setDialogState(null),
      });
      return;
    }

    try {
      setCreatingSlot(true);

      const targetDates = repeatWeekly
        ? recurringWeekDatesFrom(slotForm.slot_date, RECURRING_WEEKS_AHEAD)
        : weekDatesFrom(slotForm.slot_date);
      const startMinutes = toMinutes(slotForm.start_time);
      const endMinutes = toMinutes(slotForm.end_time);
      const slotKey = `${slotForm.start_time}-${slotForm.end_time}`;

      const futsalSlots = await getSlots({ futsal: selectedFutsalId });
      const existingSlotKeys = new Set(
        futsalSlots.map((slot) => `${slot.slot_date}|${normalizeTime(slot.start_time)}-${normalizeTime(slot.end_time)}`),
      );

      const datesToCreate = targetDates.filter((dateValue) => !existingSlotKeys.has(`${dateValue}|${slotKey}`));

      if (!datesToCreate.length) {
        setDialogState({
          variant: "warning",
          title: "Slot already exists",
          message: "Unable to create time slot because the time slot already exists.",
          primaryLabel: "OK",
          onPrimary: () => setDialogState(null),
        });
        return;
      }

      let createdCount = 0;
      for (const dateValue of datesToCreate) {

        try {
          await createSlot({
            futsal: selectedFutsalId,
            slot_date: dateValue,
            start_time: `${slotForm.start_time}:00`,
            end_time: `${slotForm.end_time}:00`,
            price: slotForm.price,
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
        futsalId: selectedFutsalId,
        slotDate: slotForm.slot_date,
      }));

      setViewDate(slotForm.slot_date);
      await loadSlotsForFutsal(selectedFutsalId, slotForm.slot_date);
      setCreateSlotModalOpen(false);
      setDialogState({
        variant: "success",
        title: "Slot schedule saved",
        message: createdCount > 0
          ? repeatWeekly
            ? "Time slot schedule saved successfully. This slot is now applied weekly from Sunday to Saturday for upcoming weeks."
            : "Time slot schedule saved successfully for this week (Sunday to Saturday)."
          : repeatWeekly
            ? "Slot schedule is already up to date for upcoming weeks."
            : "Slot schedule is already up to date for this week.",
        primaryLabel: "Done",
        onPrimary: () => setDialogState(null),
      });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Please try again.";
      const isDuplicateSlot = rawMessage.toLowerCase().includes("must make a unique set")
        || rawMessage.toLowerCase().includes("unique")
        || rawMessage.toLowerCase().includes("already exists");

      setDialogState({
        variant: "error",
        title: "Could not create slot",
        message: isDuplicateSlot
          ? "Unable to create time slot because the time slot already exists."
          : rawMessage,
        primaryLabel: "Try Again",
        onPrimary: () => setDialogState(null),
      });
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: number) => {
    try {
      setDeletingSlot(slotId);
      await deleteSlot(slotId);
      setSlots((prev) => prev.filter((slot) => slot.id !== slotId));
      setDeleteTarget(null);
      setDialogState({
        variant: "success",
        title: "Slot deleted",
        message: "The slot has been removed successfully.",
        primaryLabel: "Done",
        onPrimary: () => setDialogState(null),
      });
    } catch {
      setDialogState({
        variant: "error",
        title: "Delete failed",
        message: "Unable to delete this slot right now.",
        primaryLabel: "Close",
        onPrimary: () => setDialogState(null),
      });
    } finally {
      setDeletingSlot(null);
    }
  };

  const avgPrice = useMemo(() => {
    if (!slots.length) return 0;
    return Math.round(slots.reduce((total, slot) => total + slot.price, 0) / slots.length);
  }, [slots]);

  const peakPrice = useMemo(() => {
    if (!slots.length) return 0;
    return Math.max(...slots.map((slot) => slot.price));
  }, [slots]);

  const toggleAmenity = (amenity: string) => {
    setFutsalForm((prev) => {
      const exists = prev.amenities.some((a) => a.toLowerCase() === amenity.toLowerCase());
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a.toLowerCase() !== amenity.toLowerCase())
          : [...prev.amenities, amenity],
      };
    });
  };

  const addCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (!trimmed) return;
    setFutsalForm((prev) => {
      const exists = prev.amenities.some((a) => a.toLowerCase() === trimmed.toLowerCase());
      return exists ? prev : { ...prev, amenities: [...prev.amenities, trimmed] };
    });
    setCustomAmenity("");
  };

  return (
    <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Manage Slots & Pricing</h1>
          <p className="text-muted-foreground">Configure time slots, date-wise view, and pricing for your court</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <p className="text-[0.95rem]" style={{ fontWeight: 600 }}>Slot Actions</p>
            <p className="text-[0.75rem] text-muted-foreground">Manage futsal registration and slot creation from here.</p>
          </div>
          <div className="sm:ml-auto flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setRegisterModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              Register Futsal
            </button>
            <button
              type="button"
              onClick={() => setCreateSlotModalOpen(true)}
              className="px-4 py-2 rounded-lg border border-border hover:bg-muted"
            >
              Create Time Slot
            </button>
          </div>
        </div>
      </div>

      {registerModalOpen ? (
        <div className="fixed inset-0 z-[52] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-3xl border border-border p-6 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3>Register Your Futsal</h3>
              <button onClick={() => setRegisterModalOpen(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={futsalForm.futsal_name}
                onChange={(e) => setFutsalForm((prev) => ({ ...prev, futsal_name: e.target.value }))}
                placeholder="Futsal name"
                className="px-3 py-2 rounded-lg border border-border"
              />
              <input
                value={futsalForm.location}
                onChange={(e) => setFutsalForm((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Location"
                className="px-3 py-2 rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={applyCoordinatesFromLocation}
                className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-[0.875rem]"
              >
                Use Location
              </button>
              <div className="sm:col-span-2 flex gap-2">
                <input
                  value={futsalForm.map_link}
                  onChange={(e) => setFutsalForm((prev) => ({ ...prev, map_link: e.target.value }))}
                  placeholder="Google Maps link (optional)"
                  className="flex-1 px-3 py-2 rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={applyCoordinatesFromMapLink}
                  className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-[0.875rem]"
                >
                  Use Link
                </button>
              </div>
              <input
                value={futsalForm.latitude}
                onChange={(e) => setFutsalForm((prev) => ({ ...prev, latitude: e.target.value }))}
                placeholder="Latitude (optional)"
                className="px-3 py-2 rounded-lg border border-border"
              />
              <input
                value={futsalForm.longitude}
                onChange={(e) => setFutsalForm((prev) => ({ ...prev, longitude: e.target.value }))}
                placeholder="Longitude (optional)"
                className="px-3 py-2 rounded-lg border border-border"
              />
              <textarea
                value={futsalForm.description}
                onChange={(e) => setFutsalForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description"
                rows={3}
                className="sm:col-span-2 px-3 py-2 rounded-lg border border-border"
              />
              <div className="sm:col-span-2">
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Picture</label>
                <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted cursor-pointer text-[0.875rem]">
                  <Camera className="w-4 h-4" /> Add Picture
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFutsalForm((prev) => ({ ...prev, image: e.target.files?.[0] || null }))}
                    className="hidden"
                  />
                </label>
                {futsalForm.image ? (
                  <p className="text-[0.75rem] text-muted-foreground mt-1">Selected: {futsalForm.image.name}</p>
                ) : null}
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">Preferred QR Provider</label>
                  <select
                    value={futsalForm.preferred_qr_provider}
                    onChange={(e) => setFutsalForm((prev) => ({ ...prev, preferred_qr_provider: e.target.value as "esewa" | "fonepay" }))}
                    className="w-full px-3 py-2 rounded-lg border border-border"
                  >
                    <option value="esewa">eSewa</option>
                    <option value="fonepay">Fonepay</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">eSewa QR Image</label>
                  <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted cursor-pointer text-[0.8125rem]">
                    <Camera className="w-4 h-4" /> Upload eSewa QR
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFutsalForm((prev) => ({ ...prev, esewa_qr_image: e.target.files?.[0] || null }))}
                      className="hidden"
                    />
                  </label>
                  {futsalForm.esewa_qr_image ? (
                    <p className="text-[0.75rem] text-muted-foreground mt-1">Selected: {futsalForm.esewa_qr_image.name}</p>
                  ) : null}
                </div>

                <div>
                  <label className="block text-[0.75rem] text-muted-foreground mb-1">Fonepay QR Image</label>
                  <label className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted cursor-pointer text-[0.8125rem]">
                    <Camera className="w-4 h-4" /> Upload Fonepay QR
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFutsalForm((prev) => ({ ...prev, fonepay_qr_image: e.target.files?.[0] || null }))}
                      className="hidden"
                    />
                  </label>
                  {futsalForm.fonepay_qr_image ? (
                    <p className="text-[0.75rem] text-muted-foreground mt-1">Selected: {futsalForm.fonepay_qr_image.name}</p>
                  ) : null}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_AMENITIES.map((amenity) => {
                    const selected = futsalForm.amenities.some((a) => a.toLowerCase() === amenity.toLowerCase());
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-3 py-1.5 rounded-full text-[0.8125rem] border ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
                      >
                        {amenity}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    placeholder="Add custom amenity"
                    className="flex-1 px-3 py-2 rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={addCustomAmenity}
                    className="px-3 py-2 rounded-lg border border-border hover:bg-muted inline-flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>

                {futsalForm.amenities.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {futsalForm.amenities.map((amenity) => (
                      <span key={amenity} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[0.75rem]">
                        {amenity}
                        <button type="button" onClick={() => toggleAmenity(amenity)} className="hover:text-primary">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => setRegisterModalOpen(false)} className="py-2.5 rounded-lg border border-border hover:bg-muted">Cancel</button>
              <button
                onClick={handleCreateFutsal}
                disabled={creatingFutsal}
                className="py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {creatingFutsal ? "Registering..." : "Register Futsal"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createSlotModalOpen ? (
        <div className="fixed inset-0 z-[53] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Create Time Slot</h3>
              <button onClick={() => setCreateSlotModalOpen(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={selectedFutsalId ?? ""}
                onChange={(e) => setSelectedFutsalId(Number(e.target.value) || null)}
                className="sm:col-span-2 px-3 py-2 rounded-lg border border-border"
              >
                <option value="">Select futsal</option>
                {futsalOptions.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Date:</label>
                <input
                  type="date"
                  value={slotForm.slot_date}
                  onChange={(e) => setSlotForm((prev) => ({ ...prev, slot_date: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Price:</label>
                <div className="flex items-center rounded-lg border border-border overflow-hidden">
                  <span className="px-3 py-2 bg-muted text-[0.8125rem] text-muted-foreground">Rs</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={slotForm.price}
                    onChange={(e) => setSlotForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="Price"
                    className="w-full px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Time: Start</label>
                <input
                  type="time"
                  value={slotForm.start_time}
                  onChange={(e) => setSlotForm((prev) => ({ ...prev, start_time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Time: End</label>
                <input
                  type="time"
                  value={slotForm.end_time}
                  onChange={(e) => setSlotForm((prev) => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Schedule Mode</label>
                <div className="inline-flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setRepeatWeekly(true)}
                    className={`px-3 py-2 text-[0.8125rem] ${repeatWeekly ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                  >
                    Repeat Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatWeekly(false)}
                    className={`px-3 py-2 text-[0.8125rem] border-l border-border ${!repeatWeekly ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                  >
                    This Week Only
                  </button>
                </div>
                <p className="text-[0.75rem] text-muted-foreground mt-1">
                  {repeatWeekly
                    ? "Applies this slot for all upcoming weeks (Sunday-Saturday)."
                    : "Applies this slot only for the current week (Sunday-Saturday)."}
                </p>
              </div>
            </div>
            <p className="text-[0.75rem] text-muted-foreground mt-2">
              Selected time: {formatTimeLabel(slotForm.start_time)} - {formatTimeLabel(slotForm.end_time)}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={() => setCreateSlotModalOpen(false)} className="py-2.5 rounded-lg border border-border hover:bg-muted">Cancel</button>
              <button
                onClick={handleCreateSlot}
                disabled={creatingSlot}
                className="py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {creatingSlot ? "Creating..." : "Create Slot"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl shadow-sm p-4">
          <p className="text-[0.8125rem] text-muted-foreground">Active Slots</p>
          <p className="text-[1.5rem]" style={{ fontWeight: 700 }}>{slots.filter((s) => s.availabilityStatus === "available").length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-sm p-4">
          <p className="text-[0.8125rem] text-muted-foreground">Avg Price</p>
          <p className="text-[1.5rem]" style={{ fontWeight: 700 }}>Rs. {avgPrice}</p>
        </div>
        <div className="bg-card border border-border rounded-xl shadow-sm p-4">
          <p className="text-[0.8125rem] text-muted-foreground">Peak Price</p>
          <p className="text-[1.5rem]" style={{ fontWeight: 700 }}>Rs. {peakPrice}</p>
        </div>
      </div>

      {/* Slots Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-[0.95rem]">All Slots</h3>
            <p className="text-[0.75rem] text-muted-foreground">Showing slots for {viewDate}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="inline-flex items-center gap-2">
              <label className="text-[0.8125rem] text-muted-foreground">Futsal</label>
              <select
                value={selectedFutsalId ?? ""}
                onChange={(e) => setSelectedFutsalId(Number(e.target.value) || null)}
                className="px-2.5 py-1.5 rounded-lg border border-border text-[0.875rem] min-w-[180px]"
              >
                <option value="">Select futsal</option>
                {futsalOptions.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="inline-flex items-center gap-2">
            <label className="text-[0.8125rem] text-muted-foreground">View date</label>
            <input
              type="date"
              value={viewDate}
              onChange={(e) => setViewDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-border text-[0.875rem]"
            />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-border text-[0.8125rem] text-muted-foreground">
                <th className="text-left px-4 py-3 font-[500]">Time Slot</th>
                <th className="text-left px-4 py-3 font-[500]">Regular Price (Rs.)</th>
                <th className="text-left px-4 py-3 font-[500]">Status</th>
                <th className="text-left px-4 py-3 font-[500]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">Loading slots...</td>
                </tr>
              ) : null}
              {slots.map((s) => (
                <tr key={s.id} className={`border-b border-border last:border-0 text-[0.875rem] ${s.availabilityStatus !== "available" ? "opacity-70" : ""}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" /> {formatTimeLabel(s.startTime)} - {formatTimeLabel(s.endTime)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span>{s.price}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-[0.75rem] capitalize ${
                      s.availabilityStatus === "available"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : s.availabilityStatus === "booked"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {s.availabilityStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(s)} className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-[0.75rem]">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200 text-[0.75rem]"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && slots.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No slots found for this futsal on {viewDate}.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3>Delete Slot</h3>
              <button onClick={() => setDeleteTarget(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[0.875rem] text-muted-foreground mb-4">Are you sure you want to delete this slot?</p>
            <div className="rounded-lg bg-gray-50 p-3 mb-5 text-[0.875rem]">
              <p><span style={{ fontWeight: 600 }}>Date:</span> {deleteTarget.slotDate}</p>
              <p><span style={{ fontWeight: 600 }}>Time:</span> {formatTimeLabel(deleteTarget.startTime)} - {formatTimeLabel(deleteTarget.endTime)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeleteTarget(null)} className="py-2.5 border border-border rounded-lg hover:bg-muted">Keep Slot</button>
              <button
                onClick={() => handleDeleteSlot(deleteTarget.id)}
                disabled={deletingSlot === deleteTarget.id}
                className="py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deletingSlot === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget && editDraft ? (
        <div className="fixed inset-0 z-[55] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-xl p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3>Edit Slot</h3>
              <button onClick={cancelEdit} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={editDraft.slotDate}
                  onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, slotDate: e.target.value } : prev))}
                  className="w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Status</label>
                <select
                  value={editDraft.availabilityStatus}
                  onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, availabilityStatus: e.target.value as SlotConfig["availabilityStatus"] } : prev))}
                  className="w-full px-3 py-2 rounded-lg border border-border"
                >
                  <option value="available">Available</option>
                  <option value="booked">Booked</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Start Time</label>
                <input
                  type="time"
                  value={editDraft.startTime}
                  onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, startTime: e.target.value } : prev))}
                  className="w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>
              <div>
                <label className="block text-[0.75rem] text-muted-foreground mb-1">End Time</label>
                <input
                  type="time"
                  value={editDraft.endTime}
                  onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, endTime: e.target.value } : prev))}
                  className="w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[0.75rem] text-muted-foreground mb-1">Price</label>
                <div className="flex items-center rounded-lg border border-border overflow-hidden">
                  <span className="px-3 py-2 bg-muted text-[0.8125rem] text-muted-foreground">Rs</span>
                  <input
                    type="number"
                    step={100}
                    value={editDraft.price}
                    onChange={(e) => setEditDraft((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                    className="w-full px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <p className="text-[0.75rem] text-muted-foreground mt-3">
              Preview: {formatTimeLabel(editDraft.startTime)} - {formatTimeLabel(editDraft.endTime)}
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button onClick={cancelEdit} className="py-2.5 border border-border rounded-lg hover:bg-muted">Cancel</button>
              <button onClick={() => saveEdit(editTarget.id)} className="py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save Slot
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {dialogState ? (
        <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {dialogState.variant === "success" ? <CheckCircle2 className="w-5 h-5 text-primary" /> : null}
                {dialogState.variant === "warning" ? <AlertTriangle className="w-5 h-5 text-amber-600" /> : null}
                {dialogState.variant === "error" ? <CircleX className="w-5 h-5 text-red-600" /> : null}
                <h3>{dialogState.title}</h3>
              </div>
              <button onClick={() => setDialogState(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[0.875rem] text-muted-foreground mb-6">{dialogState.message}</p>
            <div className="flex justify-end gap-2">
              {dialogState.secondaryLabel && dialogState.onSecondary ? (
                <button onClick={dialogState.onSecondary} className="px-4 py-2 rounded-lg border border-border hover:bg-muted text-[0.875rem]">
                  {dialogState.secondaryLabel}
                </button>
              ) : null}
              <button
                onClick={dialogState.onPrimary}
                className={`px-4 py-2 rounded-lg text-[0.875rem] font-medium ${dialogState.variant === "success" ? "bg-primary text-primary-foreground hover:opacity-90" : dialogState.variant === "warning" ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-destructive text-destructive-foreground hover:opacity-90"}`}
              >
                {dialogState.primaryLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
