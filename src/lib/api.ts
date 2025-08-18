// src/lib/api.ts
const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  is_admin: boolean;
}; // /auth/me, /auth/verify-otp :contentReference[oaicite:0]{index=0}

export type Session = {
  id: string;
  title?: string | null;
  starts_at_utc: string; // ISO (UTC)
  timezone: string; // IANA tz
  capacity: number;
  fee_cents: number; // price in cents
  status: "scheduled" | "closed" | "canceled";
  created_at: string;
  confirmed_seats: number;
  remaining_seats: number;
}; // /sessions*, SessionWithStatsOut :contentReference[oaicite:1]{index=1}

export type RegRow = {
  registration_id: string;
  host_user_id: string;
  host_name: string;
  seats: number;
  guest_names?: string[] | null;
  waitlist_pos?: number | null;
  state: "confirmed" | "waitlisted" | "canceled";
}; // list regs for a session + my regs :contentReference[oaicite:2]{index=2}

export type RequestStatus = {
  state: "queued" | "confirmed" | "waitlisted" | "rejected";
  session_id: string;
  user_id: string;
  seats: number;
  guest_names: string[];
  created_at: string;
  registration_id?: string | null;
  waitlist_pos?: number | null;
}; // /requests/{id}/status :contentReference[oaicite:3]{index=3}

export type CancelOut = {
  refund_cents: number;
  penalty_cents: number;
  state: "canceled";
}; // /registrations/{id}/cancel :contentReference[oaicite:4]{index=4}

export type Wallet = {
  posted_cents: number;
  holds_cents: number;
  available_cents: number;
}; // /wallet/me :contentReference[oaicite:5]{index=5}

export type WalletLedgerRow = {
  id: number;
  kind: string;
  amount_cents: number;
  session_id?: string | null;
  registration_id?: string | null;
  created_at: string;
}; // /wallet/me/ledger :contentReference[oaicite:6]{index=6}

function dollarsFromCents(v: number | null | undefined) {
  return Number(v ?? 0).toFixed(2);
}
export const $ = { fromCents: dollarsFromCents };

