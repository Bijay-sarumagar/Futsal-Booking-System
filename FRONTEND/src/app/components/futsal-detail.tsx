import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { MapPin, Clock, ArrowLeft, X, Phone, Share2, Heart, MessageSquare, CheckCircle2, AlertTriangle, CircleX, Car, Shirt, Droplets, Bath, Coffee, Wifi, ShieldCheck, Lightbulb, Copy, ExternalLink, QrCode, Star, Pencil, Trash } from "lucide-react";
import { cancelBooking, createBooking, createReview, deleteReview, getBookingById, getFutsalById, getReviews, getSlots, initiateEsewaPayment, updateReview, type FutsalItem, type ReviewItem, type TimeSlotItem } from "../lib/api";
import { toast } from "sonner";
import { useAuth } from "../auth/auth-context";
import QRCode from "qrcode";
import temporaryEsewaQrImage from "../../assets/images/esewa-my-qr.jpg";

interface BookingFeedbackDialog {
  variant: "success" | "warning" | "error";
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

interface PendingEsewaCheckout {
  bookingId: number;
  paymentUrl: string;
  fields: Record<string, string>;
  mobileCheckoutUrl: string;
  qrDataUrl: string | null;
}

interface OwnerQrCheckout {
  bookingId: number;
  slotId: number;
  amount: number;
  activeProvider: "esewa" | "fonepay";
  esewaQrImage: string | null;
  fonepayQrImage: string | null;
  futsalName: string;
  slotDate: string;
  slotTime: string;
}

interface CancelPaymentPrompt {
  source: "gateway" | "owner_qr";
  bookingId: number;
  slotId?: number;
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
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHoverRating, setReviewHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [editReviewId, setEditReviewId] = useState<number | null>(null);
  const [editReviewRating, setEditReviewRating] = useState(0);
  const [editReviewHoverRating, setEditReviewHoverRating] = useState(0);
  const [editReviewComment, setEditReviewComment] = useState("");
  const [editReviewSubmitting, setEditReviewSubmitting] = useState(false);
  const [deleteReviewId, setDeleteReviewId] = useState<number | null>(null);
  const [deleteReviewSubmitting, setDeleteReviewSubmitting] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [venueSubmitting, setVenueSubmitting] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState<BookingFeedbackDialog | null>(null);
  const [pendingEsewaCheckout, setPendingEsewaCheckout] = useState<PendingEsewaCheckout | null>(null);
  const [releasingPendingBooking, setReleasingPendingBooking] = useState(false);
  const [switchingToGatewayFromOwnerQr, setSwitchingToGatewayFromOwnerQr] = useState(false);
  const [ownerQrCheckout, setOwnerQrCheckout] = useState<OwnerQrCheckout | null>(null);
  const [cancelPaymentPrompt, setCancelPaymentPrompt] = useState<CancelPaymentPrompt | null>(null);
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
        setSlots([]);
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

