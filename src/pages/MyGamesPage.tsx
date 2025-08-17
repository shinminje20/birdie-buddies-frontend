import React from "react";
import { useQuery } from "@tanstack/react-query";
import MobileShell from "../components/MobileShell/MobileShell";
import { myRegistrations, type RegRow } from "../lib/api";

export default function MyGamesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["me/registrations"],
    queryFn: myRegistrations,
  });

  return (
    <MobileShell>
      <h1 className="page-title">My Registrations</h1>
      {isLoading && <div className="skeleton" />}
      {error && <div className="error">Failed to load.</div>}

      <div className="participant-list">
        {(data ?? []).map((r: RegRow) => (
          <div className="participant-card" key={r.registration_id}>
            <div className="participant-info">
              <div className="participant-avatar">
                {r.host_name.slice(0, 2).toUpperCase()}
              </div>
              <div className="participant-details">
                <div className="participant-name">{r.host_name}</div>
                <div className="participant-meta">
                  {r.seats} seat(s) • {r.state}
                  {r.waitlist_pos ? ` • #${r.waitlist_pos}` : ""}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="empty-state">No registrations yet.</div>
        )}
      </div>
    </MobileShell>
  );
}
