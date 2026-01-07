import { useNavigate } from "react-router-dom";

export default function TermsOfServicePage() {
  const nav = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      nav(-1);
      return;
    }
    nav("/");
  };

  return (
    <div className="app-container legal-page">
      <div className="main-content legal-content">
        <div className="legal-topbar">
          <div className="legal-brand">
            <img src="/birdie2.svg" alt="Birdie Buddies" width={28} height={28} />
            <span>Birdie Buddies</span>
          </div>
          <div className="legal-link" onClick={handleBack}>
            Back
          </div>
        </div>

        <h1 className="page-title">Terms of Service</h1>
        <p className="legal-updated">Last updated: 2026-01-07</p>

        <h2>Acceptance</h2>
        <p>
          By using Birdie Buddies, you agree to these Terms. If you do not agree,
          do not use the service.
        </p>

        <h2>Eligibility</h2>
        <p>
          You must be able to form a binding contract and comply with applicable
          laws to use the service.
        </p>

        <h2>Your Account</h2>
        <ul>
          <li>You are responsible for the accuracy of your account details.</li>
          <li>Keep your login information secure and do not share access.</li>
        </ul>

        <h2>Use of the Service</h2>
        <ul>
          <li>Use the app only for lawful purposes.</li>
          <li>Do not attempt to access data that is not yours.</li>
          <li>Do not disrupt or abuse the service.</li>
        </ul>

        <h2>Payments</h2>
        <p>
          Birdie Buddies may record deposits or payment notifications to help
          manage sessions. You are responsible for verifying your payment
          details with your bank or provider.
        </p>

        <h2>Termination</h2>
        <p>
          We may suspend or terminate access if you violate these Terms or if
          required to protect the service.
        </p>

        <h2>Disclaimers</h2>
        <p>
          The service is provided on an "as is" and "as available" basis without
          warranties of any kind.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Birdie Buddies is not liable
          for indirect, incidental, or consequential damages.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a className="legal-link" href="mailto:bdbirdies@gmail.com">
            bdbirdies@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
