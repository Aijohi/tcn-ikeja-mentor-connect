import { Clock3, LogOut, ShieldCheck } from "lucide-react";

import { useAuth } from "../context/AuthContext";

function MembershipPending() {
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    await signOut();
    window.location.replace("/");
  }

  const isRejected = profile?.account_status === "rejected";

  return (
    <main className="page-message">
      <span className="status-icon">
        {isRejected ? <ShieldCheck size={38} /> : <Clock3 size={38} />}
      </span>

      <span className="eyebrow">
        {isRejected ? "MEMBERSHIP REVIEWED" : "MEMBERSHIP UNDER REVIEW"}
      </span>

      <h1>
        {isRejected
          ? "We could not verify your membership"
          : `Thank you${profile?.full_name ? `, ${profile.full_name}` : ""}`}
      </h1>

      <p>
        {isRejected
          ? "Please contact the TCN Ikeja administration team if you believe this decision was made in error."
          : "Your membership information has been submitted to the TCN Ikeja administration team for verification."}
      </p>

      <div className="restricted-notice">
        <ShieldCheck size={18} />
        <span>
          {isRejected
            ? "Your account will remain restricted until an administrator reviews it again."
            : "You will receive access to the member dashboard after your membership is verified."}
        </span>
      </div>

      <button
        type="button"
        className="membership-sign-out-button"
        onClick={handleSignOut}
      >
        <LogOut size={17} />
        Sign out
      </button>
    </main>
  );
}

export default MembershipPending;
