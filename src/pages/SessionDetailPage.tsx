import { useCallback, useMemo, useState } from "react";
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
  formatDollarsFromCents,
  UTCtohhmmTimeForamt,
  getRequestStatus,
  // MARK: added
  getMyWallet,
} from "../lib/api";
import { useRequestSSE, useSessionSSE } from "../lib/sse";
import FlashBanners from "../components/UI/FlashBanners";
import { flashSuccess, flashInfo, flashWarn } from "../lib/flash";
import AddGuestInline from "../components/Session/AddGuestInline";

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
  // MARK: added — my wallet summary
  const wallet = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: () => getMyWallet(),
    enabled: !!user, // fetch only when logged in
  });

  const refetchAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["session", id] });
    qc.invalidateQueries({ queryKey: ["regs", id] });
    qc.invalidateQueries({ queryKey: ["wallet", user?.id] });
  }, [id, qc, user?.id]);

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

  const [showAll, setShowAll] = useState(false);
  const confirmedTopSix = showAll ? confirmed : confirmed.slice(0, 6);

  //   const myReg = (regs.data ?? []).find(
  //     (r) => r.host_user_id === user?.id && r.state !== "canceled"
  //   );

  // all my active regs (confirmed or waitlisted) in this session
  const myRegs = (regs.data ?? []).filter(
    (r) => r.host_user_id === user?.id && r.state !== "canceled"
  );

  // pick the host registration row:
  // - if there's a combined row (seats>1), it's the host
  // - else use the row with no guest_names (seats=1, host seat)
  const hostReg =
    myRegs.find((r) => r.seats > 1) ??
    myRegs.find((r) => !r.guest_names || r.guest_names.length === 0) ??
    null;

  // total active seats I currently hold (host + guests)
  const myActiveSeatCount = myRegs.reduce((sum, r) => sum + (r.seats || 0), 0);

  const hasMyReg = myRegs.length > 0;

  const feeDisplay = sess.data
    ? formatDollarsFromCents(sess.data.fee_cents)
    : "0.0";
  const totalDisplay = sess.data
    ? formatDollarsFromCents(sess.data.fee_cents * seats)
    : "0.0";

  // MARK: added — affordability calculation
  const requiredCents = sess.data ? Number(sess.data.fee_cents) * seats : 0;
  const availableCents = wallet.data?.available_cents ?? 0;
  const canAfford = availableCents >= requiredCents;
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
          <label className="session-header">
            {s.title || "Badminton Session"}
          </label>
          <div className="detail-meta">
            <div>{UTCtohhmmTimeForamt(new Date(s.starts_at_utc))}</div>
            <div>
              {s.confirmed_seats}/{s.capacity} filled • {feeDisplay} per player
            </div>
            <div>Status: {s.status}</div>
          </div>
        </div>
        {/* Registration */}
        <div className="registration-card">
          {!hasMyReg ? (
            <>
              <label className="registration-title">Register</label>
              <FlashBanners />
              <div className="seat-selection">
                {/* <label className="form-label">Seats (1 + up to 2 guests)</label> */}
                <SeatsSelector value={seats} onChange={setSeats} />
              </div>

              {seats >= 2 && (
                <div className="form-group">
                  <label className="form-label-dark">Guest 1 Name</label>
                  <input
                    className="form-input-dark"
                    value={guest1}
                    placeholder="guest name"
                    onChange={(e) => setGuest1(e.target.value)}
                  />
                </div>
              )}

              {seats >= 3 && (
                <div className="form-group">
                  <label className="form-label-dark">Guest 2 Name</label>
                  <input
                    className="form-input-dark"
                    value={guest2}
                    placeholder="guest name"
                    onChange={(e) => setGuest2(e.target.value)}
                  />
                </div>
              )}

              <div className="cost-display">
                <div>
                  <div className="cost-label">Total</div>
                  <div className="cost-value">{totalDisplay}</div>
                </div>
              </div>

              <Button
                disabled={
                  !user ||
                  requestId !== undefined ||
                  seats !== 1 + guestNames.length
                  // (wallet.isSuccess && !canAfford) // MARK: added — block when low balance
                }
                onClick={async () => {
                  // MARK: safety
                  if (wallet.isSuccess && !canAfford) {
                    flashWarn(
                      `Insufficient deposit for ${seats} seat${
                        seats > 1 ? "s" : ""
                      }. Required: ${totalDisplay}. Please contact an admin to top up.`
                    );
                    return;
                  }
                  const res = await enqueueRegistration(
                    s.id,
                    seats,
                    guestNames
                  );
                  setRequestId(res.request_id); // will update via SSE/poll
                  flashInfo("Registration submitted!");
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
                Register Now
              </Button>
            </>
          ) : (
            <>
              {/* Already registered: manage/cancel */}
              <FlashBanners />

              {/* Show a friendly hint */}
              <div className="info-banner" style={{ marginBottom: 8 }}>
                You’re already registered.
              </div>

              {myActiveSeatCount < 3 ? (
                <></>
              ) : (
                <div className="warning-banner" style={{ marginTop: 8 }}>
                  You’ve reached the maximum 2 guests.
                </div>
              )}

              {/* Cancel always targets the host registration so guest regs cascade */}
              {hostReg && (
                <button
                  className="btn btn-danger"
                  style={{ marginTop: 8 }}
                  onClick={() =>
                    cancelRegistration(hostReg.registration_id).then(refetchAll)
                  }
                >
                  Cancel My Registration
                </button>
              )}

              {/* Add guest: hide/disable when max reached */}
              {myActiveSeatCount < 3 ? (
                hostReg && (
                  <AddGuestInline
                    hostRegistrationId={hostReg.registration_id}
                    currentSeats={myActiveSeatCount} // total active seats across my regs
                    maxSeats={3} // host + up to 2 guests
                    // MARK: optional: pass wallet info so AddGuestInline can disable if < one more seat
                    // walletAvailableCents={availableCents}
                    // seatFeeCents={Number(s.fee_cents)}
                    onAdded={refetchAll}
                  />
                )
              ) : (
                <></>
              )}
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
            {confirmedTopSix.map((r: RegRow) => (
              <div className="participant-card" key={r.registration_id}>
                <div className="participant-info">
                  <div className="participant-avatar">
                    {r.host_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="participant-details">
                    <div className="participant-name">
                      {/* {r.seats} seat(s) */}
                      {r.guest_names?.length
                        ? `(Guest): ${r.guest_names.join(", ")}`
                        : ""}
                    </div>
                    <div
                      className={
                        r.guest_names?.length
                          ? "participant-meta"
                          : "participant-name"
                      }
                    >
                      {r.guest_names?.length
                        ? `invited by: ${r.host_name}`
                        : r.host_name}
                      {r.host_user_id === user?.id ? (
                        <span className="guest-badge"> You</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {confirmed.length > 6 && (
          <button
            className="btn btn-primary"
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll ? "Show less" : `Show all ${confirmed.length}`}
          </button>
        )}

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
                  <div className="waitlist-details">
                    <div className="waitlist-name">{r.host_name}</div>
                    <div className="waitlist-meta">
                      {r.seats} seat(s)
                      {r.guest_names?.length
                        ? ` • ${r.guest_names.join(", ")}`
                        : ""}
                    </div>
                  </div>
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
