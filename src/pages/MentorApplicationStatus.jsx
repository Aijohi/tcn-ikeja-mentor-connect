import { Clock3, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function MentorApplicationStatus() {
  const { profile, signOut } = useAuth();

  return (
    <main className="page-message">
      <span className="status-icon">
        <Clock3 size={38} />
      </span>

      <span className="eyebrow">APPLICATION UNDER REVIEW</span>

      <h1>Thank you, {profile?.full_name}</h1>

      <p>
        Your mentor application and membership information are being reviewed
        by the TCN Ikeja administration team.
      </p>

      <div className="restricted-notice">
        <ShieldCheck size={18} />

        <span>
          Your profile will not appear in the mentor directory until it is
          approved.
        </span>
      </div>

      <button className="secondary-button" onClick={signOut}>
        Sign out
      </button>
    </main>
  );
}

export default MentorApplicationStatus;