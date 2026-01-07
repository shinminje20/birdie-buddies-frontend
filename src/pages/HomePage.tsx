import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="app-container landing-page">
      <div className="main-content landing-hero">
        <div className="landing-brand">
          <img src="/birdie2.svg" alt="Birdie Buddies" width={40} height={40} />
          <span>Birdie Buddies</span>
        </div>

        {/* <h1 className="landing-title">Badminton sessions, simplified.</h1> */}
        <p className="landing-subtitle">
          <b>Birdie Buddies</b> is a session management app for badminton clubs
          and organizers. It helps track signups, attendance, and deposits in
          one place.
        </p>

        <div className="landing-actions">
          {!loading && user ? (
            <Link className="btn btn-primary" to="/sessions">
              Go to App
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/login">
              Sign In
            </Link>
          )}
          <Link className="btn btn-secondary" to="/privacy">
            Privacy Policy
          </Link>
        </div>
      </div>

      <div className="main-content landing-info">
        <h2>What the app does</h2>
        <ul>
          <li>Create and manage badminton sessions with limited seats.</li>
          <li>Track registrations, attendance, and payments.</li>
          <li>Confirm deposits using Interac e-transfer notifications.</li>
          <li>Send updates and confirmations to participants.</li>
        </ul>

        <h2>Why we request Google data</h2>
        <p className="landing-subtitle">
          If you choose to connect Gmail, Birdie Buddies reads Interac
          e-transfer notification emails so the app can match deposits to
          sessions and keep payment status accurate. This data is only used for
          payment confirmation and bookkeeping, not for advertising.
        </p>

        <h2>Data transparency</h2>
        <ul>
          <li>We request only the minimum Gmail scope required.</li>
          <li>We do not sell Gmail data or use it for marketing.</li>
          <li>
            You can revoke Gmail access at any time in your Google Account.
          </li>
        </ul>

        <div className="landing-links">
          <Link to="/terms">Terms of Service</Link>
          <span>•</span>
          <Link to="/privacy">Privacy Policy</Link>
          <span>•</span>
          <a href="mailto:bdbirdies@gmail.com">Contact</a>
        </div>
      </div>
    </div>
  );
}
