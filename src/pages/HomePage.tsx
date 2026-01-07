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

        <div className="landing-actions">
          {!loading && user ? (
            <Link className="btn btn-primary" to="/sessions">
              Go to App
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/login">
              Go to Sign In Page
            </Link>
          )}
          {/* <Link className="btn btn-secondary" to="/privacy">
            Privacy Policy
          </Link> */}
        </div>
      </div>

      <div className="main-content landing-info">
        {/* <h2>What the app does</h2>
        <ul>
          <li>Create and manage badminton sessions with limited seats.</li>
          <li>Collect and reconcile deposits with Interac notifications.</li>
          <li>Send updates and confirmations to participants.</li>
        </ul> */}

        <div className="landing-links">
          <Link to="/terms">Terms of Service</Link>
          <span>•</span>
          <Link to="/privacy">Privacy Policy</Link>
          <span>•</span>
          <a href="mailto:bdbirdies@gmail.com">Contact</a>
          <p className="landing-subtitle">
            <b>Note:</b> Birdie Buddies helps clubs and organizers manage
            sessions, track signups, and keep payment records in sync. When
            Gmail access is connected, the app can detect Interac e-transfer
            notifications to confirm deposits automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