  const selectedSlotItem = slots.find((slot) => slot.id === selectedSlot) || null;
  const totalAmount = Number(selectedSlotItem?.price || 0);
  const computedAdvanceAmount = Math.round(totalAmount * 0.1 * 100) / 100;
  const ownerEsewaQrImage = futsal?.esewa_qr_image || temporaryEsewaQrImage;
  const hasEsewaOwnerQr = Boolean(ownerEsewaQrImage);
  const hasFonepayOwnerQr = Boolean(futsal?.fonepay_qr_image);
  const hasAnyOwnerQr = hasEsewaOwnerQr || hasFonepayOwnerQr;
  const latitude = futsal?.latitude ? Number(futsal.latitude) : Number.NaN;
  const longitude = futsal?.longitude ? Number(futsal.longitude) : Number.NaN;
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  const mapQuery = hasCoordinates ? `${latitude},${longitude}` : (futsal?.location || "Nepal");
  const delta = 0.008;
  const mapEmbedSrc = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - delta}%2C${latitude - delta}%2C${longitude + delta}%2C${latitude + delta}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : null;
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;
  const averageRating = reviews.length
    ? (reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const myReview = useMemo(
    () => (user ? reviews.find((review) => review.user === user.id) : undefined),
    [reviews, user?.id],
  );

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

  const openBookingModal = () => {
    setShowBookingModal(true);
  };

  const submitEsewaForm = (paymentUrl: string, fields: Record<string, string>) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = paymentUrl;

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const buildEsewaStartUrl = (bookingId: number, paymentUrl: string, fields: Record<string, string>) => {
    const params = new URLSearchParams({
      booking_id: String(bookingId),
      payment_url: paymentUrl,
    });
    Object.entries(fields).forEach(([key, value]) => {
      params.set(key, value);
    });
    return `${window.location.origin}/payments/esewa-start?${params.toString()}`;
  };

  const createGatewayCheckoutState = async (bookingId: number) => {
    const payment = await initiateEsewaPayment(bookingId);
    const mobileCheckoutUrl = buildEsewaStartUrl(bookingId, payment.payment_url, payment.fields);
    let qrDataUrl: string | null = null;

    try {
      qrDataUrl = await QRCode.toDataURL(mobileCheckoutUrl, {
        width: 320,
        margin: 1,
      });
    } catch {
      qrDataUrl = null;
    }

    return {
      bookingId,
      paymentUrl: payment.payment_url,
      fields: payment.fields,
      mobileCheckoutUrl,
      qrDataUrl,
    } as PendingEsewaCheckout;
  };

  const handlePayWithEsewa = async () => {
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
      setPaymentSubmitting(true);
      const booking = await createBooking(selectedSlot);
      if (!booking?.id) {
        throw new Error("Booking created but booking id is missing. Please try again.");
      }

      const checkoutState = await createGatewayCheckoutState(booking.id);

      setShowBookingModal(false);
      setPendingEsewaCheckout(checkoutState);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start payment";
      setBookingFeedback({
        variant: "error",
        title: "Payment could not start",
        message: message.length > 100 ? "Could not connect to eSewa. Please try again." : message,
        primaryLabel: "Try Again",
        onPrimary: () => setBookingFeedback(null),
      });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handlePayWithOwnerQr = async () => {
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

    if (!futsal || !hasAnyOwnerQr) {
      setBookingFeedback({
        variant: "error",
        title: "QR not configured",
        message: "Owner QR code is not set for this futsal yet. You can use gateway payment or pay at venue.",
        primaryLabel: "Close",
        onPrimary: () => setBookingFeedback(null),
      });
      return;
    }

    const preferredProvider = futsal.preferred_qr_provider === "fonepay" ? "fonepay" : "esewa";
    const fallbackProvider = hasEsewaOwnerQr ? "esewa" : "fonepay";
    const activeProvider = preferredProvider === "esewa"
      ? (hasEsewaOwnerQr ? "esewa" : fallbackProvider)
      : (hasFonepayOwnerQr ? "fonepay" : fallbackProvider);

    try {
      setPaymentSubmitting(true);
      const booking = await createBooking(selectedSlot);
      if (!booking?.id) {
        throw new Error("Booking created but booking id is missing. Please try again.");
      }

      setShowBookingModal(false);
      setOwnerQrCheckout({
        bookingId: booking.id,
        slotId: selectedSlot,
        amount: computedAdvanceAmount,
        activeProvider,
        esewaQrImage: ownerEsewaQrImage,
        fonepayQrImage: futsal.fonepay_qr_image,
        futsalName: futsal.futsal_name,
        slotDate: selectedSlotItem?.slot_date || selectedDate,
        slotTime: selectedSlotItem ? `${formatTimeLabel(selectedSlotItem.start_time)} - ${formatTimeLabel(selectedSlotItem.end_time)}` : "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not reserve booking";
      setBookingFeedback({
        variant: "error",
        title: "Booking failed",
        message: message.length > 100 ? "Could not reserve this slot right now. Please try again." : message,
        primaryLabel: "Try Again",
        onPrimary: () => setBookingFeedback(null),
      });
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handlePayAtVenue = async () => {
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
      setVenueSubmitting(true);
      await createBooking(selectedSlot);
      setShowBookingModal(false);
      setSlots((prev) => prev.map((slot) => (
        slot.id === selectedSlot ? { ...slot, availability_status: "booked" } : slot
      )));
      setSelectedSlot(null);
      setBookingFeedback({
        variant: "success",
        title: "Booking confirmed",
        message: "Your slot is reserved. Please pay at the venue before playing.",
        primaryLabel: "My Bookings",
        secondaryLabel: "Continue Browsing",
        onPrimary: () => {
          setBookingFeedback(null);
          navigate("/my-bookings");
        },
        onSecondary: () => {
          setBookingFeedback(null);
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not complete booking";
      setBookingFeedback({
        variant: "error",
        title: "Booking failed",
        message: message.length > 100 ? "Could not reserve this slot right now. Please try again." : message,
        primaryLabel: "Try Again",
        onPrimary: () => setBookingFeedback(null),
      });
    } finally {
      setVenueSubmitting(false);
    }
  };

  const releasePendingBooking = async (payload: {
    bookingId: number;
    reopenBookingModal?: boolean;
    clearGateway?: boolean;
    clearOwnerQr?: boolean;
    slotIdToRestore?: number;
  }) => {
    const { bookingId, reopenBookingModal, clearGateway, clearOwnerQr, slotIdToRestore } = payload;

    try {
      setReleasingPendingBooking(true);
      await cancelBooking(bookingId);

      if (clearGateway) {
        setPendingEsewaCheckout(null);
      }
      if (clearOwnerQr) {
        setOwnerQrCheckout(null);
      }

      if (typeof slotIdToRestore === "number") {
        setSelectedSlot(slotIdToRestore);
      }

      if (Number.isFinite(futsalId)) {
        const slotData = await getSlots({ futsal: futsalId, slotDate: selectedDate });
        setSlots(slotData);
      }

      if (reopenBookingModal) {
        openBookingModal();
      }
    } catch {
      setBookingFeedback({
        variant: "error",
        title: "Could not cancel payment",
        message: "Unable to release this slot right now. Please try again.",
        primaryLabel: "Close",
        onPrimary: () => setBookingFeedback(null),
      });
    } finally {
      setReleasingPendingBooking(false);
    }
  };

  const handleConfirmCancelPendingPayment = async () => {
    if (!cancelPaymentPrompt) return;

    const prompt = cancelPaymentPrompt;
    setCancelPaymentPrompt(null);

    if (prompt.source === "gateway") {
      const clearOwnerQr = Boolean(ownerQrCheckout);
      await releasePendingBooking({
        bookingId: prompt.bookingId,
        clearGateway: true,
        clearOwnerQr,
        reopenBookingModal: false,
        slotIdToRestore: prompt.slotId,
      });
      return;
    }

    await releasePendingBooking({
      bookingId: prompt.bookingId,
      clearOwnerQr: true,
      reopenBookingModal: false,
      slotIdToRestore: prompt.slotId,
    });
  };

  const handleSwitchToGatewayFromOwnerQr = async () => {
    if (!ownerQrCheckout) return;

    try {
      setSwitchingToGatewayFromOwnerQr(true);

      const checkoutState = await createGatewayCheckoutState(ownerQrCheckout.bookingId);
      setPendingEsewaCheckout(checkoutState);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not switch to gateway payment right now.";
      setBookingFeedback({
        variant: "error",
        title: "Could not switch payment method",
        message,
        primaryLabel: "Close",
        onPrimary: () => setBookingFeedback(null),
      });
    } finally {
      setSwitchingToGatewayFromOwnerQr(false);
    }
  };

  useEffect(() => {
    if (!ownerQrCheckout || pendingEsewaCheckout) {
      return;
    }

    let isMounted = true;
    let timerId: number | null = null;

    const pollPaymentStatus = async () => {
      try {
        const booking = await getBookingById(ownerQrCheckout.bookingId);

        if (!isMounted) {
          return;
        }

        if (booking.payment_status === "completed") {
          setOwnerQrCheckout(null);
          setSelectedSlot(null);

          if (Number.isFinite(futsalId)) {
            const slotData = await getSlots({ futsal: futsalId, slotDate: selectedDate });
            if (isMounted) {
              setSlots(slotData);
            }
          }

          if (isMounted) {
            setBookingFeedback({
              variant: "success",
              title: "Payment received",
              message: "Your booking payment was verified automatically.",
              primaryLabel: "Go to My Bookings",
              secondaryLabel: "Continue Browsing",
              onPrimary: () => {
                setBookingFeedback(null);
                navigate("/my-bookings");
              },
              onSecondary: () => setBookingFeedback(null),
            });
          }
          return;
        }
      } catch {
        // Keep polling without interrupting the payment screen.
      }

      if (isMounted) {
        timerId = window.setTimeout(() => {
          void pollPaymentStatus();
        }, 4500);
      }
    };

    void pollPaymentStatus();

    return () => {
      isMounted = false;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [ownerQrCheckout, pendingEsewaCheckout, futsalId, selectedDate, navigate]);

  const handleEditReview = (review: ReviewItem) => {
    setEditReviewId(review.id);
    setEditReviewRating(review.rating);
    setEditReviewComment(review.comment || "");
    setEditReviewHoverRating(0);
  };

  const handleSubmitEditReview = async () => {
    if (!editReviewId || !futsal) return;
    if (editReviewRating < 1) {
      setBookingFeedback({
        variant: "warning",
        title: "Select a rating",
        message: "Please choose at least 1 star before updating your review.",
        primaryLabel: "OK",
        onPrimary: () => setBookingFeedback(null),
      });
      return;
    }

    try {
      setEditReviewSubmitting(true);
      await updateReview(editReviewId, {
        rating: editReviewRating,
        comment: editReviewComment.trim() || undefined,
      });
      const reviewData = await getReviews({ futsal: futsal.id });
      setReviews(reviewData);
      setEditReviewId(null);
      setEditReviewComment("");
      setEditReviewRating(0);
      setEditReviewHoverRating(0);
      setBookingFeedback({
        variant: "success",
        title: "Review updated",
        message: "Your review has been updated.",
        primaryLabel: "Done",
        onPrimary: () => setBookingFeedback(null),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update review now";
      setBookingFeedback({
        variant: "error",
        title: "Review not updated",
        message: message.length > 90 ? "Please try again in a moment." : message,
        primaryLabel: "Try Again",
        onPrimary: () => setBookingFeedback(null),
      });
    } finally {
      setEditReviewSubmitting(false);
    }
  };

  const handleDeleteReview = (reviewId: number) => {
    setDeleteReviewId(reviewId);
  };

  const confirmDeleteReview = async () => {
    if (deleteReviewId === null || !futsal) return;

    try {
      setDeleteReviewSubmitting(true);
      await deleteReview(deleteReviewId);
      const reviewData = await getReviews({ futsal: futsal.id });
      setReviews(reviewData);
      setDeleteReviewId(null);
      setBookingFeedback({
        variant: "success",
        title: "Review deleted",
        message: "Your review has been removed.",
        primaryLabel: "Done",
        onPrimary: () => setBookingFeedback(null),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete review now";
      setBookingFeedback({
        variant: "error",
        title: "Review not deleted",
        message: message.length > 90 ? "Please try again in a moment." : message,
        primaryLabel: "Try Again",
        onPrimary: () => setBookingFeedback(null),
      });
    } finally {
      setDeleteReviewSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!futsal) return;

    if (reviewRating < 1) {
      setBookingFeedback({
        variant: "warning",
        title: "Select a rating",
        message: "Please choose at least 1 star before submitting your review.",
        primaryLabel: "OK",
        onPrimary: () => setBookingFeedback(null),
      });
      return;
    }

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
      setReviewRating(0);
      setReviewHoverRating(0);
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
  const getAmenityIcon = (amenity: string) => {
    const normalized = amenity.toLowerCase();
    if (normalized.includes("parking")) return Car;
    if (normalized.includes("changing")) return Shirt;
    if (normalized.includes("water")) return Droplets;
    if (normalized.includes("toilet") || normalized.includes("shower")) return Bath;
    if (normalized.includes("cafe")) return Coffee;
    if (normalized.includes("wifi")) return Wifi;
    if (normalized.includes("first aid")) return ShieldCheck;
    if (normalized.includes("flood")) return Lightbulb;
    return CheckCircle2;
  };

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
            <div className="flex flex-wrap gap-2.5">
              {amenityList.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white shadow-sm text-[0.875rem] text-foreground">
                  {(() => {
                    const AmenityIcon = getAmenityIcon(a);
                    return <AmenityIcon className="w-4 h-4 text-emerald-600" />;
                  })()}
                  {a}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3>Location Map</h3>
              <a
                href={directionsHref}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 text-[0.875rem] font-medium hover:underline"
              >
                Open in Maps
              </a>
            </div>
            {mapEmbedSrc ? (
              <div className="rounded-lg border border-border overflow-hidden h-64 bg-muted/20">
                <iframe
                  title={`Map for ${futsal.futsal_name}`}
                  src={mapEmbedSrc}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border h-64 bg-muted/20 flex flex-col items-center justify-center text-center px-4">
                <MapPin className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Map preview unavailable</p>
                <p className="text-xs text-muted-foreground mt-1">Coordinates are not saved for this futsal yet.</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {hasCoordinates
                ? `Pinned at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                : "Exact coordinates not available yet. Map is using location text."}
            </p>
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
              {user?.role === "player" && !myReview ? (
                <button
                  onClick={() => {
                    setReviewRating(0);
                    setReviewHoverRating(0);
                    setReviewComment("");
                    setShowReviewModal(true);
                  }}
                  className="text-emerald-600 text-[0.875rem]"
                  style={{ fontWeight: 500 }}
                >
                  Write a Review
                </button>
              ) : null}
            </div>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 bg-white border border-border rounded-xl shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="text-[0.875rem]" style={{ fontWeight: 600 }}>{review.user_name || "Player"}</p>
                      <p className="text-[0.8125rem] text-muted-foreground">{new Date(review.review_date).toLocaleDateString()}</p>
                    </div>
                    {user?.id === review.user ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted"
                          title="Edit review"
                          onClick={() => handleEditReview(review)}
                        >
                          <Pencil className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted"
                          title="Delete review"
                          onClick={() => handleDeleteReview(review.id)}
                        >
                          <Trash className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    ) : null}
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
                  onClick={openBookingModal}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Book Now
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
            <div className="mb-4 rounded-xl overflow-hidden border border-border bg-muted/20">
              <img
                src={futsal.image || "https://images.unsplash.com/photo-1552667466-07770ae110d0?auto=format&fit=crop&w=1200&q=80"}
                alt={futsal.futsal_name}
                className="w-full h-40 md:h-44 object-cover object-center"
              />
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
                <span style={{ fontWeight: 600 }}>Total Amount</span>
                <span className="text-foreground" style={{ fontWeight: 700 }}>Rs. {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[0.875rem]">
                <span className="text-muted-foreground">Pay Advance (10%)</span>
                <span style={{ fontWeight: 600 }}>Rs. {computedAdvanceAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="mb-4">
              <button
                type="button"
                onClick={handlePayWithOwnerQr}
                disabled={paymentSubmitting}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-[0.875rem] disabled:opacity-60"
              >
                {paymentSubmitting ? "Preparing owner QR..." : "Pay Advance (10%)"}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 mb-4">
              <button
                onClick={handlePayAtVenue}
                disabled={venueSubmitting}
                className="py-3 bg-sky-600 text-white rounded-xl hover:bg-sky-700 text-[0.875rem] disabled:opacity-60"
              >
                {venueSubmitting ? "Confirming..." : "Pay at Venue"}
              </button>
            </div>
            <p className="text-[0.75rem] text-muted-foreground text-center">
              By booking, you agree to our cancellation policy
            </p>
          </div>
        </div>
      )}

      {ownerQrCheckout && !pendingEsewaCheckout ? (
        <div className="fixed inset-0 z-[72] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!ownerQrCheckout) return;
                    setCancelPaymentPrompt({
                      source: "owner_qr",
                      bookingId: ownerQrCheckout.bookingId,
                      slotId: ownerQrCheckout.slotId,
                    });
                  }}
                  className="p-1 rounded hover:bg-muted"
                  aria-label="Back to booking"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  Owner QR Payment
                </h3>
              </div>
              <button
                onClick={() => {
                  if (!ownerQrCheckout) return;
                  setCancelPaymentPrompt({
                    source: "owner_qr",
                    bookingId: ownerQrCheckout.bookingId,
                    slotId: ownerQrCheckout.slotId,
                  });
                }}
                className="p-1 rounded hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[0.875rem] text-muted-foreground mb-3">
              Booking #{ownerQrCheckout.bookingId} reserved. Scan and pay advance Rs. {ownerQrCheckout.amount.toFixed(2)}.
            </p>

            <div className="flex gap-2 mb-3">
              {ownerQrCheckout.esewaQrImage ? (
                <button
                  type="button"
                  onClick={() => setOwnerQrCheckout((prev) => (prev ? { ...prev, activeProvider: "esewa" } : prev))}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${ownerQrCheckout.activeProvider === "esewa" ? "bg-emerald-600 text-white border-emerald-600" : "border-border hover:bg-muted"}`}
                >
                  eSewa QR
                </button>
              ) : null}
              {ownerQrCheckout.fonepayQrImage ? (
                <button
                  type="button"
                  onClick={() => setOwnerQrCheckout((prev) => (prev ? { ...prev, activeProvider: "fonepay" } : prev))}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${ownerQrCheckout.activeProvider === "fonepay" ? "bg-emerald-600 text-white border-emerald-600" : "border-border hover:bg-muted"}`}
                >
                  Fonepay QR
                </button>
              ) : null}
            </div>

            <div className="rounded-xl border border-border bg-muted/10 p-4 mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">Remarks:</p>
              <p className="text-sm text-foreground font-medium">{ownerQrCheckout.futsalName}</p>
              <p className="text-sm text-muted-foreground">{ownerQrCheckout.slotDate} · {ownerQrCheckout.slotTime}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-4 flex items-center justify-center mb-4">
              {ownerQrCheckout.activeProvider === "esewa" && ownerQrCheckout.esewaQrImage ? (
                <img
                  src={ownerQrCheckout.esewaQrImage}
                  alt={`Owner eSewa QR for booking #${ownerQrCheckout.bookingId}`}
                  className="w-64 h-64 md:w-72 md:h-72 object-contain"
                />
              ) : null}
              {ownerQrCheckout.activeProvider === "fonepay" && ownerQrCheckout.fonepayQrImage ? (
                <img
                  src={ownerQrCheckout.fonepayQrImage}
                  alt={`Owner Fonepay QR for booking #${ownerQrCheckout.bookingId}`}
                  className="w-64 h-64 md:w-72 md:h-72 object-contain"
                />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setOwnerQrCheckout(null);
                  navigate("/my-bookings");
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-sm shadow-emerald-200/50 transition hover:bg-emerald-700"
              >
                Go to My Bookings
              </button>
              <button
                type="button"
                onClick={() => void handleSwitchToGatewayFromOwnerQr()}
                disabled={switchingToGatewayFromOwnerQr}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-emerald-700 text-sm font-medium underline underline-offset-4 decoration-emerald-500 decoration-2 hover:bg-emerald-50 transition disabled:opacity-60"
              >
                {switchingToGatewayFromOwnerQr ? "Switching..." : "Use payment gateway"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingEsewaCheckout ? (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {ownerQrCheckout ? (
                  <button
                    type="button"
                    onClick={() => setPendingEsewaCheckout(null)}
                    className="p-1 rounded hover:bg-muted"
                    aria-label="Back to owner QR"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : null}
                <h3 className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  Scan to Pay
                </h3>
              </div>
              <button
                onClick={() => {
                  if (!pendingEsewaCheckout) return;
                  setCancelPaymentPrompt({
                    source: "gateway",
                    bookingId: pendingEsewaCheckout.bookingId,
                    slotId: ownerQrCheckout?.slotId ?? selectedSlot ?? undefined,
                  });
                }}
                className="p-1 rounded hover:bg-muted"
                disabled={releasingPendingBooking}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[0.875rem] text-muted-foreground mb-4">
              Scan this QR from your mobile payment app, or continue on this device.
            </p>

            <div className="rounded-xl border border-border bg-muted/10 p-4 flex items-center justify-center mb-4">
              {pendingEsewaCheckout.qrDataUrl ? (
                <img
                  src={pendingEsewaCheckout.qrDataUrl}
                  alt={`eSewa QR for booking #${pendingEsewaCheckout.bookingId}`}
                  className="w-56 h-56 object-contain"
                />
              ) : (
                <div className="text-center text-muted-foreground text-sm">
                  QR could not be generated. Use the link buttons below.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => submitEsewaForm(pendingEsewaCheckout.paymentUrl, pendingEsewaCheckout.fields)}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
              >
                <ExternalLink className="w-4 h-4" /> Continue on this device
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(pendingEsewaCheckout.mobileCheckoutUrl);
                    toast.success("Payment link copied");
                  } catch {
                    toast.error("Could not copy payment link");
                  }
                }}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm hover:bg-muted"
              >
                <Copy className="w-4 h-4" /> Copy payment link
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!pendingEsewaCheckout) return;
                  setCancelPaymentPrompt({
                    source: "gateway",
                    bookingId: pendingEsewaCheckout.bookingId,
                    slotId: ownerQrCheckout?.slotId ?? selectedSlot ?? undefined,
                  });
                }}
                disabled={releasingPendingBooking}
                className="inline-flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-50 disabled:opacity-60"
              >
                {releasingPendingBooking ? "Releasing slot..." : "Cancel payment and release slot"}
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              After successful eSewa payment, booking status is verified automatically.
            </p>
          </div>
        </div>
      ) : null}

      {cancelPaymentPrompt ? (
        <div className="fixed inset-0 z-[74] bg-black/55 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-border shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Cancel Payment?
              </h3>
              <button onClick={() => setCancelPaymentPrompt(null)} className="p-1 rounded hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-5">
              Are you sure you want to cancel this payment? The slot will be released and you will return to booking.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelPaymentPrompt(null)}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
              >
                Keep Payment
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCancelPendingPayment()}
                disabled={releasingPendingBooking}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60"
              >
                {releasingPendingBooking ? "Cancelling..." : "Yes, Cancel Payment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

      {editReviewId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Edit Review</h3>
              <button type="button" onClick={() => setEditReviewId(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[0.8125rem] text-muted-foreground">Rating</label>
                <div
                  className="mt-2 flex items-center gap-2"
                  onMouseLeave={() => setEditReviewHoverRating(0)}
                >
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    const previewRating = editReviewHoverRating || editReviewRating;
                    const active = value <= previewRating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setEditReviewRating(value)}
                        onMouseEnter={() => setEditReviewHoverRating(value)}
                        onFocus={() => setEditReviewHoverRating(value)}
                        onBlur={() => setEditReviewHoverRating(0)}
                        aria-label={`Set ${value} star rating`}
                        className={`p-1 rounded transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active ? "text-amber-400" : "text-border hover:text-amber-300"
                        }`}
                      >
                        <Star className={`w-6 h-6 transition-all duration-200 ${active ? "fill-current scale-110 -translate-y-0.5" : "fill-transparent"}`} />
                      </button>
                    );
                  })}
                  <span className="text-sm text-muted-foreground ml-1">
                    {editReviewRating > 0 ? `${editReviewRating}/5` : "No stars selected"}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[0.8125rem] text-muted-foreground">Comment</label>
                <textarea
                  value={editReviewComment}
                  onChange={(e) => setEditReviewComment(e.target.value)}
                  rows={4}
                  placeholder="Update your review..."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-border"
                />
              </div>
              <button
                onClick={handleSubmitEditReview}
                disabled={editReviewSubmitting || editReviewRating < 1}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-60"
              >
                {editReviewSubmitting ? "Updating..." : "Update Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteReviewId !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3>Delete Review?</h3>
              <button type="button" onClick={() => setDeleteReviewId(null)}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[0.95rem] text-muted-foreground mb-6">
              Are you sure you want to delete this review? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteReviewId(null)}
                className="px-4 py-2 border border-border rounded-lg text-[0.875rem] hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteReview}
                disabled={deleteReviewSubmitting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-[0.875rem] hover:bg-red-700 disabled:opacity-60"
              >
                {deleteReviewSubmitting ? "Deleting..." : "Delete Review"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div
                  className="mt-2 flex items-center gap-2"
                  onMouseLeave={() => setReviewHoverRating(0)}
                >
                  {Array.from({ length: 5 }, (_, index) => {
                    const value = index + 1;
                    const previewRating = reviewHoverRating || reviewRating;
                    const active = value <= previewRating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setReviewRating(value)}
                        onMouseEnter={() => setReviewHoverRating(value)}
                        onFocus={() => setReviewHoverRating(value)}
                        onBlur={() => setReviewHoverRating(0)}
                        aria-label={`Set ${value} star rating`}
                        className={`p-1 rounded transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active ? "text-amber-400" : "text-border hover:text-amber-300"
                        }`}
                      >
                        <Star className={`w-6 h-6 transition-all duration-200 ${active ? "fill-current scale-110 -translate-y-0.5" : "fill-transparent"}`} />
                      </button>
                    );
                  })}
                  <span className="text-sm text-muted-foreground ml-1">
                    {reviewRating > 0 ? `${reviewRating}/5` : "No stars selected"}
                  </span>
                </div>
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
                disabled={reviewSubmitting || reviewRating < 1}
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
