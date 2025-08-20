// src/pages/AdminPage.tsx
import React, { useMemo, useState, useRef } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import MobileShell from "../components/MobileShell/MobileShell";
import {
  // sessions
  listSessions,
  adminCreateSession,
  adminPatchSession,
  // users
  adminListUsers,
  adminGetUser,
  adminDeposit,
  newIdempotencyKey,
} from "../lib/api";

import FlashBanners from "../components/UI/FlashBanners";
import { flashSuccess, flashError } from "../lib/flash";
import ClickDropdown, { type Option } from "../components/UI/ClickDropdown";
import { formatDollarsFromCents } from "../lib/api";

/* ---------------- Helpers ---------------- */

type DateOption = { label: string; value: string }; // YYYY-MM-DD
type TimeOption = { label: string; value: string }; // HH:mm (24h)

/** Build "Aug 20, Wednesday" for the next N days */
function buildDateOptions(days = 21): DateOption[] {
  const res: DateOption[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const value = `${y}-${m}-${day}`;
    const monthShort = d.toLocaleString("en-US", { month: "short" });
    const weekdayLong = d.toLocaleString("en-US", { weekday: "long" });
    const label = `${monthShort} ${day}, ${weekdayLong}`;
    res.push({ label, value });
  }
  return res;
}

/** Combine local YYYY-MM-DD + HH:mm into UTC ISO string */
function localDateTimeToUTCISO(
  localDateYYYYMMDD: string,
  hhmm: string
): string {
  const isoLocal = `${localDateYYYYMMDD}T${hhmm}:00`; // treated as local
  const date = new Date(isoLocal);
  return date.toISOString(); // UTC Z string
}

function UTCtohhmmTimeForamt(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  return `${hours}:${minutes} ${ampm}`;
}

/** Cents -> dollars (string) */
// const $ = (cents?: number) => Number(cents ?? 0).toFixed(2);

function displayKind(kind: string) {
  const k = (kind || "").toLowerCase();
  if (k === "deposit_in" || k === "deposit-in") return "Deposit";
  if (k === "fee_capture") return "Paid";
  if (k === "refund") return "Refund";
  if (k === "penalty") return "Penalty";
  return k.replace(/_/g, "-"); // fallback
}

