import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({
  children,
  allowedRoles = [],
  requireActiveAccount = true,
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <main className="page-message">
        <div className="loader" />
        <p>Preparing your account...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(profile.role)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (
    requireActiveAccount &&
    profile.account_status === "suspended"
  ) {
    return <Navigate to="/account-suspended" replace />;
  }

  return children;
}

export default ProtectedRoute;