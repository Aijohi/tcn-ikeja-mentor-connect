import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function AccountSuspended() {
  const { signOut } = useAuth();

  return (
    <main className="page-message">
      <ShieldAlert size={46} />

      <h1>Account temporarily restricted</h1>

      <p>
        Your account is currently under review. Contact the TCN Ikeja
        administration team if you need assistance.
      </p>

      <button className="secondary-button" onClick={signOut}>
        Sign out
      </button>
    </main>
  );
}

export default AccountSuspended;