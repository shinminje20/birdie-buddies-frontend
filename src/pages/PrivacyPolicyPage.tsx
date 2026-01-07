import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  return (
    <div className="app-container legal-page">
      <div className="main-content legal-content">
        <div className="legal-topbar">
          <div className="legal-brand">
            <img
              src="/birdie2.svg"
              alt="BirdieBuddies"
              width={28}
              height={28}
            />
            <span>BirdieBuddies</span>
          </div>
          <Link className="legal-link" to="/login">
            Back to Login
          </Link>
        </div>

        <h1 className="page-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: 2026-01-07</p>

        <h2>Overview</h2>
        <p>
          This Privacy Policy explains how BirdieBuddies ("we", "us", "our")
          collects, uses, and shares information when you use our app and
          services.
        </p>

        <h2>Information We Collect</h2>
        <ul>
          <li>
            Account details such as name, email address, and phone number.
          </li>
          <li>
            Gmail data you authorize, limited to the minimum needed to detect
            and process Interac e-transfer notifications.
          </li>
          <li>
            Usage data such as pages visited and actions taken in the app.
          </li>
        </ul>

        <h2>How We Use Information</h2>
        <ul>
          <li>Provide and operate the BirdieBuddies service.</li>
          <li>Confirm and record payments or deposits tied to your account.</li>
          <li>Improve, secure, and maintain the service.</li>
        </ul>

        <h2>Google Data Use</h2>
        <p>
          If you connect Gmail, we access Gmail data only to identify payment
          notification emails and keep your account in sync. We do not use Gmail
          data for advertising, nor do we sell it. We comply with the Google API
          Services User Data Policy, including the Limited Use requirements.
        </p>

        <h2>Sharing</h2>
        <p>
          We share data only with service providers needed to operate the app
          (for example, hosting and database services) or when required by law.
          We do not sell personal information.
        </p>

        <h2>Retention</h2>
        <p>
          We retain your information as long as your account is active or as
          needed to provide the service. You can request deletion at any time.
        </p>

        <h2>Your Choices</h2>
        <ul>
          <li>Revoke Gmail access at any time in your Google Account.</li>
          <li>Request account deletion by contacting us.</li>
        </ul>

        <h2>Contact</h2>
        <p>
          Questions or requests:{" "}
          <a className="legal-link" href="mailto:bdbirdies@gmail.com">
            bdbirdies@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
