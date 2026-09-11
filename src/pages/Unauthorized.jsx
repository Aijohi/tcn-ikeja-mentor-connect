import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

function Unauthorized() {
  return (
    <main className="page-message unauthorized-page">
      <span className="status-icon">
        <ShieldAlert size={38} />
      </span>

      <h1>Access not permitted</h1>

      <p>Your account does not have permission to view this page.</p>

      <Link to="/" className="tertiary-button">
        <ArrowLeft size={17} />
        Return home
      </Link>
    </main>
  );
}

export default Unauthorized;
