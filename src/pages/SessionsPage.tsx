import { useQuery } from "@tanstack/react-query";
import MobileShell from "../components/MobileShell/MobileShell";
import {
  listSessions,
  type Session,
  formatDollarsFromCents,
  UTCtohhmmTimeForamt,
} from "../lib/api";
import { Link } from "react-router-dom";

export default function SessionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
  });

  return (
    <MobileShell>
      <h1 className="page-title">Upcoming Sessions</h1>

      {isLoading && <div className="skeleton" />}
      {error && <div className="error">Failed to load sessions.</div>}

      <div className="sessions-grid">
        {(data ?? []).map((s: Session) => (
          <Link
            key={s.id}
            to={`/sessions/${s.id}`}
            className="session-card animate-in"
            style={{ textDecoration: "none" }}
          >
            <span
              className={`session-status ${
                s.status === "scheduled"
                  ? "open"
                  : s.status === "closed"
                  ? "closed"
                  : "canceled"
              }`}
            >
              {s.status === "scheduled" ? "Open" : s.status}
            </span>
            <h3 className="session-title">{s.title || "Badminton Session"}</h3>
            <div className="session-datetime">
              {UTCtohhmmTimeForamt(new Date(s.starts_at_utc))}
            </div>
            <div className="session-stats">
              <div className="stat-item">
                <div className="stat-value">
                  {s.confirmed_seats}/{s.capacity}
                </div>
                <div className="stat-label">Registered</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{s.remaining_seats}</div>
                <div className="stat-label">Available</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {formatDollarsFromCents(s.fee_cents)}
                </div>
                <div className="stat-label">Per Player</div>
              </div>
            </div>
          </Link>
        ))}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="empty-state">No Sessions yet.</div>
        )}
      </div>
    </MobileShell>
  );
}
