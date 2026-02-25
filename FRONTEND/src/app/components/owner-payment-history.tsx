import { useEffect, useMemo, useState } from "react";
import { getPayments, type PaymentItem } from "../lib/api";
import { toast } from "sonner";

export function OwnerPaymentHistory() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPayments() {
      try {
        setLoading(true);
        const data = await getPayments();
        setPayments(data);
      } catch {
        toast.error("Failed to load payment history");
      } finally {
        setLoading(false);
      }
    }

    loadPayments();
  }, []);

  const summary = useMemo(() => {
    const completedAmount = payments
      .filter((item) => item.payment_status === "completed")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const refundedAmount = payments
      .filter((item) => item.payment_status === "refunded")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const pendingCount = payments.filter((item) => item.payment_status === "pending").length;

    return { completedAmount, refundedAmount, pendingCount };
  }, [payments]);

  return (
    <div className="max-w-[1440px] mx-auto px-2 sm:px-4 pb-6 md:pb-8">
      <div className="mb-6">
        <h1>Payment History</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Full transaction timeline for your futsal bookings.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs uppercase tracking-wide text-primary">Completed</p>
          <p className="text-lg font-semibold tabular-nums mt-1">Rs. {summary.completedAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <p className="text-xs uppercase tracking-wide text-destructive">Refunded</p>
          <p className="text-lg font-semibold tabular-nums mt-1">Rs. {summary.refundedAmount.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Count</p>
          <p className="text-lg font-semibold tabular-nums mt-1">{summary.pendingCount}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Booking</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Futsal</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Amount</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Method</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Txn ID</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Loading payments…</td>
              </tr>
            ) : null}
            {!loading && payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No payment transactions yet.</td>
              </tr>
            ) : null}
            {payments.map((payment) => (
              <tr key={payment.id} className="border-t border-border hover:bg-muted/20">
                <td className="px-3 py-2.5">#{payment.booking_details.booking_id}</td>
                <td className="px-3 py-2.5">{payment.booking_details.futsal}</td>
                <td className="px-3 py-2.5 tabular-nums">Rs. {Number(payment.amount).toLocaleString()}</td>
                <td className="px-3 py-2.5 capitalize">{payment.payment_method.replace("_", " ")}</td>
                <td className="px-3 py-2.5 capitalize">{payment.payment_status}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{payment.transaction_id || "-"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{new Date(payment.payment_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
