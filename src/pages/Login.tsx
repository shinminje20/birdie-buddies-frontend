// src/pages/Login.tsx
import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth"; // <-- use context

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const {
    user,
    requestOtp: requestOtpCtx,
    verifyOtp: verifyOtpCtx,
  } = useAuth();

  const [phase, setPhase] = useState<"enter" | "verify">("enter");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  // If already authed, bounce to main (or where they came from)
  if (user) {
    const to =
      (typeof (loc.state as any)?.from === "string"
        ? (loc.state as any).from
        : (loc.state as any)?.from?.pathname) || "/sessions";
    return <Navigate to={to} replace />;
  }

  async function go() {
    try {
      if (phase === "enter") {
        await requestOtpCtx(email);
        setMsg("Code sent (check server logs in dev).");
        setPhase("verify");
      } else {
        // IMPORTANT: use context verify so it updates user state
        await verifyOtpCtx(email, code, name || undefined);

        const to =
          (typeof (loc.state as any)?.from === "string"
            ? (loc.state as any).from
            : (loc.state as any)?.from?.pathname) || "/sessions";

        nav(to, { replace: true });
      }
    } catch (e: any) {
      setMsg(e.message || "Failed");
    }
  }

  return (
    <div>
      <h2>Login</h2>
      <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {phase === "verify" && (
          <>
            <input
              placeholder="Your name (first time)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </>
        )}
        <button onClick={go}>
          {phase === "enter" ? "Send code" : "Verify"}
        </button>
        <div style={{ color: "#555" }}>{msg}</div>
      </div>
    </div>
  );
}
