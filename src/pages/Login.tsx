import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"enter" | "verify">("enter");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation() as any;

  async function go(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email) {
      setMsg("Enter your email");
      return;
    }
    try {
      setBusy(true);
      if (phase === "enter") {
        await requestOtp(email);
        setMsg("Code sent. Check your email.");
        setPhase("verify");
      } else {
        await verifyOtp(email, code, name || undefined);
        const to = loc?.state?.from || "/sessions";
        nav(to, { replace: true });
      }
    } catch (e: any) {
      setMsg(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "16px auto" }}>
      <div className="session-card" style={{ padding: 24 }}>
        <div className="session-header" style={{ marginBottom: 12 }}>
          <div>
            <div className="session-title">Welcome back</div>
            <div className="session-date">Sign in with email + code</div>
          </div>
        </div>
        <form onSubmit={go} style={{ display: "grid", gap: 12 }}>
          <input
            className="input-field"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {phase === "verify" && (
            <>
              <input
                className="input-field"
                placeholder="Your name (first time)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="input-field"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </>
          )}
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy
              ? phase === "enter"
                ? "Sending…"
                : "Verifying…"
              : phase === "enter"
              ? "Send code"
              : "Verify"}
          </button>
          {phase === "verify" && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPhase("enter")}
            >
              Back
            </button>
          )}
          <div style={{ color: "#555", minHeight: 20 }}>{msg}</div>
        </form>
      </div>
    </div>
  );
}
