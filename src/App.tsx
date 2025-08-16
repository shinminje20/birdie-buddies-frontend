import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useMatch,
} from "react-router-dom";
import { useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Sessions from "./pages/Sessions";
import SessionDetail from "./pages/SessionDetail";
import Wallet from "./pages/Wallet";
import Admin from "./pages/Admin";

export default function App() {
  const { user, loading, signOut } = useAuth();
  const loc = useLocation();
  const mSessions = useMatch("/sessions");
  const mWallet = useMatch("/wallet");
  const mAdmin = useMatch("/admin");

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  const authed = !!user;
  const isAdmin = !!(user as any)?.is_admin; // gate admin UI

  return (
    <div>
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="header-content">
          <div className="header-title">
            <div className="header-badge">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="white"
                stroke="white"
                strokeWidth="2"
              >
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="5" r="2" />
                <circle cx="19" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </div>
            BadmintonHub
          </div>
          <div className="header-actions">
            {authed ? (
              <button className="mini-action-btn" onClick={() => signOut()}>
                Logout
              </button>
            ) : (
              <Link
                className="mini-action-btn"
                to="/login"
                state={{ from: loc.pathname }}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Routing */}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              authed ? (
                <Navigate to="/sessions" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/sessions"
            element={authed ? <Sessions /> : <Navigate to="/login" />}
          />
          <Route
            path="/sessions/:id"
            element={authed ? <SessionDetail /> : <Navigate to="/login" />}
          />
          <Route
            path="/wallet"
            element={authed ? <Wallet /> : <Navigate to="/login" />}
          />
          {/* Admin route gated by is_admin */}
          <Route
            path="/admin"
            element={
              authed ? (
                isAdmin ? (
                  <Admin />
                ) : (
                  <Navigate to="/sessions" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<div>Not found</div>} />
        </Routes>
      </main>

      {/* Bottom Navigation (only when authed) */}
      {authed && (
        <nav className="bottom-nav">
          <div className="nav-items">
            <Link
              to="/sessions"
              className={`nav-item ${mSessions ? "active" : ""}`}
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
              <span className="nav-label">Home</span>
            </Link>
            <Link
              to="/wallet"
              className={`nav-item ${mWallet ? "active" : ""}`}
            >
              <svg
                className="nav-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
              </svg>
              <span className="nav-label">Wallet</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className={`nav-item ${mAdmin ? "active" : ""}`}
              >
                <svg
                  className="nav-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="nav-label">Admin</span>
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
