import {
  Navigate,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const administratorRoles = [
  "admin",
  "safeguarding_lead",
];

function getAvailablePage(profile) {
  if (
    administratorRoles.includes(
      profile.role,
    )
  ) {
    return "/admin/dashboard";
  }

  if (
    profile.account_status ===
    "suspended"
  ) {
    return "/account-suspended";
  }

  if (
    !profile.onboarding_completed
  ) {
    return "/complete-profile";
  }

  if (
    profile.account_status ===
      "pending" ||
    profile.account_status ===
      "rejected"
  ) {
    return "/membership-pending";
  }

  if (
    profile.role === "mentor"
  ) {
    return "/mentor/dashboard";
  }

  if (
    profile.role === "mentee" &&
    profile.signup_intent ===
      "mentor"
  ) {
    return "/mentor/apply";
  }

  return "/mentee/dashboard";
}

function ProtectedRoute({
  children,
  allowedRoles = [],
  requireActiveAccount = true,
}) {
  const location =
    useLocation();

  const {
    user,
    profile,
    loading,
    signingOut,
  } = useAuth();

  if (signingOut) {
    return (
      <main
        aria-hidden="true"
        style={{
          minHeight: "100vh",
          background: "#ffffff",
        }}
      />
    );
  }

  if (loading) {
    return (
      <main className="page-message">
        <div className="loader" />

        <p>
          Preparing your account...
        </p>
      </main>
    );
  }

  if (!user) {
    const signInPath =
      location.pathname.startsWith(
        "/admin",
      )
        ? "/admin/login"
        : "/login";

    return (
      <Navigate
        to={signInPath}
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  if (!profile) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const isAdministrator =
    administratorRoles.includes(
      profile.role,
    );

  const isCompleteProfilePage =
    location.pathname ===
    "/complete-profile";

  const isMembershipPendingPage =
    location.pathname ===
    "/membership-pending";

  const isAccountSuspendedPage =
    location.pathname ===
    "/account-suspended";

  const isMentorOnboardingAccount =
    profile.role === "mentee" &&
    profile.signup_intent === "mentor";

  const isMenteePlatformRoute =
    location.pathname ===
      "/mentee/dashboard" ||
    location.pathname ===
      "/mentee/profile" ||
    location.pathname ===
      "/mentee/find-mentor" ||
    location.pathname.startsWith(
      "/mentee/mentors/",
    ) ||
    location.pathname ===
      "/mentee/requests" ||
    location.pathname.startsWith(
      "/mentee/requests/",
    ) ||
    location.pathname ===
      "/mentee/sessions" ||
    location.pathname ===
      "/mentee/messages";

  if (
    isMentorOnboardingAccount &&
    isMenteePlatformRoute
  ) {
    return (
      <Navigate
        to="/mentor/apply"
        replace
      />
    );
  }

  if (
    profile.account_status ===
      "suspended" &&
    !isAccountSuspendedPage
  ) {
    return (
      <Navigate
        to="/account-suspended"
        replace
      />
    );
  }

  if (
    !isAdministrator &&
    !profile.onboarding_completed &&
    !isCompleteProfilePage
  ) {
    return (
      <Navigate
        to="/complete-profile"
        replace
      />
    );
  }

  if (
    profile.account_status ===
      "rejected" &&
    !isMembershipPendingPage
  ) {
    return (
      <Navigate
        to="/membership-pending"
        replace
      />
    );
  }

  if (
    isMembershipPendingPage &&
    profile.account_status ===
      "active"
  ) {
    return (
      <Navigate
        to={getAvailablePage(
          profile,
        )}
        replace
      />
    );
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(
      profile.role,
    )
  ) {
    return (
      <Navigate
        to={getAvailablePage(
          profile,
        )}
        replace
      />
    );
  }

  if (
    requireActiveAccount &&
    !isAdministrator &&
    profile.account_status !==
      "active"
  ) {
    return (
      <Navigate
        to="/membership-pending"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