export async function http<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: unknown } = {}
): Promise<T> {
  const headers = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };

  // If body is a plain object (not string/FormData), JSON-encode it once.
  let body = (init as any).body;
  const isJson = headers["Content-Type"]
    ?.toLowerCase()
    .includes("application/json");
  if (
    body != null &&
    isJson &&
    typeof body !== "string" &&
    !(body instanceof FormData)
  ) {
    body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
    body,
  });

  if (!res.ok) {
    let detail = await res.text().catch(() => "");
    try {
      const j = JSON.parse(detail);
      detail = j.detail ?? detail;
    } catch {}
    throw new Error(detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

/* -------- Auth -------- */
export async function me(): Promise<User> {
  return http<User>("/auth/me"); // :contentReference[oaicite:7]{index=7}
}
export const requestOtp = (email: string) =>
  http<{ sent: boolean; ttl_sec: number }>("/auth/request-otp", {
    method: "POST",
    body: { email: email.trim().toLowerCase() },
  });

export const verifyOtp = (
  email: string,
  code: string,
  name?: string,
  phone?: string
) =>
  http<User>("/auth/verify-otp", {
    method: "POST",
    body: {
      email: email.trim().toLowerCase(),
      // keep leading zeros (do NOT Number() it)
      code: String(code).replace(/\D/g, "").padStart(6, "0"),
      ...(name ? { name: name.trim() } : {}),
      ...(phone ? { phone: phone.trim() } : {}),
    },
  });

export async function logout(): Promise<void> {
  await http<void>("/auth/logout", { method: "POST" }); // :contentReference[oaicite:10]{index=10}
}

/* -------- Sessions -------- */
export async function listSessions(): Promise<Session[]> {
  return http<Session[]>("/sessions"); // :contentReference[oaicite:11]{index=11}
}
export async function getSession(sessionId: string): Promise<Session> {
  return http<Session>(`/sessions/${sessionId}`); // :contentReference[oaicite:12]{index=12}
}

/* -------- Registrations / Requests -------- */
export async function listRegistrationsForSession(
  sessionId: string
): Promise<RegRow[]> {
  return http<RegRow[]>(`/sessions/${sessionId}/registrations`); // :contentReference[oaicite:13]{index=13}
}

export async function myRegistrations(): Promise<RegRow[]> {
  return http<RegRow[]>("/me/registrations"); // :contentReference[oaicite:14]{index=14}
}

export async function enqueueRegistration(
  sessionId: string,
  seats: number,
  guest_names: string[],
  idempotencyKey?: string
): Promise<{ request_id: string; state: "queued" }> {
  const key = idempotencyKey ?? crypto?.randomUUID?.() ?? String(Date.now());
  return http(`/sessions/${sessionId}/register`, {
    method: "POST",
    headers: { "Idempotency-Key": key }, // required :contentReference[oaicite:15]{index=15}
    body: { seats, guest_names },
  });
}

export async function getRequestStatus(
  requestId: string
): Promise<RequestStatus> {
  return http<RequestStatus>(`/requests/${requestId}/status`); // :contentReference[oaicite:16]{index=16}
}

export async function cancelRegistration(
  registrationId: string
): Promise<CancelOut> {
  return http<CancelOut>(`/registrations/${registrationId}/cancel`, {
    method: "POST",
  }); // :contentReference[oaicite:17]{index=17}
}

/* -------- Wallet -------- */
export async function getMyWallet(): Promise<Wallet> {
  return http<Wallet>("/wallet/me"); // :contentReference[oaicite:18]{index=18}
}
export async function getMyWalletLedger(
  limit = 50,
  beforeId?: number
): Promise<WalletLedgerRow[]> {
  const q = new URLSearchParams({
    limit: String(limit),
    ...(beforeId ? { before_id: String(beforeId) } : {}),
  });
  return http<WalletLedgerRow[]>(`/wallet/me/ledger?${q.toString()}`); // :contentReference[oaicite:19]{index=19}
}

/* -------- Admin (create session) -------- */
export async function adminCreateSession(input: {
  title?: string | null;
  starts_at_utc: string; // must be UTC & tz-aware
  timezone: string; // IANA tz
  capacity: number;
  fee_cents: number;
}) {
  return http<Session>("/admin/sessions", {
    method: "POST",
    body: input,
  }); // :contentReference[oaicite:20]{index=20}
}

// --- types (near your other wallet/admin types) ---
export type AdminDepositOut = {
  id: number;
  kind: string; // "deposit_in"
  amount_cents: number;
  user_id: string;
  session_id?: string | null;
  registration_id?: string | null;
  created_at: string; // ISO
};

// --- function (place with your other Admin APIs) ---
export function adminDeposit(
  user_id: string,
  amount_cents: number,
  idempotencyKey?: string
) {
  const key = idempotencyKey ?? crypto?.randomUUID?.() ?? String(Date.now());
  return http<AdminDepositOut>("/admin/deposits", {
    method: "POST",
    // Pass a plain object; your http() should JSON-encode it once
    body: { user_id, amount_cents, idempotency_key: key },
  });
}

// ========= Admin: Sessions =========

export type SessionPatchPayload = {
  capacity?: number; // > 0
  status?: "scheduled" | "closed" | "canceled";
};

// PATCH /admin/sessions/{id}
export function adminPatchSession(
  sessionId: string,
  payload: SessionPatchPayload
) {
  return http<Session>(`/admin/sessions/${sessionId}`, {
    method: "PATCH",
    body: payload, // or JSON.stringify(payload) if your http() doesn't auto-encode
  });
}

// ========= Admin: Users =========

// Rows in the admin users list
export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  is_admin: boolean;
  status: string; // e.g. "active"
  created_at: string; // ISO
  posted_cents: number;
  holds_cents: number;
  available_cents: number; // posted - holds
};

export type AdminUserListOut = {
  items: AdminUserRow[];
  total: number;
};

// GET /admin/users?q=&limit=&offset=
export function adminListUsers(q?: string, limit = 50, offset = 0) {
  const qs = new URLSearchParams();
  if (q && q.trim()) qs.set("q", q.trim());
  qs.set("limit", String(limit));
  qs.set("offset", String(offset));
  return http<AdminUserListOut>(`/admin/users?${qs.toString()}`);
}

// ========= Admin: User detail =========

export type AdminUserWallet = {
  posted_cents: number;
  holds_cents: number;
  available_cents: number;
};

export type AdminLedgerRow = {
  id: number;
  kind: string; // e.g. "deposit_in" | "fee_capture" | ...
  amount_cents: number;
  session_id?: string | null;
  registration_id?: string | null;
  created_at: string; // ISO
};

export type AdminRegistrationRow = {
  registration_id: string;
  session_id: string;
  session_title?: string | null;
  starts_at_utc: string; // ISO (UTC)
  timezone: string; // IANA
  seats: number;
  guest_names: string[];
  state: string; // "confirmed" | "waitlisted" | "canceled"
  waitlist_pos?: number | null;
  created_at: string; // ISO
  canceled_at?: string | null;
};

export type AdminUserDetailOut = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  is_admin: boolean;
  status: string;
  created_at: string; // ISO
  wallet: AdminUserWallet;
  ledger: AdminLedgerRow[]; // most recent first
  registrations: AdminRegistrationRow[]; // with session info
};

// GET /admin/users/{user_id}?ledger_limit=100
export function adminGetUser(userId: string, ledger_limit = 100) {
  const qs = new URLSearchParams({ ledger_limit: String(ledger_limit) });
  return http<AdminUserDetailOut>(`/admin/users/${userId}?${qs.toString()}`);
}

// --- Types (near your other registration types) ---
export type GuestAddOut = {
  registration_id: string;
  state: "confirmed" | "waitlisted";
  waitlist_pos?: number | null;
};

// --- Function ---
export async function addGuest(
  hostRegistrationId: string,
  name: string
): Promise<GuestAddOut> {
  // Send exactly { name } to POST /registrations/{host_registration_id}/guests
  const raw = await http<any>(`/registrations/${hostRegistrationId}/guests`, {
    method: "POST",
    body: { name },
  });

  // Normalize possible backend key variants (reg_id/pos vs registration_id/waitlist_pos)
  return {
    registration_id: raw?.registration_id ?? raw?.reg_id ?? raw?.id,
    state: raw?.state,
    waitlist_pos: raw?.waitlist_pos ?? raw?.pos ?? null,
  } as GuestAddOut;
}
