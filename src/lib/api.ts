// src/lib/api.ts
export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = await res.text().catch(() => "");
    try {
      const j = JSON.parse(detail);
      detail = j.detail ?? detail;
    } catch {}
    throw new Error(`${res.status} ${res.statusText} ${detail}`.trim());
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Auth
export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  is_admin: boolean;
};
export const requestOtp = (email: string) =>
  http<{ sent: boolean; ttl_sec: number }>("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
export const verifyOtp = (email: string, code: string, name?: string) =>
  http<User>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ email, code, name }),
  });
export const me = () => http<User>("/auth/me");

// Sessions
export type SessionRow = {
  id: string;
  title?: string;
  starts_at_utc: string;
  timezone: string;
  capacity: number;
  fee_cents: number;
  status: string;
  created_at: string;
  confirmed_seats?: number;
  remaining_seats?: number;
};
export const listSessions = () => http<SessionRow[]>("/sessions");
export const getSession = (id: string) => http<SessionRow>(`/sessions/${id}`);

// Registrations
export type RegRow = {
  registration_id: string;
  host_user_id: string;
  host_name: string;
  seats: number;
  guest_names: string[];
  waitlist_pos?: number | null;
  state: "confirmed" | "waitlisted" | "canceled";
};
export const listRegistrations = (sid: string) =>
  http<RegRow[]>(`/sessions/${sid}/registrations`);
export const enqueueRegister = (
  sid: string,
  seats: number,
  guest_names: string[],
  idemp: string
) =>
  http<{ request_id: string }>(`/sessions/${sid}/register`, {
    method: "POST",
    headers: { "Idempotency-Key": idemp },
    body: JSON.stringify({ seats, guest_names }),
  });

export type ReqStatus = {
  state: "queued" | "confirmed" | "waitlisted" | "rejected";
  session_id: string;
  user_id: string;
  seats: number;
  guest_names: string[];
  created_at: string;
  registration_id?: string | null;
  waitlist_pos?: number | null;
};

export const getReqStatus = (reqId: string) =>
  http<ReqStatus>(`/requests/${reqId}/status`);

export const cancelRegistration = (regId: string) =>
  http<{ refund_cents: number; penalty_cents: number; state: string }>(
    `/registrations/${regId}/cancel`,
    { method: "POST" }
  );

// Wallet
export type Wallet = {
  posted_cents: number;
  holds_cents: number;
  available_cents: number;
};

export type Ledger = {
  id: number;
  kind: string;
  amount_cents: number;
  session_id?: string | null;
  registration_id?: string | null;
  created_at: string;
};

export const myWallet = () => http<Wallet>("/wallet/me");
export const myLedger = () => http<Ledger[]>("/wallet/me/ledger");

// Admin
export const adminCreateSession = (payload: {
  title?: string;
  starts_at_utc: string;
  timezone: string;
  capacity: number;
  fee_cents: number;
}) =>
  http<SessionRow>("/admin/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const adminPatchSession = (
  sid: string,
  payload: { capacity?: number; status?: "scheduled" | "closed" | "canceled" }
) =>
  http<SessionRow>(`/admin/sessions/${sid}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const adminDeposit = (
  user_id: string,
  amount_cents: number,
  idemp: string
) =>
  http<{ id: number }>(`/admin/deposits`, {
    method: "POST",
    body: JSON.stringify({ user_id, amount_cents, idempotency_key: idemp }),
  });

export const logout = () => http<void>("/auth/logout", { method: "POST" });

export type GuestsUpdateOut = {
  registration_id: string;
  old_seats: number;
  new_seats: number;
  refund_cents: number;
  penalty_cents: number;
  state: string;
};

export const updateGuests = (registrationId: string, guest_names: string[]) =>
  http<GuestsUpdateOut>(`/registrations/${registrationId}/guests`, {
    method: "PATCH",
    body: JSON.stringify({ guest_names }),
  });

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  is_admin: boolean;
  status: string;
  created_at: string;
  posted_cents: number;
  holds_cents: number;
  available_cents: number;
};
export type AdminUserList = { items: AdminUserRow[]; total: number };
export const adminListUsers = (q = "", limit = 50, offset = 0) =>
  http<AdminUserList>(
    `/admin/users?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`
  );

export type AdminUserDetail = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  is_admin: boolean;
  status: string;
  created_at: string;
  wallet: {
    posted_cents: number;
    holds_cents: number;
    available_cents: number;
  };
  ledger: {
    id: number;
    kind: string;
    amount_cents: number;
    session_id?: string | null;
    registration_id?: string | null;
    created_at: string;
  }[];
  registrations: {
    registration_id: string;
    session_id: string;
    session_title?: string | null;
    starts_at_utc: string;
    timezone: string;
    seats: number;
    guest_names: string[];
    state: string;
    waitlist_pos?: number | null;
    created_at: string;
    canceled_at?: string | null;
  }[];
};
export const adminGetUser = (userId: string, ledger_limit = 100) =>
  http<AdminUserDetail>(`/admin/users/${userId}?ledger_limit=${ledger_limit}`);
