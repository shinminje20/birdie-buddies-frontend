import React, { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MobileShell from "../components/MobileShell/MobileShell";
import Button from "../components/UI/Button";
import SeatsSelector from "../components/Session/SeatsSelector";
import { useAuth } from "../lib/auth";
import {
  getSession,
  listRegistrationsForSession,
  enqueueRegistration,
  cancelRegistration,
  type Session,
  type RegRow,
  $,
  getRequestStatus,
} from "../lib/api";
import { useRequestSSE, useSessionSSE } from "../lib/sse";
import FlashBanners from "../components/UI/FlashBanners";
import { flashSuccess, flashError, flashInfo } from "../lib/flash";
import AddGuestInline from "../components/Session/AddGuestInline";

function UTCtohhmmTimeForamt(date: Date): string {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes;

  return `${hours}:${minutes} ${ampm}`;
}

export default function SessionDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();

  const sess = useQuery({
    queryKey: ["session", id],
    queryFn: () => getSession(id),
    enabled: !!id,
  });
  const regs = useQuery({
    queryKey: ["regs", id],
    queryFn: () => listRegistrationsForSession(id),
    enabled: !!id,
  });

  const refetchAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["session", id] });
    qc.invalidateQueries({ queryKey: ["regs", id] });
  }, [id, qc]);

  // live updates on session channel
  useSessionSSE(id, () => refetchAll());

  const [seats, setSeats] = useState(1);
  const [guest1, setGuest1] = useState("");
  const [guest2, setGuest2] = useState("");
  const guestNames = useMemo(() => {
    const arr = [];
    if (seats >= 2 && guest1.trim()) arr.push(guest1.trim());
    if (seats >= 3 && guest2.trim()) arr.push(guest2.trim());
    return arr;
  }, [seats, guest1, guest2]);

  const [requestId, setRequestId] = useState<string | undefined>();
  // listen for async registration result
  useRequestSSE(requestId, () => refetchAll());

  const confirmed = (regs.data ?? []).filter((r) => r.state === "confirmed");
  const waitlist = (regs.data ?? []).filter((r) => r.state === "waitlisted");

  const myReg = (regs.data ?? []).find(
    (r) => r.host_user_id === user?.id && r.state !== "canceled"
  );

  const feeDisplay = sess.data ? $.fromCents(sess.data.fee_cents) : "0.00";
  const totalDisplay = sess.data
    ? (Number(sess.data.fee_cents) * seats).toFixed(2)
    : "0.00";

  if (!sess.data)
    return (
      <MobileShell>
        <div className="skeleton" />
      </MobileShell>
    );
  const s: Session = sess.data;

  return (
    <MobileShell>
      <div className="detail-container">
        <div className="registration-header">
          <h1>{s.title || "Badminton Session"}</h1>
          <div className="detail-meta">
            <div>{UTCtohhmmTimeForamt(new Date(s.starts_at_utc))}</div>
            <div>
              {s.confirmed_seats}/{s.capacity} filled • ${feeDisplay} per player
            </div>
            <div>Status: {s.status}</div>
          </div>
        </div>
        {/* Registration */}
        <div className="registration-card">
          <h3 className="registration-title">Register</h3>
          <div className="form-group">
            <label className="form-label">Seats (1 + up to 2 guests)</label>
            <SeatsSelector value={seats} onChange={setSeats} />
          </div>
          {seats >= 2 && (
            <div className="form-group">
              <label className="form-label">Guest 1 Name</label>
              <input
                className="form-input"
                value={guest1}
                onChange={(e) => setGuest1(e.target.value)}
              />
            </div>
          )}
          {seats >= 3 && (
            <div className="form-group">
              <label className="form-label">Guest 2 Name</label>
              <input
                className="form-input"
                value={guest2}
                onChange={(e) => setGuest2(e.target.value)}
              />
            </div>
          )}
          <div className="cost-display">
            <div>
              <div className="cost-label">Total</div>
              <div className="cost-value">${totalDisplay}</div>
            </div>
          </div>
          <FlashBanners />
          {!myReg && (
            <Button
              disabled={
                !user ||
                requestId !== undefined ||
                seats !== 1 + guestNames.length
              }
              onClick={async () => {
                const res = await enqueueRegistration(s.id, seats, guestNames);
                setRequestId(res.request_id); // will update via SSE/poll
                flashInfo("Registration Submitted!");
                // fallback poll in case SSE infra is blocked:
                setTimeout(async () => {
                  if (!res.request_id) return;
                  try {
                    await getRequestStatus(res.request_id);
                    refetchAll();
                  } catch {}
                }, 2000);
              }}
            >
              {"Register Now"}
            </Button>
          )}
          {myReg && (
            <>
              <button
                className="btn btn-danger"
                style={{ marginTop: 8 }}
                onClick={() =>
                  cancelRegistration(myReg.registration_id).then(refetchAll)
                }
              >
                Cancel My Registration
              </button>

              {/* New: Add guest inline if you have < 3 seats */}
              <AddGuestInline
                hostRegistrationId={myReg.registration_id}
                currentSeats={myReg.seats} // seats = host + guests
                maxSeats={3} // host + up to 2 guests
                onAdded={refetchAll}
              />
            </>
          )}
          <div className="cancellation-note">
            <strong>⚠️ Cancellation Policy:</strong> Full refund before
            midnight. 50% penalty for same-day cancellation.
          </div>
        </div>

        {/* Confirmed */}
        <div className="participants-section">
          <div className="section-header">
            <h2 className="section-title">Confirmed</h2>
            <span className="participant-count">{confirmed.length}</span>
          </div>
          <div>
            {confirmed.map((r: RegRow) => (
              <div className="participant-card" key={r.registration_id}>
                <div className="participant-info">
                  <div className="participant-avatar">
                    {r.host_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="participant-details">
                    <div className="participant-name">
                      {r.host_name}
                      {r.host_user_id === user?.id ? (
                        <span className="guest-badge"> You</span>
                      ) : null}
                    </div>
                    <div className="participant-meta">
                      {r.seats} seat(s)
                      {r.guest_names?.length
                        ? ` • ${r.guest_names.join(", ")}`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Waitlist */}
        <div className="participants-section">
          <div className="section-header">
            <h2 className="section-title">Waitlist</h2>
            <span className="participant-count">{waitlist.length}</span>
          </div>
          <div>
            {waitlist.map((r: RegRow) => (
              <div className="waitlist-item" key={r.registration_id}>
                <div className="waitlist-position">{r.waitlist_pos ?? "-"}</div>
                <div className="waitlist-info">
                  <div className="waitlist-name">{r.host_name}</div>
                  <div className="waitlist-seats">{r.seats} seat(s)</div>
                </div>
                {r.host_user_id === user?.id && (
                  <button
                    className="action-btn danger"
                    onClick={() => {
                      cancelRegistration(r.registration_id).then(refetchAll);
                      refetchAll();
                      flashSuccess("✓ Registration canceled");
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
