import { useState } from "react";
import MobileShell from "../components/MobileShell/MobileShell";
import { useAuth } from "../lib/auth";
// import { logout as apiLogout } from "../lib/api";
import { useNavigate, useLocation, Navigate } from "react-router-dom";

export default function ProfilePage() {
  const {
    user,
    loading,
    requestOtp: requestOtpCtx,
    verifyOtp: verifyOtpCtx,
    signOut,
  } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"enter" | "verify">("enter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authed, bounce to main
  if (!loading && user) {
    const to =
      (typeof (loc.state as any)?.from === "string"
        ? (loc.state as any).from
        : (loc.state as any)?.from?.pathname) || "/sessions";
    return <Navigate to={to} replace />;
  }

  const onRequest = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestOtpCtx(email.trim()); // use context
      setStep("verify");
    } catch (e: any) {
      setError(e.message || "Failed to request code");
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyOtpCtx(email.trim(), code.trim(), name.trim() || undefined); // use context (sets user)
      const to =
        (typeof (loc.state as any)?.from === "string"
          ? (loc.state as any).from
          : (loc.state as any)?.from?.pathname) || "/sessions";
      nav(to, { replace: true }); // navigate after success
    } catch (e: any) {
      setError(e.message || "Failed to verify code");
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    await signOut(); // clears cookie (backend) and user (context)
    nav("/login", { replace: true }); // go to login
  };

  if (loading) {
    return (
      <MobileShell>
        <div className="skeleton" />
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <h1 className="page-title">Profile</h1>

      {!user ? (
        <div className="detail-container">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {step === "enter" && (
            <>
              <div className="form-group">
                <label className="form-label">
                  Name (optional, first login)
                </label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <button
                className="btn btn-primary"
                disabled={busy || !email}
                onClick={onRequest}
              >
                {busy ? "Sending…" : "Send Login Code"}
              </button>
            </>
          )}

          {step === "verify" && (
            <>
              <div className="form-group">
                <label className="form-label">6-digit Code</label>
                <input
                  className="form-input"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary"
                  disabled={busy || code.length < 4}
                  onClick={onVerify}
                >
                  {busy ? "Verifying…" : "Verify & Sign In"}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={onRequest}
                >
                  Resend Code
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="error" style={{ marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="detail-container">
          <div className="participant-card">
            <div className="participant-info">
              <div className="participant-avatar">
                {user.name?.slice(0, 2).toUpperCase() ?? "??"}
              </div>
              <div className="participant-details">
                <div className="participant-name">
                  {user.name || "Unnamed User"}
                </div>
                <div className="participant-meta">
                  {user.email} • Role:{" "}
                  <strong>{user.is_admin ? "admin" : "player"}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="cost-display" style={{ marginTop: 12 }}>
            <div>
              <div className="cost-label">Balance</div>
              {/* <div className="cost-value">
                ${(user.balance ?? 0).toFixed(2)}
              </div> */}
            </div>
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={onLogout}
            >
              Log Out
            </button>
          </div>

          {error && (
            <div className="error" style={{ marginTop: 8 }}>
              {error}
            </div>
          )}
        </div>
      )}
    </MobileShell>
  );
}
