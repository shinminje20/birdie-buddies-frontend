import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelRegistration,
  type enqueueRegister,
  getReqStatus,
  getSession,
  listRegistrations,
  updateGuests,
} from "../lib/api";
import { useRequestSSE, useSessionSSE } from "../lib/sse";
import { useAuth } from "../lib/auth";

function cents(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function SessionDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const sessQ = useQuery({
    queryKey: ["session", id],
    queryFn: () => getSession(id),
  });
  const regsQ = useQuery({
    queryKey: ["regs", id],
    queryFn: () => listRegistrations(id),
  });

  const { user } = useAuth();
  const [editRegId, setEditRegId] = useState<string | null>(null);
  const [editGuests, setEditGuests] = useState<string[]>([]);
  const saveGuests = async (rid: string) => {
    await updateGuests(rid, editGuests);
    setEditRegId(null);
    setEditGuests([]);
    qc.invalidateQueries({ queryKey: ["regs", id] });
    qc.invalidateQueries({ queryKey: ["session", id] });
  };

  useSessionSSE(id, () => {
    qc.invalidateQueries({ queryKey: ["session", id] });
    qc.invalidateQueries({ queryKey: ["regs", id] });
  });

  // registration form state
  const [seats, setSeats] = useState(1);
  const [guestNames, setGuestNames] = useState<string[]>([]);
  const [reqId, setReqId] = useState<string | null>(null);
  const [reqState, setReqState] = useState<string>("");

  const registerMut = useMutation({
    mutationFn: async () => {
      const idem = `ui-${crypto.randomUUID()}`;
      const { request_id } = await enqueueRegister(id, seats, guestNames, idem);
      setReqId(request_id);
      setReqState("queued");
      return request_id;
    },
    onError: (e: any) => {
      setReqState(e.message || "error");
    },
  });

  useRequestSSE(reqId || "", (e) => {
    if (e?.state) setReqState(e.state);
    if (e?.state === "confirmed" || e?.state === "waitlisted") {
      qc.invalidateQueries({ queryKey: ["regs", id] });
      qc.invalidateQueries({ queryKey: ["session", id] });
    }
  });

  async function pollStatusOnce() {
    if (!reqId) return;
    const st = await getReqStatus(reqId);
    setReqState(st.state);
  }

  const confirmed = useMemo(
    () => (regsQ.data || []).filter((r) => r.state === "confirmed"),
    [regsQ.data]
  );
  const waitlist = useMemo(
    () =>
      (regsQ.data || [])
        .filter((r) => r.state === "waitlisted")
        .sort((a, b) => (a.waitlist_pos || 0) - (b.waitlist_pos || 0)),
    [regsQ.data]
  );

  const cancelMut = useMutation({
    mutationFn: (regId: string) => cancelRegistration(regId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regs", id] });
      qc.invalidateQueries({ queryKey: ["session", id] });
    },
  });

  const title = sessQ.data?.title || "Session";
  const starts = sessQ.data ? new Date(sessQ.data.starts_at_utc) : null;
  const timezone = sessQ.data?.timezone;
  const fee = sessQ.data?.fee_cents ?? 0;
  const status = sessQ.data?.status;

  // bottom-sheet open/close
  const [active, setActive] = useState(false);
  useEffect(() => {
    setActive(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const close = () => {
    setActive(false);
    // allow animation to play
    setTimeout(() => nav(".."), 220);
  };

  return (
    <>
      {/* Overlay */}
      <div className={`overlay ${active ? "active" : ""}`} onClick={close} />

      {/* Bottom Sheet */}
      <div
        className={`bottom-sheet ${active ? "active" : ""}`}
        style={{ maxHeight: "95vh" }}
        role="dialog"
        aria-modal="true"
        aria-label="Session details"
      >
        <div className="sheet-handle" />

        {/* Hero */}
        <div className="detail-hero">
          <button className="back-btn" onClick={close} aria-label="Close">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="white"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="detail-title">{title}</h1>
          <div className="detail-meta">
            <div className="meta-item">
              <svg
                className="meta-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {starts ? `${starts.toLocaleString()} (${timezone})` : "—"}
            </div>
            <div className="meta-item">
              <svg
                className="meta-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {`Fee per player: ${cents(fee)}`}
            </div>
            <div className="meta-item">
              <svg
                className="meta-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
              {`Status: ${status}`}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="sheet-content">
          {/* Register Form */}
          <div className="form-section">
            <label className="form-label">Number of Seats</label>
            <div className="seat-selector">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  className={`seat-option ${seats === n ? "selected" : ""}`}
                  onClick={() => {
                    setSeats(n);
                    setGuestNames(
                      Array.from(
                        { length: Math.max(0, n - 1) },
                        (_, i) => guestNames[i] || ""
                      )
                    );
                  }}
                >
                  <div className="seat-number">{n}</div>
                  <div className="seat-desc">
                    {n === 1 ? "Just me" : n === 2 ? "+1 Guest" : "+2 Guests"}
                  </div>
                </button>
              ))}
            </div>

            <div
              className="guest-inputs"
              style={{ display: seats > 1 ? "flex" : "none" }}
            >
              {Array.from({ length: Math.max(0, seats - 1) }).map((_, i) => (
                <input
                  key={i}
                  className="input-field"
                  placeholder={`Guest ${i + 1} name (required)`}
                  value={guestNames[i] || ""}
                  onChange={(e) => {
                    const g = [...guestNames];
                    g[i] = e.target.value;
                    setGuestNames(g);
                  }}
                />
              ))}
            </div>

            <div className="cost-summary">
              <div className="cost-row">
                <span className="cost-label">Session Fee</span>
                <span className="cost-value">
                  {cents(fee)} × {seats}
                </span>
              </div>
              <div className="cost-row">
                <span className="cost-label">Processing Fee</span>
                <span className="cost-value">$0.00</span>
              </div>
              <div className="cost-row">
                <span className="cost-label">Total</span>
                <span className="cost-value">{cents(fee * seats)}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                onClick={() => registerMut.mutate()}
                disabled={
                  registerMut.isPending || sessQ.data?.status !== "scheduled"
                }
              >
                {registerMut.isPending
                  ? "Enqueuing…"
                  : `Confirm Registration - ${cents(fee * seats)}`}
              </button>
              {reqId && (
                <button className="btn-secondary" onClick={pollStatusOnce}>
                  Check status
                </button>
              )}
            </div>
            {reqId && (
              <div style={{ marginTop: 8 }}>
                Request: {reqId} — <b>{reqState}</b>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="participants-section">
            <div className="section-header">
              <h3 className="section-title">Confirmed Players</h3>
              <span className="section-count">{confirmed.length}</span>
            </div>
            {confirmed.map((r) => {
              const isMe = r.host_user_id === user?.id;
              const initials =
                r.host_name
                  ?.split(" ")
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "PL";
              return (
                <div
                  key={r.registration_id}
                  className={`participant-item ${isMe ? "current-user" : ""}`}
                >
                  <div className="participant-avatar">{initials}</div>
                  <div className="participant-info">
                    <div className="participant-name">
                      {isMe ? `${r.host_name} (You)` : r.host_name}
                    </div>
                    <div className="participant-detail">
                      {r.seats} seat{r.seats > 1 ? "s" : ""}{" "}
                      {r.guest_names?.length
                        ? `• With: ${r.guest_names.join(", ")}`
                        : ""}
                    </div>
                  </div>
                  <div className="participant-actions">
                    <button
                      className="mini-action-btn danger"
                      onClick={() => cancelMut.mutate(r.registration_id)}
                    >
                      Cancel
                    </button>
                    {isMe &&
                      (editRegId === r.registration_id ? (
                        <>
                          {Array.from({ length: Math.max(0, r.seats - 1) }).map(
                            (_, i) => (
                              <input
                                key={i}
                                className="input-field"
                                style={{ width: 140 }}
                                placeholder={`Guest ${i + 1} (blank = remove)`}
                                value={
                                  editGuests[i] ?? r.guest_names?.[i] ?? ""
                                }
                                onChange={(e) => {
                                  const g = [...editGuests];
                                  g[i] = e.target.value;
                                  setEditGuests(g);
                                }}
                              />
                            )
                          )}
                          <button
                            className="mini-action-btn"
                            onClick={() => saveGuests(r.registration_id)}
                          >
                            Save
                          </button>
                          <button
                            className="mini-action-btn"
                            onClick={() => {
                              setEditRegId(null);
                              setEditGuests([]);
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="mini-action-btn"
                          onClick={() => {
                            setEditGuests(
                              Array.from(
                                { length: Math.max(0, r.seats - 1) },
                                (_, i) => r.guest_names?.[i] ?? ""
                              )
                            );
                            setEditRegId(r.registration_id);
                          }}
                        >
                          Edit
                        </button>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Waitlist */}
          <div className="participants-section">
            <div className="section-header">
              <h3 className="section-title">Waitlist</h3>
              <span className="section-count">{waitlist.length}</span>
            </div>
            {waitlist.map((r) => (
              <div key={r.registration_id} className="waitlist-item">
                <div className="waitlist-position">{r.waitlist_pos}</div>
                <div className="participant-info">
                  <div className="participant-name">{r.host_name}</div>
                  <div className="participant-detail">
                    {r.seats} seat{r.seats > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
