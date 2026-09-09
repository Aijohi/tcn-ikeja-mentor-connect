import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

function Unauthorized() {
  return (
    <main className="page-message">
      <ShieldAlert size={46} />

      <h1>Access not permitted</h1>

      <p>Your account does not have permission to view this page.</p>

      <Link to="/" className="primary-button">
        Return home
      </Link>
    </main>
  );
}

export default Unauthorized;