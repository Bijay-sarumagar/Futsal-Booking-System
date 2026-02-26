import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { ExternalLink, LoaderCircle } from "lucide-react";

const REQUIRED_FIELD_KEYS = [
  "amount",
  "tax_amount",
  "total_amount",
  "transaction_uuid",
  "product_code",
  "product_service_charge",
  "product_delivery_charge",
  "success_url",
  "failure_url",
  "signed_field_names",
  "signature",
] as const;

function submitEsewaForm(paymentUrl: string, fields: Record<string, string>) {
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
}

export function EsewaStartPage() {
  const location = useLocation();
  const [autoStarted, setAutoStarted] = useState(false);

  const payload = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const paymentUrl = params.get("payment_url") || "";
    const bookingId = params.get("booking_id") || "";

    const fields: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key === "payment_url" || key === "booking_id") return;
      fields[key] = value;
    });

    const hasRequiredFields = REQUIRED_FIELD_KEYS.every((key) => Boolean(fields[key]));

    return {
      bookingId,
      paymentUrl,
      fields,
      isValid: Boolean(paymentUrl) && hasRequiredFields,
    };
  }, [location.search]);

  useEffect(() => {
    if (!payload.isValid || autoStarted) return;

    setAutoStarted(true);
    const timer = window.setTimeout(() => {
      submitEsewaForm(payload.paymentUrl, payload.fields);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [payload, autoStarted]);

  if (!payload.isValid) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">Invalid Payment Link</h1>
          <p className="text-muted-foreground mb-6">The QR link is incomplete or expired. Please start payment again from booking.</p>
          <Link to="/my-bookings" className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
            Back to My Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-sm">
        <div className="flex justify-center mb-3">
          <LoaderCircle className="w-11 h-11 animate-spin text-primary" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">Opening eSewa</h1>
        <p className="text-muted-foreground mb-6">
          Redirecting booking #{payload.bookingId || "-"} to secure payment.
        </p>
        <button
          type="button"
          onClick={() => submitEsewaForm(payload.paymentUrl, payload.fields)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Continue Manually
        </button>
      </div>
    </div>
  );
}
