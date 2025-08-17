import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";

import SessionsPage from "./pages/SessionsPage";
import SessionDetailPage from "./pages/SessionDetailPage";
import WalletPage from "./pages/WalletPage";
import MyGamesPage from "./pages/MyGamesPage";
import AdminPage from "./pages/AdminPage";
import ProfilePage from "./pages/ProfilePage"; // used as the login screen

// --- Route guards (inline for convenience) ---
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
function RequireGuest({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/sessions" replace />;
  return children;
}
function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/sessions" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Default to /login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public (guest-only) */}
      <Route
        path="/login"
        element={
          <RequireGuest>
            <ProfilePage />
          </RequireGuest>
        }
      />

      {/* Authenticated app */}
      <Route
        path="/sessions"
        element={
          <RequireAuth>
            <SessionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sessions/:id"
        element={
          <RequireAuth>
            <SessionDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/wallet"
        element={
          <RequireAuth>
            <WalletPage />
          </RequireAuth>
        }
      />
      <Route
        path="/my"
        element={
          <RequireAuth>
            <MyGamesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminPage />
          </RequireAdmin>
        }
      />

      {/* Catch-all → /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
