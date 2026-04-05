const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const API_BASE_URL =
  env?.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

const MEDIA_FIELD_KEYS = new Set(["profile_picture", "image"]);

function toAbsoluteMediaUrl(value: string): string {
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("//")) return `${window.location.protocol}${value}`;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/${value}`;
}

function normalizeMediaUrls<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeMediaUrls(item)) as T;
  }

  if (payload && typeof payload === "object") {
    const result: Record<string, unknown> = { ...(payload as Record<string, unknown>) };

    for (const [key, value] of Object.entries(result)) {
      if (typeof value === "string" && MEDIA_FIELD_KEYS.has(key)) {
        result[key] = toAbsoluteMediaUrl(value);
      } else if (value && typeof value === "object") {
        result[key] = normalizeMediaUrls(value);
      }
    }

    return result as T;
  }

  return payload;
}

export interface LoginResponse {
  user: UserProfile;
  message: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  bio: string | null;
  profile_picture: string | null;
  role: "player" | "owner" | "admin";
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FutsalItem {
  id: number;
  owner: number;
  owner_name: string;
  futsal_name: string;
  location: string;
  image: string | null;
  amenities: string[];
  latitude: string | null;
  longitude: string | null;
  description: string | null;
  approval_status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface TimeSlotItem {
  id: number;
  futsal: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  price: string;
  availability_status: "available" | "booked" | "maintenance";
  created_at: string;
}

export interface ReviewItem {
  id: number;
  user: number;
  user_name: string;
  futsal: number;
  futsal_name: string;
  booking: number | null;
  rating: number;
  comment: string | null;
  review_date: string;
  created_at: string;
  updated_at: string;
}

export interface OwnerAdminItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "owner";
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface OwnerVerificationSummary {
  owner: OwnerAdminItem;
  futsals: Array<{
    id: number;
    futsal_name: string;
    location: string;
    approval_status: "pending" | "approved" | "rejected";
    created_at: string;
  }>;
  totals: {
    futsal_count: number;
    approved_count: number;
    pending_count: number;
    rejected_count: number;
  };
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BookingItem {
  id: number;
  user: number;
  user_name: string;
  slot: number;
  slot_details: {
    slot_date: string;
    start_time: string;
    end_time: string;
    price: string;
  };
  futsal_details: {
    futsal_id: number;
    futsal_name: string;
    location: string;
  };
  booking_date: string;
  booking_status: "confirmed" | "cancelled" | "completed" | "no_show";
  payment_status: "pending" | "completed" | "failed" | "refunded";
  created_at: string;
}

interface ApiRequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!headers.has("Content-Type") && options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    let message = "Request failed";

    if (data?.detail) {
      message = data.detail;
    } else if (data?.message) {
      message = data.message;
    } else if (data && typeof data === "object") {
      const firstEntry = Object.entries(data)[0];
      if (firstEntry) {
        const [field, value] = firstEntry;
        if (Array.isArray(value) && value.length > 0) {
          message = `${field}: ${String(value[0])}`;
        } else {
          message = `${field}: ${String(value)}`;
        }
      }
    }

    throw new Error(message);
  }

  return normalizeMediaUrls(data as T);
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/api/auth/session/login/", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function refreshSession(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/session/refresh/", {
    method: "POST",
  });
}

export async function logoutSession(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/session/logout/", {
    method: "POST",
  });
}

export async function register(payload: {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  password2: string;
  role: "player" | "owner";
}): Promise<{ user: UserProfile; message: string }> {
  return request<{ user: UserProfile; message: string }>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe(token?: string): Promise<UserProfile> {
  return request<UserProfile>("/api/users/me/", { method: "GET", token });
}

export async function updateMe(
  payload: Partial<Pick<UserProfile, "first_name" | "last_name" | "phone" | "bio" | "email">> & { profile_picture?: File | null },
  token?: string,
): Promise<UserProfile> {
  if (payload.profile_picture) {
    const form = new FormData();
    if (payload.first_name !== undefined) form.append("first_name", payload.first_name);
    if (payload.last_name !== undefined) form.append("last_name", payload.last_name);
    if (payload.phone !== undefined) form.append("phone", payload.phone);
    if (payload.bio !== undefined) form.append("bio", payload.bio || "");
    if (payload.email !== undefined) form.append("email", payload.email);
    form.append("profile_picture", payload.profile_picture);

    return request<UserProfile>("/api/users/update_profile/", {
      method: "PATCH",
      token,
      body: form,
    });
  }

  return request<UserProfile>("/api/users/update_profile/", {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function getFutsals(): Promise<FutsalItem[]> {
  const data = await request<PaginatedResponse<FutsalItem> | FutsalItem[]>("/api/futsals/", {
    method: "GET",
  });
  return Array.isArray(data) ? data : data.results;
}

export async function getFutsalById(futsalId: number): Promise<FutsalItem & { time_slots?: TimeSlotItem[] }> {
  return request<FutsalItem & { time_slots?: TimeSlotItem[] }>(`/api/futsals/${futsalId}/`, {
    method: "GET",
  });
}

export async function getMyFutsals(token?: string): Promise<FutsalItem[]> {
  return request<FutsalItem[]>("/api/futsals/my_futsals/", {
    method: "GET",
    token,
  });
}

export async function createFutsal(
  payload: Pick<FutsalItem, "futsal_name" | "location" | "description" | "amenities"> & { latitude?: string; longitude?: string; image?: File | null },
  token?: string,
): Promise<FutsalItem> {
  if (payload.image) {
    const form = new FormData();
    form.append("futsal_name", payload.futsal_name);
    form.append("location", payload.location);
    if (payload.description) form.append("description", payload.description);
    form.append("amenities", JSON.stringify(payload.amenities || []));
    if (payload.latitude) form.append("latitude", payload.latitude);
    if (payload.longitude) form.append("longitude", payload.longitude);
    form.append("image", payload.image);

    return request<FutsalItem>("/api/futsals/", {
      method: "POST",
      token,
      body: form,
    });
  }

  return request<FutsalItem>("/api/futsals/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function updateFutsal(
  futsalId: number,
  payload: Partial<Pick<FutsalItem, "futsal_name" | "location" | "description" | "amenities" | "latitude" | "longitude">>,
  token?: string,
): Promise<FutsalItem> {
  return request<FutsalItem>(`/api/futsals/${futsalId}/`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function approveFutsal(futsalId: number, token?: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/futsals/${futsalId}/approve/`, {
    method: "POST",
    token,
  });
}

