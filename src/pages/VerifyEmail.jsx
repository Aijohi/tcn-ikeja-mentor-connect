import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

function VerifyEmail() {
  return (
    <main className="page-message">
      <CheckCircle2 size={46} />

      <h1>Email verified</h1>

      <p>Your email address has been successfully verified.</p>

      <Link to="/login" className="primary-button">
        Continue to sign in
      </Link>
    </main>
  );
}

export default VerifyEmail;