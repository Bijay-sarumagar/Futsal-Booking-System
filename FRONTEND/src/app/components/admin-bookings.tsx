import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getMyBookings, type BookingItem } from "../lib/api";
import { toast } from "sonner";

function formatTimeLabel(value: string) {
  const [hRaw, mRaw] = value.split(":");
  const hour24 = Number(hRaw);
  const minute = Number(mRaw);
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function statusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function InitialAvatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold border border-border shrink-0">
      {name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
    </div>
  );
}

export function AdminBookings() {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BookingItem["booking_status"]>("all");

  useEffect(() => {
    async function loadBookings() {
      try {
        setLoading(true);
        const data = await getMyBookings();
        setBookings(data);
      } catch {
        toast.error("Failed to load bookings");
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);

  const filtered = useMemo(() => {
    return bookings
      .filter((item) => statusFilter === "all" || item.booking_status === statusFilter)
      .filter((item) => {
        const text = `${item.user_name} ${item.owner_name} ${item.futsal_details.futsal_name}`.toLowerCase();
        return text.includes(query.toLowerCase());
      });
  }, [bookings, query, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      <h1 className="mb-1">Manage Bookings</h1>
      <p className="text-muted-foreground mb-6 text-sm md:text-base">Monitor all bookings with owner and player profiles</p>

      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search player, owner, or futsal"
            className="w-full pl-10 pr-4 py-2.5 min-h-11 rounded-lg border border-border bg-input-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "confirmed", "completed", "cancelled", "no_show"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 min-h-10 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {statusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/60 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Booking</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Owner</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Player</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="border-t border-border">
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading bookings...</td>
              </tr>
            ) : null}

            {filtered.map((booking) => (
              <tr key={booking.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium">#{booking.id}</p>
                  <p className="text-xs text-muted-foreground">{booking.futsal_details.futsal_name}</p>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {booking.owner_profile_picture ? (
                      <img
                        src={booking.owner_profile_picture}
                        alt={booking.owner_name}
                        className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <InitialAvatar name={booking.owner_name} />
                    )}
                    <span className="font-medium">{booking.owner_name}</span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {booking.user_profile_picture ? (
                      <img
                        src={booking.user_profile_picture}
                        alt={booking.user_name}
                        className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <InitialAvatar name={booking.user_name} />
                    )}
                    <span className="font-medium">{booking.user_name}</span>
                  </div>
                </td>

                <td className="px-4 py-3 text-muted-foreground">{booking.slot_details.slot_date}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatTimeLabel(booking.slot_details.start_time)} - {formatTimeLabel(booking.slot_details.end_time)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{statusLabel(booking.payment_status)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs border ${
                    booking.booking_status === "confirmed"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : booking.booking_status === "completed"
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : booking.booking_status === "no_show"
                          ? "bg-gray-100 text-gray-700 border-gray-200"
                          : "bg-red-100 text-red-700 border-red-200"
                  }`}>
                    {statusLabel(booking.booking_status)}
                  </span>
                </td>
              </tr>
            ))}

            {!loading && filtered.length === 0 ? (
              <tr className="border-t border-border">
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No bookings found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}