export async function rejectFutsal(futsalId: number, token?: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/futsals/${futsalId}/reject/`, {
    method: "POST",
    token,
  });
}

export async function getSlots(params: { futsal?: number; slotDate?: string }, token?: string): Promise<TimeSlotItem[]> {
  const query = new URLSearchParams();
  if (params.futsal) query.set("futsal", String(params.futsal));
  if (params.slotDate) query.set("slot_date", params.slotDate);

  const data = await request<PaginatedResponse<TimeSlotItem> | TimeSlotItem[]>(`/api/slots/${query.toString() ? `?${query.toString()}` : ""}`, {
    method: "GET",
    token,
  });

  if (Array.isArray(data)) {
    return data;
  }

  const allResults = [...data.results];
  let nextUrl = data.next;

  while (nextUrl) {
    let nextPath = nextUrl;

    if (nextPath.startsWith(API_BASE_URL)) {
      nextPath = nextPath.slice(API_BASE_URL.length);
    } else if (nextPath.startsWith("http://") || nextPath.startsWith("https://")) {
      const parsed = new URL(nextPath);
      nextPath = `${parsed.pathname}${parsed.search}`;
    }

    const nextPage = await request<PaginatedResponse<TimeSlotItem> | TimeSlotItem[]>(nextPath, {
      method: "GET",
      token,
    });

    if (Array.isArray(nextPage)) {
      allResults.push(...nextPage);
      break;
    }

    allResults.push(...nextPage.results);
    nextUrl = nextPage.next;
  }

  return allResults;
}

export async function updateSlot(
  slotId: number,
  payload: Partial<Pick<TimeSlotItem, "slot_date" | "start_time" | "end_time" | "price" | "availability_status">>,
  token?: string,
): Promise<TimeSlotItem> {
  return request<TimeSlotItem>(`/api/slots/${slotId}/`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function createSlot(
  payload: Pick<TimeSlotItem, "futsal" | "slot_date" | "start_time" | "end_time" | "price">,
  token?: string,
): Promise<TimeSlotItem> {
  return request<TimeSlotItem>("/api/slots/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteSlot(slotId: number, token?: string): Promise<void> {
  await request<null>(`/api/slots/${slotId}/`, {
    method: "DELETE",
    token,
  });
}

export async function getMyBookings(token?: string): Promise<BookingItem[]> {
  const data = await request<PaginatedResponse<BookingItem> | BookingItem[]>("/api/bookings/", {
    method: "GET",
    token,
  });
  return Array.isArray(data) ? data : data.results;
}

export async function createBooking(slotId: number, token?: string): Promise<BookingItem> {
  return request<BookingItem>("/api/bookings/", {
    method: "POST",
    token,
    body: JSON.stringify({ slot: slotId }),
  });
}

export async function cancelBooking(bookingId: number, token?: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/bookings/${bookingId}/cancel/`, {
    method: "POST",
    token,
  });
}

