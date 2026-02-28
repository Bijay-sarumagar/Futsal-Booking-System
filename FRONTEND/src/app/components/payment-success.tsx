import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { verifyEsewaPayment } from "../lib/api";

export function PaymentSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying payment...");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(location.search);
      const bookingIdRaw = params.get("booking_id");
      const bookingId = Number(bookingIdRaw);
      const data = params.get("data") || undefined;
      const directStatus = params.get("status") || undefined;
      const refId = params.get("ref_id") || params.get("transaction_code") || undefined;

      if (!bookingId || Number.isNaN(bookingId)) {
        setStatus("error");
        setMessage("Missing booking reference.");
        return;
      }

      try {
        const result = await verifyEsewaPayment({
          booking_id: bookingId,
          data,
          status: directStatus,
          ref_id: refId,
        });

        if (result.payment_status === "completed") {
          setStatus("success");
          setMessage("Payment verified successfully.");
        } else {
          setStatus("error");
          setMessage("Payment verification failed.");
        }
      } catch {
        setStatus("error");
        setMessage("Could not verify payment.");
      }
    }

    verify();
  }, [location.search]);

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm" style={{ animation: "ui-modal-enter 0.24s ease" }}>
        <div className="flex justify-center mb-4">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${status === "success" ? "bg-emerald-100" : status === "error" ? "bg-red-100" : "bg-muted"}`}>
            <CheckCircle2 className={`w-12 h-12 ${status === "success" ? "text-primary" : status === "error" ? "text-destructive" : "text-muted-foreground"}`} />
          </div>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Payment Status</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        {status === "success" ? (
          <p className="text-sm text-primary mb-6">Payment successful. Booking and notifications are updated.</p>
        ) : null}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/my-bookings")}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            My Bookings
          </button>
          <Link to="/player/home" className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
