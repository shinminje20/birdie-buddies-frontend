import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
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
  const wallet = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: () => getMyWallet(),
    enabled: !!user, // fetch only when logged in
  });

  const refetchAll = useCallback(async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["session", id] }),
      qc.invalidateQueries({ queryKey: ["regs", id] }),
      qc.invalidateQueries({ queryKey: ["wallet", user?.id] }),
    ]);
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Use ref to track if we should continue polling
  const shouldPollRef = useRef<boolean>(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // SSE handler - simple version that just refetches data
  useRequestSSE(requestId, async () => {
    if (!requestId) return;

    // Stop polling if it's running
    shouldPollRef.current = false;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
    }

    // Refetch data
    await refetchAll();

    // Clear loading state after a short delay to ensure UI updates
    setTimeout(() => {
      setIsProcessing(false);
      setRequestId(undefined);
      flashSuccess("Registration confirmed!");
    }, 500);
  });

  const confirmed = (regs.data ?? []).filter((r) => r.state === "confirmed");
  const waitlist = (regs.data ?? []).filter((r) => r.state === "waitlisted");

  const [showAll, setShowAll] = useState(false);
  const confirmedTopSix = showAll ? confirmed : confirmed.slice(0, 6);

  const myRegs = (regs.data ?? []).filter(
    (r) => r.host_user_id === user?.id && r.state !== "canceled"
  );

  const hostReg =
    myRegs.find((r) => r.seats > 1) ??
    myRegs.find((r) => !r.guest_names || r.guest_names.length === 0) ??
    null;

  const myActiveSeatCount = myRegs.reduce((sum, r) => sum + (r.seats || 0), 0);
  const hasMyReg = myRegs.length > 0;

  const feeDisplay = sess.data
    ? formatDollarsFromCents(sess.data.fee_cents)
    : "0.0";
  const totalDisplay = sess.data
    ? formatDollarsFromCents(sess.data.fee_cents * seats)
    : "0.0";

  const requiredCents = sess.data ? Number(sess.data.fee_cents) * seats : 0;
  const availableCents = wallet.data?.available_cents ?? 0;
  const canAfford = availableCents >= requiredCents;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldPollRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  const handleRegistration = async () => {
    if (wallet.isSuccess && !canAfford) {
      flashWarn(
        `Insufficient deposit for ${seats} seat${
          seats > 1 ? "s" : ""
        }. Required: ${totalDisplay}. Please contact an admin to top up.`
      );
      return;
    }

    setIsProcessing(true);
    shouldPollRef.current = true;

    try {
      const res = await enqueueRegistration(s.id, seats, guestNames);
      setRequestId(res.request_id);
      flashInfo("Registration submitted!");

      // Start polling as backup (in case SSE doesn't work)
      let attempts = 0;
      const maxAttempts = 15;

      const pollStatus = async () => {
        // Check if we should continue polling
        if (!shouldPollRef.current || attempts >= maxAttempts) {
          if (attempts >= maxAttempts) {
            setIsProcessing(false);
            setRequestId(undefined);
            flashWarn(
              "Registration is taking longer than expected. Please refresh the page."
            );
          }
          return;
        }

        attempts++;

        try {
          // Try to get request status
          await getRequestStatus(res.request_id);

          // If successful, refetch data
          await refetchAll();

          // Check if registration now exists
          await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay for data propagation
          const updatedRegs = await qc.fetchQuery({
            queryKey: ["regs", id],
            queryFn: () => listRegistrationsForSession(id),
          });

          const hasNewReg = updatedRegs?.some(
            (r) => r.host_user_id === user?.id && r.state !== "canceled"
          );

          if (hasNewReg) {
            shouldPollRef.current = false;
            setIsProcessing(false);
            setRequestId(undefined);
            flashSuccess("Registration confirmed!");
            return;
          }
        } catch (error) {
          // Request not ready yet, continue polling
        }

        // Schedule next poll if we should continue
        if (shouldPollRef.current) {
          pollTimeoutRef.current = setTimeout(pollStatus, 1500);
        }
      };

      // Start polling after 2 seconds (give SSE a chance first)
      pollTimeoutRef.current = setTimeout(pollStatus, 2000);
    } catch (error) {
      setIsProcessing(false);
      setRequestId(undefined);
      shouldPollRef.current = false;
      flashWarn("Failed to submit registration. Please try again.");
    }
  };

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

        <div className="registration-card">
          {!hasMyReg ? (
            <>
              <label className="registration-title">Register</label>
              <FlashBanners />
              <div className="">
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
                  !user || isProcessing || seats !== 1 + guestNames.length
                }
                onClick={handleRegistration}
              >
                {isProcessing ? "Processing..." : "Register Now"}
              </Button>
            </>
          ) : (
            <>
              <FlashBanners />
              <div className="info-banner" style={{ marginBottom: 8 }}>
                You are registered!
              </div>

              {hostReg && (
                <button
                  className="btn btn-danger"
                  style={{ marginTop: 8 }}
                  disabled={isCanceling}
                  onClick={async () => {
                    const confirmed = window.confirm(
                      "Are you sure you want to cancel your registration? This action cannot be undone."
                    );
                    if (confirmed) {
                      setIsCanceling(true);
                      try {
                        await cancelRegistration(hostReg.registration_id);

                        // Wait for backend to process
                        await new Promise((resolve) =>
                          setTimeout(resolve, 500)
                        );

                        // Refetch and wait for the data to update
                        await Promise.all([
                          qc.refetchQueries({ queryKey: ["session", id] }),
                          qc.refetchQueries({ queryKey: ["regs", id] }),
                          qc.refetchQueries({ queryKey: ["wallet", user?.id] }),
                        ]);

                        // Verify the cancellation was successful
                        const updatedRegs = await qc.fetchQuery({
                          queryKey: ["regs", id],
                          queryFn: () => listRegistrationsForSession(id),
                        });

                        const stillRegistered = updatedRegs?.some(
                          (r) =>
                            r.registration_id === hostReg.registration_id &&
                            r.state !== "canceled"
                        );

                        if (!stillRegistered) {
                          flashSuccess("Registration canceled successfully");
                        } else {
                          flashWarn(
                            "Cancellation is being processed. Please wait..."
                          );
                          // Try to refetch again after a delay
                          setTimeout(() => refetchAll(), 1000);
                        }
                      } catch (error) {
                        console.error("Cancellation error:", error);
                        flashWarn(
                          "Failed to cancel registration. Please try again."
                        );
                      } finally {
                        setIsCanceling(false);
                      }
                    }
                  }}
                >
                  {isCanceling ? "Canceling..." : "Cancel My Registration"}
                </button>
              )}

              {myActiveSeatCount < 3 && hostReg && (
                <AddGuestInline
                  hostRegistrationId={hostReg.registration_id}
                  currentSeats={myActiveSeatCount}
                  maxSeats={3}
                  onAdded={refetchAll}
                />
              )}

              {myActiveSeatCount >= 3 && (
                <div className="warning-banner" style={{ marginTop: 8 }}>
                  You've reached the maximum 2 guests.
                </div>
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
            <span className="participant-count">{s.confirmed_seats}</span>
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
                      {r.guest_names?.length ? `${r.host_name}` : r.host_name}
                    </div>
                    <div
                      className={
                        r.guest_names?.length
                          ? "participant-meta"
                          : "participant-name"
                      }
                    >
                      {r.guest_names?.length
                        ? `(Guest) ${r.guest_names.join(", ")}`
                        : ""}
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
                    disabled={isCanceling}
                    onClick={async () => {
                      const confirmed = window.confirm(
                        "Are you sure you want to cancel your waitlist registration?"
                      );
                      if (confirmed) {
                        setIsCanceling(true);
                        try {
                          await cancelRegistration(r.registration_id);

                          // Wait for backend to process
                          await new Promise((resolve) =>
                            setTimeout(resolve, 500)
                          );

                          // Refetch and wait for the data to update
                          await Promise.all([
                            qc.refetchQueries({ queryKey: ["session", id] }),
                            qc.refetchQueries({ queryKey: ["regs", id] }),
                            qc.refetchQueries({
                              queryKey: ["wallet", user?.id],
                            }),
                          ]);

                          // Verify the cancellation was successful
                          const updatedRegs = await qc.fetchQuery({
                            queryKey: ["regs", id],
                            queryFn: () => listRegistrationsForSession(id),
                          });

                          const stillInWaitlist = updatedRegs?.some(
                            (reg) =>
                              reg.registration_id === r.registration_id &&
                              reg.state === "waitlisted"
                          );

                          if (!stillInWaitlist) {
                            flashSuccess(
                              "Waitlist registration canceled successfully"
                            );
                          } else {
                            flashWarn(
                              "Cancellation is being processed. Please wait..."
                            );
                            // Try to refetch again after a delay
                            setTimeout(() => refetchAll(), 1000);
                          }
                        } catch (error) {
                          console.error("Cancellation error:", error);
                          flashWarn(
                            "Failed to cancel registration. Please try again."
                          );
                        } finally {
                          setIsCanceling(false);
                        }
                      }
                    }}
                  >
                    {isCanceling ? "..." : "Cancel"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isProcessing &&
        createPortal(
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner" />
              <div className="loading-text">
                Processing registration...
                <div
                  style={{ fontSize: "0.9em", marginTop: "8px", opacity: 0.8 }}
                >
                  This may take a few seconds
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </MobileShell>
  );
}
