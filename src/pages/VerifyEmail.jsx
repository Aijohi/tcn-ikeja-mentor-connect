import {
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";

import "./VerifyEmail.css";

function VerifyEmail() {
  return (
    <main className="verify-email-page">
      <section className="verify-email-card">
        <Link
          to="/"
          className="verify-email-brand"
          aria-label="Return to Mentor Connect homepage"
        >
          <img
            src="/images/hothub-logo.png"
            alt="HOTHUB"
          />

          <span>
            <strong>
              Mentor Connect
            </strong>

            <small>
              TCN IKEJA
            </small>
          </span>
        </Link>

        <div className="verify-email-icon">
          <CheckCircle2
            size={28}
            strokeWidth={1.8}
          />
        </div>

        <span className="verify-email-eyebrow">
          EMAIL VERIFIED
        </span>

        <h1>
          Your email is verified
        </h1>

        <p className="verify-email-introduction">
          Your email address has been
          successfully verified.
        </p>

        <p className="verify-email-guidance">
          You can now continue to sign
          in to Mentor Connect.
        </p>

        <Link
          to="/login"
          className="verify-email-primary-button"
        >
          Continue to sign in
        </Link>

        <Link
          to="/"
          className="verify-email-secondary-link"
        >
          <ArrowLeft
            size={15}
            strokeWidth={1.8}
          />

          <span>
            Back to homepage
          </span>
        </Link>
      </section>
    </main>
  );
}

export default VerifyEmail;
