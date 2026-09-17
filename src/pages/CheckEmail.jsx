import {
  CheckCircle2,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import {
  Link,
  useLocation,
} from "react-router-dom";

import "./CheckEmail.css";

function CheckEmail() {
  const location =
    useLocation();

  const email =
    location.state?.email ||
    "";

  const accountType =
    location.state
      ?.accountType ||
    "member";

  const isMentorAccount =
    accountType ===
    "mentor";

  return (
    <main className="check-email-page">
      <section className="check-email-shell">
        <div className="check-email-main">
          <Link
            to="/"
            className="check-email-brand"
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

          <div className="check-email-content">
            <div className="check-email-icon">
              <MailCheck
                size={30}
                strokeWidth={1.8}
              />
            </div>

            <span className="check-email-eyebrow">
              VERIFY YOUR EMAIL
            </span>

            <h1>
              One more step.
            </h1>

            <p className="check-email-lead">
              We sent a verification
              link to
            </p>

            <p className="check-email-address">
              {email ||
                "your email address"}
            </p>

            <p className="check-email-guidance">
              Open the email and select
              the verification link to
              finish setting up your
              account.
            </p>

            <div className="check-email-mentor-note">
              <ShieldCheck
                size={18}
                strokeWidth={1.8}
              />

              <p>
                If the message does not
                appear in your inbox
                after a few minutes,
                please check your spam,
                junk or promotions
                folder. Sometimes email
                providers place new
                verification messages
                there.
              </p>
            </div>

            {isMentorAccount && (
              <div className="check-email-mentor-note">
                <ShieldCheck
                  size={18}
                  strokeWidth={1.8}
                />

                <p>
                  This verification is
                  for your new mentor
                  account. Your mentee
                  account remains
                  separate and
                  unchanged.
                </p>
              </div>
            )}

            <Link
              to="/login"
              className="check-email-primary-button"
            >
              Return to sign in
            </Link>

            <Link
              to="/"
              className="check-email-secondary-button"
            >
              Go to homepage
            </Link>
          </div>
        </div>

        <aside className="check-email-help">
          <span className="check-email-help-label">
            WHAT HAPPENS NEXT
          </span>

          <h2>
            Finish verification in your
            inbox.
          </h2>

          <div className="check-email-steps">
            <div className="check-email-step">
              <span className="check-email-step-number">
                1
              </span>

              <div>
                <strong>
                  Open your inbox
                </strong>

                <p>
                  Look for the email
                  from Mentor Connect.
                </p>
              </div>
            </div>

            <div className="check-email-step">
              <span className="check-email-step-number">
                2
              </span>

              <div>
                <strong>
                  Check spam if needed
                </strong>

                <p>
                  If you cannot see the
                  message, check your
                  spam, junk or
                  promotions folder.
                </p>
              </div>
            </div>

            <div className="check-email-step">
              <span className="check-email-step-number">
                3
              </span>

              <div>
                <strong>
                  Verify and sign in
                </strong>

                <p>
                  Open the verification
                  link, then return to
                  Mentor Connect and
                  sign in.
                </p>
              </div>
            </div>
          </div>

          <div className="check-email-tip">
            <CheckCircle2
              size={17}
              strokeWidth={1.8}
            />

            <p>
              The verification email
              may take a few minutes to
              arrive. You do not need
              to create another account
              while you wait.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default CheckEmail;
