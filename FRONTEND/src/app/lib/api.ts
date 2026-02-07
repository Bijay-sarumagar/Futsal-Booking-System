const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const API_BASE_URL =
  env?.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:8000`;

const MEDIA_FIELD_KEYS = new Set([
  "profile_picture",
  "image",
  "user_profile_picture",
  "owner_profile_picture",
  "esewa_qr_image",
  "fonepay_qr_image",
  "payment_proof_image",
]);

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
  esewa_qr_image: string | null;
  fonepay_qr_image: string | null;
  preferred_qr_provider: "esewa" | "fonepay";
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
  profile_picture: string | null;
  role: "owner";
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface AdminUserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
  role: "player" | "owner" | "admin";
  status: "active" | "inactive" | "suspended";
  created_at: string;
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
  user_profile_picture: string | null;
  owner_name: string;
  owner_profile_picture: string | null;
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
  payment_proof_image?: string | null;
  created_at: string;
}

export interface PaymentItem {
  id: number;
  booking: number;
  booking_details: {
    booking_id: number;
    user: string;
    futsal: string;
  };
  amount: string;
  payment_method: string;
  payment_status: "pending" | "completed" | "failed" | "refunded";
  transaction_id: string | null;
  payment_date: string;
  created_at: string;
}

export interface OpponentPostItem {
  id: number;
  user: number;
  user_name: string;
  user_profile_picture: string | null;
  matched_with: number | null;
  matched_with_name: string | null;
  matched_with_profile_picture: string | null;
  location: string;
  preferred_date: string;
  preferred_start_time: string;
  preferred_end_time: string;
  skill_level: "casual" | "intermediate" | "advanced";
  notes: string;
  status: "open" | "matched" | "closed";
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: number;
  user: number;
  message: string;
  notification_type: "booking" | "payment" | "alert" | "review" | "opponent" | "system";
  related_booking: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface AiChatHistoryItem {
  role: "assistant" | "user";
  content: string;
}

export interface AiChatResponse {
  reply: string;
  model: string;
  provider: string;
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

  const rawText = await response.text();
  const isJson = response.headers.get("content-type")?.includes("application/json");
  let data: unknown = null;

  if (rawText) {
    if (isJson) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    } else {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    }
  }

  if (!response.ok) {
    let message = `Request failed (HTTP ${response.status})`;

    if (data && typeof data === "object" && "detail" in data && typeof (data as { detail?: unknown }).detail === "string") {
      message = (data as { detail: string }).detail;
    } else if (data && typeof data === "object" && "message" in data && typeof (data as { message?: unknown }).message === "string") {
      message = (data as { message: string }).message;
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
    } else if (rawText) {
      const compact = rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (compact) {
        message = compact.slice(0, 220);
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

export async function changePassword(
  payload: { old_password: string; new_password: string; confirm_password: string },
  token?: string,
): Promise<{ message: string }> {
  return request<{ message: string }>("/api/users/change_password/", {
    method: "POST",
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
  payload: Pick<FutsalItem, "futsal_name" | "location" | "description" | "amenities" | "preferred_qr_provider"> & {
    latitude?: string;
    longitude?: string;
    image?: File | null;
    esewa_qr_image?: File | null;
    fonepay_qr_image?: File | null;
  },
  token?: string,
): Promise<FutsalItem> {
  if (payload.image || payload.esewa_qr_image || payload.fonepay_qr_image) {
    const form = new FormData();
    form.append("futsal_name", payload.futsal_name);
    form.append("location", payload.location);
    if (payload.description) form.append("description", payload.description);
    form.append("amenities", JSON.stringify(payload.amenities || []));
    form.append("preferred_qr_provider", payload.preferred_qr_provider);
    if (payload.latitude) form.append("latitude", payload.latitude);
    if (payload.longitude) form.append("longitude", payload.longitude);
    if (payload.image) form.append("image", payload.image);
    if (payload.esewa_qr_image) form.append("esewa_qr_image", payload.esewa_qr_image);
    if (payload.fonepay_qr_image) form.append("fonepay_qr_image", payload.fonepay_qr_image);

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
  payload: Partial<Pick<FutsalItem, "futsal_name" | "location" | "description" | "amenities" | "latitude" | "longitude" | "preferred_qr_provider">> & {
    image?: File | null;
    esewa_qr_image?: File | null;
    fonepay_qr_image?: File | null;
  },
  token?: string,
): Promise<FutsalItem> {
  if (payload.image || payload.esewa_qr_image || payload.fonepay_qr_image) {
    const form = new FormData();
    if (payload.futsal_name !== undefined) form.append("futsal_name", payload.futsal_name);
    if (payload.location !== undefined) form.append("location", payload.location);
    if (payload.description !== undefined) form.append("description", payload.description || "");
    if (payload.amenities !== undefined) form.append("amenities", JSON.stringify(payload.amenities || []));
    if (payload.latitude !== undefined && payload.latitude !== null) form.append("latitude", payload.latitude);
    if (payload.longitude !== undefined && payload.longitude !== null) form.append("longitude", payload.longitude);
    if (payload.preferred_qr_provider !== undefined) form.append("preferred_qr_provider", payload.preferred_qr_provider);
    if (payload.image) form.append("image", payload.image);
    if (payload.esewa_qr_image) form.append("esewa_qr_image", payload.esewa_qr_image);
    if (payload.fonepay_qr_image) form.append("fonepay_qr_image", payload.fonepay_qr_image);

    return request<FutsalItem>(`/api/futsals/${futsalId}/`, {
      method: "PATCH",
      token,
      body: form,
    });
  }

  return request<FutsalItem>(`/api/futsals/${futsalId}/`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteFutsal(futsalId: number, token?: string): Promise<void> {
  await request<void>(`/api/futsals/${futsalId}/`, {
    method: "DELETE",
    token,
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

export async function getBookingById(bookingId: number, token?: string): Promise<BookingItem> {
  return request<BookingItem>(`/api/bookings/${bookingId}/`, {
    method: "GET",
    token,
  });
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

export async function getUsersForAdmin(token?: string): Promise<AdminUserItem[]> {
  return request<AdminUserItem[]>("/api/users/admin_users/", {
    method: "GET",
    token,
  });
}

export async function setUserStatusForAdmin(
  userId: number,
  userStatus: 'active' | 'inactive',
  token?: string,
): Promise<{ status: string; user: AdminUserItem }> {
  return request<{ status: string; user: AdminUserItem }>(`/api/users/${userId}/set_user_status/`, {
    method: 'POST',
    token,
    body: JSON.stringify({ status: userStatus }),
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

export async function initiateEsewaPayment(bookingId: number, token?: string): Promise<{
  gateway: "esewa";
  payment_url: string;
  fields: Record<string, string>;
}> {
  return request<{ gateway: "esewa"; payment_url: string; fields: Record<string, string> }>("/api/payments/esewa/initiate/", {
    method: "POST",
    token,
    body: JSON.stringify({ booking_id: bookingId }),
  });
}

export async function verifyEsewaPayment(
  payload: { booking_id: number; data?: string; status?: string; ref_id?: string },
  token?: string,
): Promise<{ status: string; payment_status: "completed" | "failed" }> {
  return request<{ status: string; payment_status: "completed" | "failed" }>("/api/payments/esewa/verify/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function confirmOwnerQrPayment(
  payload: { booking_id: number; transaction_id?: string },
  token?: string,
): Promise<{ status: string; payment_status: "completed" }> {
  return request<{ status: string; payment_status: "completed" }>("/api/payments/owner-qr/confirm/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function uploadPaymentProof(
  payload: { booking_id: number; payment_proof_image: File },
  token?: string,
): Promise<{ status: string; payment_status: "pending" }> {
  const form = new FormData();
  form.append("booking_id", String(payload.booking_id));
  form.append("payment_proof_image", payload.payment_proof_image);

  return request<{ status: string; payment_status: "pending" }>("/api/payments/upload-proof/", {
    method: "POST",
    token,
    body: form,
  });
}

export async function refundBookingPayment(bookingId: number, token?: string): Promise<{ status: string; payment_status: "refunded" }> {
  return request<{ status: string; payment_status: "refunded" }>("/api/payments/refund/", {
    method: "POST",
    token,
    body: JSON.stringify({ booking_id: bookingId }),
  });
}

export async function getPayments(token?: string): Promise<PaymentItem[]> {
  const data = await request<PaginatedResponse<PaymentItem> | PaymentItem[]>("/api/payments/", {
    method: "GET",
    token,
  });
  return Array.isArray(data) ? data : data.results;
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

export async function updateReview(
  reviewId: number,
  payload: { rating: number; comment?: string },
  token?: string,
): Promise<ReviewItem> {
  return request<ReviewItem>(`/api/reviews/${reviewId}/`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });
}

export async function deleteReview(reviewId: number, token?: string): Promise<void> {
  await request<void>(`/api/reviews/${reviewId}/`, {
    method: "DELETE",
    token,
  });
}

export async function getOpponentPosts(token?: string): Promise<OpponentPostItem[]> {
  return request<OpponentPostItem[]>("/api/bookings/opponent-posts/", {
    method: "GET",
    token,
  });
}

export async function createOpponentPost(
  payload: Pick<OpponentPostItem, "location" | "preferred_date" | "preferred_start_time" | "preferred_end_time" | "skill_level" | "notes">,
  token?: string,
): Promise<OpponentPostItem> {
  return request<OpponentPostItem>("/api/bookings/opponent-posts/", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function joinOpponentPost(postId: number, token?: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/bookings/opponent-posts/${postId}/join/`, {
    method: "POST",
    token,
  });
}

export async function closeOpponentPost(postId: number, token?: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/bookings/opponent-posts/${postId}/close/`, {
    method: "POST",
    token,
  });
}

export async function leaveOpponentPost(postId: number, token?: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/bookings/opponent-posts/${postId}/leave/`, {
    method: "POST",
    token,
  });
}

export async function getMyNotifications(token?: string): Promise<NotificationItem[]> {
  const data = await request<PaginatedResponse<NotificationItem> | NotificationItem[]>("/api/notifications/", {
    method: "GET",
    token,
  });
  return Array.isArray(data) ? data : data.results;
}

export async function markNotificationAsRead(notificationId: number, token?: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/api/notifications/${notificationId}/mark_as_read/`, {
    method: "POST",
    token,
  });
}

export async function markAllNotificationsAsRead(token?: string): Promise<{ status: string }> {
  return request<{ status: string }>("/api/notifications/mark_all_as_read/", {
    method: "POST",
    token,
  });
}

export async function askAiAssistant(
  message: string,
  history: AiChatHistoryItem[] = [],
  token?: string,
): Promise<AiChatResponse> {
  return request<AiChatResponse>("/api/ai/chat/", {
    method: "POST",
    token,
    body: JSON.stringify({ message, history }),
  });
}
