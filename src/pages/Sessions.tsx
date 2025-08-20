import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listSessions } from "../lib/api";
import { Link } from "react-router-dom";
import { useSessionSSE } from "../lib/sse";
import { useState } from "react";
import { formatDollarsFromCents } from "../lib/api";

/** Small helper that legally uses a hook at top-level */
function SessionSSE({ id, onEvent }: { id: string; onEvent: () => void }) {
  useSessionSSE(id, onEvent);
  return null;
}

// function cents(n?: number) {
//   if (typeof n !== "number") return "-";
//   return `$${n.toFixed(2)}`;
// }

export default function Sessions() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
  });
  const [activeFilter, setActiveFilter] = useState("All Sessions");

  if (isLoading) return <div>Loading…</div>;
  if (error) return <div>Error {(error as any).message}</div>;

  const sessions = data || [];

  return (
    <div>
      {/* 1) Mount one SSE listener per visible session */}
      {sessions.map((s) => (
        <SessionSSE
          key={s.id}
          id={s.id}
          onEvent={() => qc.invalidateQueries({ queryKey: ["sessions"] })}
        />
      ))}

      {/* Filter Pills (visual only) */}
      <div className="filter-scroll">
        <div className="filter-pills">
          {[
            "All Sessions",
            "My Sessions",
            "Today",
            "This Week",
            "Available",
          ].map((lbl) => (
            <button
              key={lbl}
              className={`filter-pill ${activeFilter === lbl ? "active" : ""}`}
              onClick={() => setActiveFilter(lbl)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="sessions-list">
        {sessions.map((s) => {
          const starts = new Date(s.starts_at_utc);
          const badge =
            s.status !== "scheduled"
              ? "closed"
              : s.remaining_seats === 0
              ? "full"
              : "open";
          return (
            <Link
              to={`/sessions/${s.id}`}
              key={s.id}
              className={`session-card animate-in`}
              style={{ animationDelay: "0s" }}
            >
              <div className="session-header">
                <div>
                  <div className="session-title">{s.title || "Session"}</div>
                  <div className="session-date">
                    <svg
                      width="14"
                      height="14"
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
                    {starts.toLocaleString()} ({s.timezone})
                  </div>
                </div>
                <span className={`session-badge badge-${badge}`}>
                  {badge === "open"
                    ? "Open"
                    : badge === "full"
                    ? "Full"
                    : "Closed"}
                </span>
              </div>
              <div className="session-info">
                <div className="info-item">
                  <div className="info-value">
                    {s.confirmed_seats ?? 0}/{s.capacity}
                  </div>
                  <div className="info-label">Spots</div>
                </div>
                <div className="info-item">
                  <div className="info-value">
                    {formatDollarsFromCents(s.fee_cents)}
                  </div>
                  <div className="info-label">Fee</div>
                </div>
                <div className="info-item">
                  <div className="info-value">{s.remaining_seats ?? "-"}</div>
                  <div className="info-label">Available</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
