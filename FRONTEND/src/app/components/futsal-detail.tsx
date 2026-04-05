import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { MapPin, Clock, ArrowLeft, X, Phone, Share2, Heart, MessageSquare, CheckCircle2, AlertTriangle, CircleX } from "lucide-react";
import { createBooking, createReview, getFutsalById, getReviews, getSlots, type FutsalItem, type ReviewItem, type TimeSlotItem } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../auth/auth-context";

interface BookingFeedbackDialog {
  variant: "success" | "warning" | "error";
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export function FutsalDetail() {
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

  const [futsal, setFutsal] = useState<FutsalItem | null>(null);
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()));
  const [slots, setSlots] = useState<TimeSlotItem[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState<BookingFeedbackDialog | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const normalizeTime = (value: string) => value.slice(0, 5);
  const formatTimeLabel = (value: string) => {
    const [hRaw, mRaw] = value.split(":");
    const hour24 = Number(hRaw);
    const minute = Number(mRaw);
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  useEffect(() => {
    async function loadFutsalData() {
      if (!Number.isFinite(futsalId)) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const futsalData = await getFutsalById(futsalId);
        setFutsal(futsalData);
      } catch {
        toast.error("Failed to load futsal details");
      } finally {
        setLoading(false);
      }
    }

    loadFutsalData();
  }, [futsalId]);

  useEffect(() => {
    async function loadSlots() {
      if (!Number.isFinite(futsalId)) {
        return;
      }

      try {
        const slotData = await getSlots({ futsal: futsalId, slotDate: selectedDate });
        setSlots(slotData);
      } catch {
        toast.error("Failed to load slots");
      }
    }

    loadSlots();
  }, [futsalId, selectedDate]);

  useEffect(() => {
    async function loadReviews() {
      if (!Number.isFinite(futsalId)) {
        return;
      }

      try {
        const reviewData = await getReviews({ futsal: futsalId });
        setReviews(reviewData);
      } catch {
        toast.error("Failed to load reviews");
      }
    }

    loadReviews();
  }, [futsalId]);

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

  const selectedSlotItem = slots.find((slot) => slot.id === selectedSlot) || null;
  const averageRating = reviews.length
    ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

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
        start,
        end,
        startLabel: formatTimeLabel(start),
        endLabel: formatTimeLabel(end),
        source,
        isAvailable,
        isPast,
      };
    });
  }, [slots, selectedDate]);

  const selectedTimelineSlot = timelineSlots.find((slot) => slot.source?.id === selectedSlot) || null;

  const handleBook = async () => {
    if (!selectedSlot) {
      setBookingFeedback({
        variant: "warning",
        title: "Select a time first",
        message: "Choose an available slot to continue booking.",
        primaryLabel: "Choose Time",
        onPrimary: () => setBookingFeedback(null),
      });
      return;
    }

    try {
      await createBooking(selectedSlot);
      setShowBookingModal(false);
      setSelectedSlot(null);
      const slotData = await getSlots({ futsal: futsalId, slotDate: selectedDate });
      setSlots(slotData);
      setBookingFeedback({
        variant: "success",
        title: "Booking confirmed",
        message: "Your futsal slot is reserved successfully.",
        primaryLabel: "View Booking",
        secondaryLabel: "Book Another",
        onPrimary: () => {
          setBookingFeedback(null);
          navigate("/my-bookings");
        },
        onSecondary: () => setBookingFeedback(null),
      });
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : "Could not complete booking";
      const lower = rawMessage.toLowerCase();
      const isUnavailable = lower.includes("unavailable") || lower.includes("already been booked") || lower.includes("already booked");

      setBookingFeedback({
        variant: isUnavailable ? "warning" : "error",
        title: isUnavailable ? "Slot unavailable" : "Booking failed",
        message: isUnavailable ? "That slot was just booked. Please choose another time." : "Something went wrong. Please try booking again.",
        primaryLabel: isUnavailable ? "Choose Another Slot" : "Try Again",
        secondaryLabel: isUnavailable ? "View Booking" : undefined,
        onPrimary: () => {
          setShowBookingModal(false);
          setSelectedSlot(null);
          setBookingFeedback(null);
        },
        onSecondary: isUnavailable
          ? () => {
              setBookingFeedback(null);
              navigate("/my-bookings");
            }
          : undefined,
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!futsal) return;

    try {
      setReviewSubmitting(true);
      await createReview({
        futsal: futsal.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      const reviewData = await getReviews({ futsal: futsal.id });
      setReviews(reviewData);
      setShowReviewModal(false);
      setReviewComment("");
      setReviewRating(5);
      setBookingFeedback({
        variant: "success",
        title: "Review submitted",
        message: "Thanks for sharing your futsal experience.",
        primaryLabel: "Done",
        onPrimary: () => setBookingFeedback(null),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to submit review now";
      setBookingFeedback({
        variant: "error",
        title: "Review not submitted",
        message: message.length > 90 ? "Please try again in a moment." : message,
        primaryLabel: "Try Again",
        onPrimary: () => setBookingFeedback(null),
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 text-muted-foreground">Loading futsal details...</div>
    );
  }

  if (!futsal) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 text-muted-foreground">Futsal not found.</div>
    );
  }

  const amenityList = futsal.amenities?.length ? futsal.amenities : ["Changing Room", "Parking", "Drinking Water", "Toilet"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-[0.875rem] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to futsals
      </Link>

      {/* Hero Image */}
      <div className="rounded-xl overflow-hidden h-72 md:h-96 relative">
        <img src={futsal.image || "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=1600&q=80"} alt={futsal.futsal_name} className="w-full h-full object-cover" />
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => setLiked(!liked)} className={`p-2.5 rounded-full ${liked ? "bg-red-50" : "bg-white/90"} shadow`}>
            <Heart className={`w-5 h-5 ${liked ? "text-red-500 fill-red-500" : "text-gray-600"}`} />
          </button>
          <button className="p-2.5 rounded-full bg-white/90 shadow">
            <Share2 className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="absolute bottom-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-white/90 rounded-full text-[0.8125rem]" style={{ fontWeight: 600 }}>
            ⚽ Futsal Court
          </span>
          <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[0.8125rem]" style={{ fontWeight: 600 }}>
            Starting price by slot
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Left Content */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h1>{futsal.futsal_name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="w-4 h-4" /> {futsal.location}
              </div>
              <div className="text-[0.875rem] text-muted-foreground">Owner: {futsal.owner_name || "N/A"}</div>
              <div className="text-[0.875rem] text-muted-foreground">Rating: {averageRating} ({reviews.length} reviews)</div>
            </div>
            <p className="text-muted-foreground mt-3">{futsal.description || "No futsal description provided yet."}</p>
          </div>

          {/* Amenities */}
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

          {/* Time Slots */}
          <div>
            <h3 className="mb-3">All Time Slots</h3>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {timelineSlots.map((s) => (
                <button
                  key={s.key}
                  disabled={!s.isAvailable}
                  onClick={() => setSelectedSlot(s.source?.id === selectedSlot ? null : (s.source?.id ?? null))}
                  className={`p-3 rounded-lg border text-[0.8125rem] text-left transition-all ${
                    !s.source
                      ? "bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                      : s.isAvailable
                      ? s.source?.id === selectedSlot
                        ? "bg-emerald-600 text-white border-emerald-600 cursor-pointer"
                        : "border-border hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                      : s.isPast
                      ? "bg-red-50 text-red-700 border-red-200 cursor-not-allowed"
                      : "bg-red-50 text-red-700 border-red-200 cursor-not-allowed"
                  }`}
                >
                  <div style={{ fontWeight: 500 }}>{s.startLabel} - {s.endLabel}</div>
                  <div className={`text-[0.75rem] mt-0.5 ${
                    s.source?.id === selectedSlot
                      ? "text-emerald-100"
                      : s.isAvailable
                      ? "text-muted-foreground"
                      : s.isPast
                      ? "text-red-700"
                      : "text-red-700"
                  }`}>
                    {s.isAvailable && s.source ? `Rs. ${s.source.price}` : s.isPast ? "Time Passed" : "Unavailable"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Reviews */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3>Reviews & Ratings</h3>
              {user?.role === "player" ? (
                <button onClick={() => setShowReviewModal(true)} className="text-emerald-600 text-[0.875rem]" style={{ fontWeight: 500 }}>
                  Write a Review
                </button>
              ) : null}
            </div>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[0.875rem]" style={{ fontWeight: 600 }}>{review.user_name || "Player"}</p>
                    <p className="text-[0.8125rem] text-muted-foreground">{new Date(review.review_date).toLocaleDateString()}</p>
                  </div>
                  <p className="text-[0.8125rem] text-amber-600 mb-2">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                  <p className="text-[0.875rem] text-muted-foreground">{review.comment || "No written comment."}</p>
                </div>
              ))}
              {reviews.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-[0.875rem] text-muted-foreground">No reviews yet. Be the first player to review this futsal.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Booking Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="mb-1">Book This Court</h3>
            <p className="text-muted-foreground text-[0.875rem] mb-4">
              Select date and slot to see total price
            </p>

            {selectedSlot ? (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <p className="text-[0.8125rem] text-muted-foreground">Selected Slot</p>
                  <p style={{ fontWeight: 600 }}>{selectedTimelineSlot?.startLabel || (selectedSlotItem?.start_time ? formatTimeLabel(selectedSlotItem.start_time) : "")} - {selectedTimelineSlot?.endLabel || (selectedSlotItem?.end_time ? formatTimeLabel(selectedSlotItem.end_time) : "")}</p>
                  <p className="text-[0.875rem] text-emerald-600" style={{ fontWeight: 600 }}>
                    Rs. {selectedSlotItem?.price}
                  </p>
                </div>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Book Now
                </button>
                <button className="w-full py-3 border border-border rounded-xl text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
                  Pay at Venue
                </button>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-[0.875rem]">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Select a time slot to proceed
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-border space-y-3">
              <h4 className="text-[0.875rem]">Contact Owner</h4>
              <div className="flex items-center gap-2 text-[0.875rem] text-muted-foreground">
                <Phone className="w-4 h-4" /> +977-9841234567
              </div>
              <div className="flex items-center gap-2 text-[0.875rem] text-muted-foreground">
                <MessageSquare className="w-4 h-4" /> Chat with owner
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-[0.875rem] mb-2">Cancellation Policy</h4>
              <ul className="text-[0.8125rem] text-muted-foreground space-y-1">
                <li>• Free cancellation up to 2 hours before</li>
                <li>• 50% refund within 2 hours of slot</li>
                <li>• No refund for no-shows</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Confirm Booking</h3>
              <button onClick={() => setShowBookingModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-[0.875rem]">
                <span className="text-muted-foreground">Court</span>
                <span style={{ fontWeight: 500 }}>{futsal.futsal_name}</span>
              </div>
              <div className="flex justify-between text-[0.875rem]">
                <span className="text-muted-foreground">Date</span>
                <span style={{ fontWeight: 500 }}>{selectedDate}</span>
              </div>
              <div className="flex justify-between text-[0.875rem]">
                <span className="text-muted-foreground">Time</span>
                <span style={{ fontWeight: 500 }}>{selectedTimelineSlot?.startLabel || (selectedSlotItem?.start_time ? formatTimeLabel(selectedSlotItem.start_time) : "")} - {selectedTimelineSlot?.endLabel || (selectedSlotItem?.end_time ? formatTimeLabel(selectedSlotItem.end_time) : "")}</span>
              </div>
              <div className="flex justify-between text-[0.875rem] pt-3 border-t border-border">
                <span style={{ fontWeight: 600 }}>Total</span>
                <span className="text-emerald-600" style={{ fontWeight: 700 }}>Rs. {selectedSlotItem?.price}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={handleBook} className="py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-[0.875rem]">
                Pay Online
              </button>
              <button onClick={handleBook} className="py-3 border border-border rounded-xl hover:bg-muted text-[0.875rem]">
                Pay at Venue
              </button>
            </div>
            <p className="text-[0.75rem] text-muted-foreground text-center">
              By booking, you agree to our cancellation policy
            </p>
          </div>
        </div>
      )}

      {bookingFeedback ? (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border">
            <div className="flex items-center justify-end mb-1">
              <button onClick={() => setBookingFeedback(null)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            {bookingFeedback.variant === "success" ? (
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-3">
                {bookingFeedback.variant === "warning" ? <AlertTriangle className="w-9 h-9 text-amber-600" /> : <CircleX className="w-9 h-9 text-red-600" />}
              </div>
            )}
            <h3 className="text-center mb-2">{bookingFeedback.title}</h3>
            <p className="text-[0.875rem] text-muted-foreground mb-6">{bookingFeedback.message}</p>
            <div className="flex justify-end gap-2">
              {bookingFeedback.secondaryLabel && bookingFeedback.onSecondary ? (
                <button onClick={bookingFeedback.onSecondary} className="px-4 py-2 border border-border rounded-lg text-[0.875rem] hover:bg-muted">
                  {bookingFeedback.secondaryLabel}
                </button>
              ) : null}
              <button
                onClick={bookingFeedback.onPrimary}
                className={`px-4 py-2 rounded-lg text-[0.875rem] text-white ${bookingFeedback.variant === "success" ? "bg-emerald-600 hover:bg-emerald-700" : bookingFeedback.variant === "warning" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                {bookingFeedback.primaryLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Write a Review</h3>
              <button onClick={() => setShowReviewModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[0.8125rem] text-muted-foreground">Rating</label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-border"
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Very Good</option>
                  <option value={3}>3 - Good</option>
                  <option value={2}>2 - Fair</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </div>
              <div>
                <label className="text-[0.8125rem] text-muted-foreground">Comment</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder="Share your experience..."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>
              <button
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60"
              >
                {reviewSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
