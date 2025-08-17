import React from "react";
import Card from "../UI/Card";
import { Session } from "../../lib/api";
import { Link } from "react-router-dom";

function StatusPill({ status }: { status: Session["status"] }) {
  const cls =
    status === "open"
      ? "session-status open"
      : status === "full"
      ? "session-status full"
      : "session-status closed";
  const label =
    status === "open"
      ? "Open for Registration"
      : status === "full"
      ? "Full - Waitlist Open"
      : "Closed";
  return (
    <span className={cls}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
      </svg>
      {label}
    </span>
  );
}

function UTCtohhmmTimeForamt(date: Date): string {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes;

  return `${hours}:${minutes} ${ampm}`;
}

export default function SessionCard({ s }: { s: Session }) {
  const available = Math.max(0, s.capacity - s.registered);
  return (
    <Link to={`/sessions/${s.id}`} style={{ textDecoration: "none" }}>
      <Card>
        <StatusPill status={s.status} />
        <h3 className="session-title">{s.title}</h3>
        <div className="session-datetime">
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
            <div className="stat-value">{available}</div>
            <div className="stat-label">Available</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">${s.fee_cents}</div>
            <div className="stat-label">Per Player</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
