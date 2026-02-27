import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { CircleX } from "lucide-react";
import { getBookingById, verifyEsewaPayment } from "../lib/api";

export function PaymentFailurePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [syncMessage, setSyncMessage] = useState("Updating booking status...");
  const [retryRoute, setRetryRoute] = useState<string>("/search");
  const params = new URLSearchParams(location.search);
  const bookingId = params.get("booking_id");

  useEffect(() => {
    async function syncFailureStatus() {
      const bookingIdNum = Number(bookingId);
      if (!bookingId || Number.isNaN(bookingIdNum)) {
        setSyncMessage("Payment was not completed.");
        return;
      }

      const data = params.get("data") || undefined;
      const directStatus = params.get("status") || "CANCELED";
      const refId = params.get("ref_id") || params.get("transaction_code") || undefined;

      try {
        await verifyEsewaPayment({
          booking_id: bookingIdNum,
          data,
          status: directStatus,
          ref_id: refId,
        });
        setSyncMessage("Payment was not completed. Booking has been released.");
      } catch {
        setSyncMessage("Payment was not completed. Please check My Bookings.");
      }
    }

    void syncFailureStatus();
  }, [bookingId, location.search]);

  useEffect(() => {
    async function loadRetryRoute() {
      const bookingIdNum = Number(bookingId);
      if (!bookingId || Number.isNaN(bookingIdNum)) {
        setRetryRoute("/search");
        return;
      }

      try {
        const booking = await getBookingById(bookingIdNum);
        const futsalId = booking.futsal_details?.futsal_id;
        setRetryRoute(futsalId ? `/futsal/${futsalId}` : "/search");
      } catch {
        setRetryRoute("/search");
      }
    }

    void loadRetryRoute();
  }, [bookingId]);

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
        <div className="flex justify-center mb-3">
          <CircleX className="w-12 h-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Payment Failed</h1>
        <p className="text-muted-foreground mb-6">{syncMessage}</p>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate(retryRoute)}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Retry Booking
          </button>
          <Link to={bookingId ? `/my-bookings` : "/player/home"} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
            Close
          </Link>
        </div>
      </div>
    </div>
  );
}