export async function confirmBooking(bookingId: number, token?: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/bookings/${bookingId}/confirm/`, {
    method: "POST",
    token,
  });
}

export async function updateBooking(
  bookingId: number,
  payload: Partial<Pick<BookingItem, "slot" | "booking_status" | "payment_status">>,
  token?: string,
): Promise<BookingItem> {
  return request<BookingItem>(`/api/bookings/${bookingId}/`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteBooking(bookingId: number, token?: string): Promise<void> {
  await request<null>(`/api/bookings/${bookingId}/`, {
    method: "DELETE",
    token,
  });
}

export async function getOwnersForAdmin(token?: string): Promise<OwnerAdminItem[]> {
  return request<OwnerAdminItem[]>("/api/users/owners/", {
    method: "GET",
    token,
  });
}

export async function setOwnerStatus(
  ownerId: number,
  ownerStatus: "active" | "inactive" | "suspended",
  token?: string,
): Promise<{ status: string; owner: OwnerAdminItem }> {
  return request<{ status: string; owner: OwnerAdminItem }>(`/api/users/${ownerId}/set_owner_status/`, {
    method: "POST",
    token,
    body: JSON.stringify({ status: ownerStatus }),
  });
}

export async function getOwnerVerificationSummary(ownerId: number, token?: string): Promise<OwnerVerificationSummary> {
  return request<OwnerVerificationSummary>(`/api/users/${ownerId}/verification_summary/`, {
    method: "GET",
    token,
  });
}

export async function deleteOwnerByAdmin(ownerId: number, token?: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/users/${ownerId}/delete_owner/`, {
    method: "DELETE",
    token,
  });
}

export async function getReviews(params: { futsal?: number; user?: number } = {}, token?: string): Promise<ReviewItem[]> {
  const query = new URLSearchParams();
  if (params.futsal) query.set("futsal", String(params.futsal));
  if (params.user) query.set("user", String(params.user));

  const data = await request<PaginatedResponse<ReviewItem> | ReviewItem[]>(`/api/reviews/${query.toString() ? `?${query.toString()}` : ""}`, {
    method: "GET",
    token,
  });
  return Array.isArray(data) ? data : data.results;
}

export async function createReview(
  payload: { futsal: number; rating: number; comment?: string; booking?: number | null },
  token?: string,
): Promise<ReviewItem> {
  return request<ReviewItem>("/api/reviews/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
