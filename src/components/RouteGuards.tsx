import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/profile" state={{ from: loc }} replace />;
  return children;
}

export function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return null;
  if (!user) return <Navigate to="/profile" state={{ from: loc }} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}
