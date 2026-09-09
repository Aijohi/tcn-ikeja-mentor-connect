import { MailCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

function CheckEmail() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <main className="page-message">
      <MailCheck size={46} />

      <h1>Check your email</h1>

      <p>
        We sent a verification link to{" "}
        <strong>{email || "your email address"}</strong>.
      </p>

      <p>
        Open the email and select the verification link before signing in.
      </p>

      <Link to="/login" className="primary-button">
        Return to sign in
      </Link>
    </main>
  );
}

export default CheckEmail;