/** Format ISO date -> "MM DD" */
function mmdd(iso: string) {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}/${dd}`;
}

/** Hide fee-hold / hold-release ledger kinds */
// function isHiddenKind(kind: string) {
//   return /^(fee[_-]?hold|hold[_-]?release)$/i.test(kind || "");
// }

/* ---------------- Page ---------------- */

type Tab = "create" | "update" | "users";

export default function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("create");

  return (
    <MobileShell>
      <h1 className="page-title">Admin</h1>

      <div className="detail-container" style={{ gap: 16 }}>
        <FlashBanners />

        {/* Horizontally scrollable tab strip */}
        <div
          className="filter-tabs scroll-x"
          role="tablist"
          aria-label="Admin sections"
        >
          <button
            className={`filter-tab ${tab === "create" ? "active" : ""}`}
            onClick={() => setTab("create")}
            role="tab"
            aria-selected={tab === "create"}
          >
            Create Session
          </button>
          <button
            className={`filter-tab ${tab === "update" ? "active" : ""}`}
            onClick={() => setTab("update")}
            role="tab"
            aria-selected={tab === "update"}
          >
            Update Session
          </button>
          <button
            className={`filter-tab ${tab === "users" ? "active" : ""}`}
            onClick={() => setTab("users")}
            role="tab"
            aria-selected={tab === "users"}
          >
            Users
          </button>
        </div>

        {tab === "create" && (
          <CreateSessionCard
            onCreated={() => qc.invalidateQueries({ queryKey: ["sessions"] })}
          />
        )}
        {tab === "update" && <UpdateSessionCard />}
        {tab === "users" && <UsersAdminCard />}
      </div>
    </MobileShell>
  );
}

/* ---------------- Create Session ---------------- */

function CreateSessionCard({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [timezone] = useState("America/Vancouver"); // fixed per your UX
  const [capacity, setCapacity] = useState(16);
  const [priceDollars, setPriceDollars] = useState(13.5);

  /** Default time slots (edit as needed) */
  const DEFAULT_TIMES: TimeOption[] = [
    { label: "6:00 PM", value: "18:00" },
    { label: "6:30 PM", value: "18:30" },
    { label: "7:00 PM", value: "19:00" },
    { label: "7:30 PM", value: "19:30" },
    { label: "8:00 PM", value: "20:00" },
    { label: "8:30 PM", value: "20:30" },
    { label: "9:00 PM", value: "20:30" },
    { label: "9:30 PM", value: "20:30" },
    { label: "10:00 PM", value: "20:30" },
    { label: "10:30 PM", value: "20:30" },
    { label: "11:00 PM", value: "20:30" },
    { label: "11:30 PM", value: "20:30" },
  ];

  // keep your helpers:
  const dateOptions: Option[] = useMemo(() => buildDateOptions(21), []);
  const [dateVal, setDateVal] = useState<string>(dateOptions[0].value);
  const [timeVal, setTimeVal] = useState<string>(DEFAULT_TIMES[2].value);
  const starts_at_utc = useMemo(
    () => localDateTimeToUTCISO(dateVal, timeVal),
    [dateVal, timeVal]
  );
  const fee_cents = useMemo(
    () => Math.max(0, Number(priceDollars) * 100),
    [priceDollars]
  );

  const create = useMutation({
    mutationFn: adminCreateSession,
    onSuccess: () => {
      flashSuccess("✓ Session created!");
      onCreated();
    },
    onError: (e: any) => flashError(String(e?.message || "Create failed")),
  });

  return (
    <>
      <h2 className="section-title">Create Session</h2>

      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Friday Night Smash"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Date</label>
        <ClickDropdown
          value={dateVal}
          valueLabel={dateOptions.find((o) => o.value === dateVal)?.label}
          options={dateOptions}
          onSelect={setDateVal}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Time</label>
        <ClickDropdown
          value={timeVal}
          valueLabel={DEFAULT_TIMES.find((o) => o.value === timeVal)?.label}
          options={DEFAULT_TIMES}
          onSelect={setTimeVal}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Capacity</label>
        <input
          className="form-input"
          type="string"
          //   min={0}
          value={capacity}
          onChange={(e) => setCapacity(Math.max(0, +e.target.value))}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Price (per player, $)</label>
        <input
          className="form-input"
          type="string"
          //   min={0}
          //   step={0.5}
          value={priceDollars}
          onChange={(e) =>
            setPriceDollars(e.target.value === "" ? 0 : Number(e.target.value))
          }
        />
      </div>

      <button
        className="btn btn-primary"
        disabled={create.isPending}
        onClick={() =>
          create.mutate({
            title: title.trim() || null,
            starts_at_utc,
            timezone,
            capacity: Number(capacity),
            fee_cents,
          })
        }
      >
        {create.isPending ? "Creating…" : "Create Session"}
      </button>
      {create.isError && (
        <div className="error" style={{ marginTop: 8 }}>
          {String((create.error as any)?.message || "Create failed")}
        </div>
      )}
    </>
  );
}

/* ---------------- Update Session ---------------- */

function UpdateSessionCard() {
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: listSessions });
  const [sid, setSid] = useState<string>("");
  const s = sessions.data?.find((x) => x.id === sid);
  const sessionOptions: Option[] = React.useMemo(
    () =>
      (sessions.data ?? []).map((x) => ({
        value: x.id,
        label: `${x.title || "Badminton Session"} — ${UTCtohhmmTimeForamt(
          new Date(x.starts_at_utc)
        )}`,
      })),
    [sessions.data]
  );

  const selectedLabel = React.useMemo(
    () => sessionOptions.find((o) => o.value === sid)?.label,
    [sessionOptions, sid]
  );

  const [capacity, setCapacity] = useState<number | "">("");
  const [status, setStatus] = useState<
    "scheduled" | "closed" | "canceled" | ""
  >("");
  type SessionStatus = "scheduled" | "closed" | "canceled";

  const STATUS_OPTIONS: Option[] = [
    { label: "scheduled", value: "scheduled" },
    { label: "closed", value: "closed" },
    { label: "canceled", value: "canceled" },
  ];

  // choose defaults when session changes
  React.useEffect(() => {
    if (s) {
      setCapacity(s.capacity);
      setStatus(s.status as any);
    } else {
      setCapacity("");
      setStatus("");
    }
  }, [sid]);

  const patch = useMutation({
    mutationFn: (payload: {
      capacity?: number;
      status?: "scheduled" | "closed" | "canceled";
    }) => adminPatchSession(sid, payload),
    onSuccess: () => {
      flashSuccess("✓ Session updated");
      qc.invalidateQueries({ queryKey: ["sessions"] });
      if (sid) qc.invalidateQueries({ queryKey: ["session", sid] });
    },
    onError: (e: any) => flashError(String(e?.message || "Update failed")),
  });

  return (
    <>
      <h2 className="section-title">Update Session</h2>

      <div className="form-group">
        <label className="form-label">Select session</label>

        {/* Loading & error states (optional but nice) */}
        {sessions.isLoading && (
          <div className="skeleton" style={{ height: 44 }} />
        )}
        {sessions.error && (
          <div className="error">Failed to load sessions.</div>
        )}

        {!sessions.isLoading && !sessions.error && (
          <ClickDropdown
            value={sid}
            valueLabel={selectedLabel}
            options={[
              // Add a dummy "Select…" option if you want an explicit placeholder
              // { label: "Select…", value: "" },
              ...sessionOptions,
            ]}
            onSelect={setSid}
            placeholder="Select…"
            visibleCount={4} // shows 4 items; rest scroll
            widthPx={340} // optional: widen the panel a bit
          />
        )}
      </div>

      {s && (
        <>
          <div className="session-stats" style={{ marginBottom: 8 }}>
            <div className="stat-item">
              <div className="stat-value">
                {s.confirmed_seats}/{s.capacity}
              </div>
              <div className="stat-label">Registered</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {formatDollarsFromCents(s.fee_cents)}
              </div>
              <div className="stat-label">Per Player</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{s.status}</div>
              <div className="stat-label">Status</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Capacity</label>
            <input
              className="form-input"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) =>
                setCapacity(
                  e.target.value === "" ? "" : Math.max(1, +e.target.value)
                )
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <ClickDropdown
              value={status || undefined} // let placeholder show if empty
              valueLabel={status || undefined} // displays the selected label
              options={STATUS_OPTIONS}
              onSelect={(v) => setStatus(v as SessionStatus)}
              placeholder="Select status"
              visibleCount={3} // show up to 3, rest scroll
              widthPx={260} // optional: panel width
            />
          </div>

          <button
            className="btn btn-primary"
            disabled={patch.isPending}
            onClick={() =>
              patch.mutate({
                ...(capacity !== "" ? { capacity: Number(capacity) } : {}),
                ...(status ? { status } : {}),
              })
            }
          >
            {patch.isPending ? "Saving…" : "Save Changes"}
          </button>
          {patch.isError && (
            <div className="error" style={{ marginTop: 8 }}>
              {String((patch.error as any)?.message || "Update failed")}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ---------------- Users (list + detail + deposit) ---------------- */

function UsersAdminCard() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => adminListUsers(q, 50, 0),
  });

  const detail = useQuery({
    queryKey: ["admin-user", selected],
    queryFn: () => adminGetUser(selected as string, 100),
    enabled: !!selected,
  });

  const idemRef = useRef<string>(newIdempotencyKey());

  const deposit = useMutation({
    mutationFn: ({
      user_id,
      amount_cents,
    }: {
      user_id: string;
      amount_cents: number;
    }) => adminDeposit(user_id, amount_cents, idemRef.current),
    onSuccess: () => {
      flashSuccess("✓ Deposit applied");
      if (selected) detail.refetch();
      list.refetch();
    },
    onError: (e: any) => flashError(String(e?.message || "Deposit failed")),
  });

  // visible rows (simple)
  const users = list.data?.items ?? [];

  return (
    <>
      <h2 className="section-title">Users</h2>

      <div className="form-group">
        <label className="form-label">Search</label>
        <input
          className="form-input"
          value={q}
          placeholder="Name or email"
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="participants-section">
        <div className="section-header">
          <h3 className="section-title">User List</h3>
          <span className="participant-count">{users.length}</span>
        </div>

        <div>
          {users.map((u) => (
            <button
              key={u.id}
              className={`waitlist-item ${selected === u.id ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left" }}
              onClick={() => setSelected(u.id)}
            >
              <div className="waitlist-info">
                <div className="waitlist-name">{u.name}</div>
                <div className="waitlist-seats">{u.email}</div>
              </div>
              <div className="stat-value" style={{ marginLeft: "auto" }}>
                {formatDollarsFromCents(u.available_cents)}
              </div>
            </button>
          ))}
          {list.isLoading && <div className="skeleton" />}
          {list.error && <div className="error">Failed to load users.</div>}
          {!list.isLoading && users.length === 0 && (
            <div className="empty-state">No users found.</div>
          )}
        </div>
      </div>

      {/* Detail */}
      {selected && detail.data && (
        <div className="participants-section">
          <div className="section-header">
            <h3 className="section-title">User Detail</h3>
          </div>

          <div className="participant-card">
            <div className="participant-info">
              <div className="participant-avatar">
                {detail.data.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="participant-details">
                <div className="participant-name">
                  {detail.data.name}{" "}
                  {detail.data.is_admin ? (
                    <span className="guest-badge">admin</span>
                  ) : null}
                </div>
                <div className="participant-meta">
                  {detail.data.email}{" "}
                  {detail.data.phone ? `• ${detail.data.phone}` : ""}
                </div>
                <div className="participant-meta">
                  Status: <strong>{detail.data.status}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet summary + deposit */}
          <div className="cost-display" style={{ marginTop: 12 }}>
            <div>
              <div className="cost-label">Available</div>
              <div className="cost-value">
                {formatDollarsFromCents(detail.data.wallet.available_cents)}
              </div>
            </div>
            <div>
              <div className="cost-label">Posted</div>
              <div className="cost-value">
                {formatDollarsFromCents(detail.data.wallet.posted_cents)}
              </div>
            </div>
            <div>
              <div className="cost-label">Holds</div>
              <div className="cost-value">
                {formatDollarsFromCents(detail.data.wallet.holds_cents)}
              </div>
            </div>
          </div>

          <DepositBox
            busy={deposit.isPending}
            onSubmit={(dollars) =>
              deposit.mutate({
                user_id: selected,
                amount_cents: Math.round(Math.max(0, dollars)),
              })
            }
            errorText={
              deposit.isError
                ? String((deposit.error as any)?.message || "Deposit failed")
                : null
            }
          />

          {/* Ledger (compact) */}
          <div className="participants-section">
            <div className="section-header">
              <h4 className="section-title">Recent Ledger</h4>
              <span className="participant-count">
                {detail.data.ledger.length}
              </span>
            </div>
            <div>
              {detail.data.ledger.map((e) => (
                <div className="waitlist-item" key={e.id}>
                  <div className="waitlist-info">
                    <div className="waitlist-name">
                      {displayKind(e.kind)} {mmdd(e.created_at)}
                    </div>
                  </div>
                  <div className="stat-value" style={{ marginLeft: "auto" }}>
                    {e.amount_cents >= 0 ? "+" : "-"}
                    {formatDollarsFromCents(Math.abs(e.amount_cents))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registrations (compact) */}
          <div className="participants-section">
            <div className="section-header">
              <h4 className="section-title">Registrations</h4>
              <span className="participant-count">
                {detail.data.registrations.length}
              </span>
            </div>
            <div>
              {detail.data.registrations.map((r) => (
                <div className="participant-card" key={r.registration_id}>
                  <div className="participant-info">
                    <div className="participant-details">
                      <div className="participant-name">
                        {r.session_title || r.session_id} —{" "}
                        {UTCtohhmmTimeForamt(new Date(r.starts_at_utc))} (
                      </div>
                      <div className="participant-meta">
                        {r.seats} seat(s)
                        {r.guest_names?.length
                          ? ` • ${r.guest_names.join(", ")}`
                          : ""}
                        {" • "}
                        {r.state}
                        {r.waitlist_pos ? ` #${r.waitlist_pos}` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {detail.isLoading && <div className="skeleton" />}
              {detail.error && (
                <div className="error">Failed to load user details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DepositBox({
  onSubmit,
  busy,
}: //   errorText,
{
  onSubmit: (amountDollars: number) => void;
  busy: boolean;
  //   errorText: string | null;
}) {
  const [amount, setAmount] = useState<string>("");
  const parsed = Number(amount);
  const ok = !Number.isNaN(parsed) && parsed > 0;

  return (
    <div className="detail-container" style={{ marginTop: 12 }}>
      <div className="form-group">
        <label className="form-label">Deposit amount ($)</label>
        <input
          className="form-input"
          type="number"
          min={0}
          step="0.50"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 20"
        />
      </div>
      <button
        className="btn btn-secondary"
        disabled={!ok || busy}
        onClick={() => onSubmit(Number(amount) * 100)}
      >
        {busy ? "Depositing…" : "Deposit"}
      </button>
      {/* {errorText && (
        <div className="error" style={{ marginTop: 8 }}>
          {errorText}
        </div>
      )} */}
    </div>
  );
}
