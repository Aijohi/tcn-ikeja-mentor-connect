import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ClipboardCheck,
  GitPullRequest,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";

import "./DashboardLayout.css";

const menus = {
  mentee: [
    {
      label: "Overview",
      icon: LayoutDashboard,
      path: "/mentee/dashboard",
    },
    {
      label: "My profile",
      icon: UserRound,
      path: "/mentee/profile",
    },
    {
      label: "Find a mentor",
      icon: Search,
      path: "/mentee/find-mentor",
    },
    {
      label: "My requests",
      icon: GitPullRequest,
      path: "/mentee/requests",
    },
    {
      label: "My sessions",
      icon: CalendarDays,
      path: "/mentee/sessions",
    },
    {
      label: "Messages",
      icon: MessageCircle,
      path: "/mentee/messages",
    },
  ],

  mentor: [
    {
      label: "Overview",
      icon: LayoutDashboard,
      path: "/mentor/dashboard",
    },
    {
      label: "My profile",
      icon: UserRound,
      path: "/mentor/profile",
    },
    {
      label: "Mentorship requests",
      icon: GitPullRequest,
      path: "/mentor/requests",
    },
    {
      label: "My mentees",
      icon: Users,
      path: "/mentor/mentees",
    },
    {
      label: "My sessions",
      icon: CalendarDays,
      path: "/mentor/sessions",
    },
    {
      label: "Messages",
      icon: MessageCircle,
      path: "/mentor/messages",
    },
  ],

  mentorOnboarding: [
    {
      label: "Mentor application",
      icon: ClipboardCheck,
      path: "/mentor/apply",
    },
  ],

  admin: [
    {
      label: "Overview",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    {
      label: "People",
      icon: UserRound,
      path: "/admin/dashboard/people",
    },
    {
      label: "Mentor applications",
      icon: ClipboardCheck,
      path: "/admin/dashboard/mentor-applications",
    },
    {
      label: "Mentorship requests",
      icon: GitPullRequest,
      path: "/admin/dashboard/mentorship-requests",
    },
  ],
};

function DashboardBrand() {
  return (
    <div className="dashboard-brand">
      <img
        className="dashboard-brand-logo"
        src="/images/hothub-logo.png"
        alt=""
      />

      <span className="dashboard-brand-text">
        <strong>Mentor Connect</strong>
        <small>TCN IKEJA</small>
      </span>
    </div>
  );
}

function DashboardLayout({
  title,
  description,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    profile,
    loading,
    signOut,
  } = useAuth();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [signOutOpen, setSignOutOpen] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  const dashboardContentRef =
    useRef(null);

  useEffect(() => {
    setMenuOpen(false);

    const resetScrollPosition = () => {
      if (dashboardContentRef.current) {
        dashboardContentRef.current.scrollTop = 0;
        dashboardContentRef.current.scrollLeft = 0;
      }

      window.scrollTo(0, 0);
    };

    resetScrollPosition();

    let secondFrame;

    const firstFrame =
      window.requestAnimationFrame(() => {
        secondFrame =
          window.requestAnimationFrame(
            resetScrollPosition,
          );
      });

    return () => {
      window.cancelAnimationFrame(firstFrame);

      if (secondFrame) {
        window.cancelAnimationFrame(
          secondFrame,
        );
      }
    };
  }, [location.pathname]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (signOutOpen) {
        setSignOutOpen(false);
        return;
      }

      setMenuOpen(false);
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [signOutOpen]);


  /*
    Lock the page behind the responsive drawer.
    The sidebar itself remains scrollable.
    Restore the exact page position when the drawer closes.
  */
  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;

    const previous = {
      htmlOverflow:
        html.style.getPropertyValue("overflow"),
      htmlOverflowPriority:
        html.style.getPropertyPriority("overflow"),
      htmlOverscroll:
        html.style.getPropertyValue("overscroll-behavior"),
      htmlOverscrollPriority:
        html.style.getPropertyPriority("overscroll-behavior"),
      htmlScrollBehavior:
        html.style.getPropertyValue("scroll-behavior"),
      htmlScrollBehaviorPriority:
        html.style.getPropertyPriority("scroll-behavior"),

      bodyPosition:
        body.style.getPropertyValue("position"),
      bodyPositionPriority:
        body.style.getPropertyPriority("position"),
      bodyTop:
        body.style.getPropertyValue("top"),
      bodyTopPriority:
        body.style.getPropertyPriority("top"),
      bodyLeft:
        body.style.getPropertyValue("left"),
      bodyLeftPriority:
        body.style.getPropertyPriority("left"),
      bodyRight:
        body.style.getPropertyValue("right"),
      bodyRightPriority:
        body.style.getPropertyPriority("right"),
      bodyWidth:
        body.style.getPropertyValue("width"),
      bodyWidthPriority:
        body.style.getPropertyPriority("width"),
      bodyOverflow:
        body.style.getPropertyValue("overflow"),
      bodyOverflowPriority:
        body.style.getPropertyPriority("overflow"),
      bodyTouchAction:
        body.style.getPropertyValue("touch-action"),
      bodyTouchActionPriority:
        body.style.getPropertyPriority("touch-action"),
      bodyOverscroll:
        body.style.getPropertyValue("overscroll-behavior"),
      bodyOverscrollPriority:
        body.style.getPropertyPriority("overscroll-behavior"),
    };

    html.classList.add(
      "dashboard-menu-locked",
    );

    body.classList.add(
      "dashboard-menu-locked",
    );

    html.style.setProperty(
      "overflow",
      "hidden",
      "important",
    );

    html.style.setProperty(
      "overscroll-behavior",
      "none",
      "important",
    );

    body.style.setProperty(
      "position",
      "fixed",
      "important",
    );

    body.style.setProperty(
      "top",
      `-${scrollY}px`,
      "important",
    );

    body.style.setProperty(
      "left",
      "0",
      "important",
    );

    body.style.setProperty(
      "right",
      "0",
      "important",
    );

    body.style.setProperty(
      "width",
      "100%",
      "important",
    );

    body.style.setProperty(
      "overflow",
      "hidden",
      "important",
    );

    body.style.setProperty(
      "touch-action",
      "none",
      "important",
    );

    body.style.setProperty(
      "overscroll-behavior",
      "none",
      "important",
    );

    return () => {
      html.classList.remove(
        "dashboard-menu-locked",
      );

      body.classList.remove(
        "dashboard-menu-locked",
      );

      function restoreStyle(
        element,
        property,
        value,
        priority,
      ) {
        if (value) {
          element.style.setProperty(
            property,
            value,
            priority,
          );
        } else {
          element.style.removeProperty(
            property,
          );
        }
      }

      restoreStyle(
        html,
        "overflow",
        previous.htmlOverflow,
        previous.htmlOverflowPriority,
      );

      restoreStyle(
        html,
        "overscroll-behavior",
        previous.htmlOverscroll,
        previous.htmlOverscrollPriority,
      );

      html.style.setProperty(
        "scroll-behavior",
        "auto",
        "important",
      );

      restoreStyle(
        body,
        "position",
        previous.bodyPosition,
        previous.bodyPositionPriority,
      );

      restoreStyle(
        body,
        "top",
        previous.bodyTop,
        previous.bodyTopPriority,
      );

      restoreStyle(
        body,
        "left",
        previous.bodyLeft,
        previous.bodyLeftPriority,
      );

      restoreStyle(
        body,
        "right",
        previous.bodyRight,
        previous.bodyRightPriority,
      );

      restoreStyle(
        body,
        "width",
        previous.bodyWidth,
        previous.bodyWidthPriority,
      );

      restoreStyle(
        body,
        "overflow",
        previous.bodyOverflow,
        previous.bodyOverflowPriority,
      );

      restoreStyle(
        body,
        "touch-action",
        previous.bodyTouchAction,
        previous.bodyTouchActionPriority,
      );

      restoreStyle(
        body,
        "overscroll-behavior",
        previous.bodyOverscroll,
        previous.bodyOverscrollPriority,
      );

      window.scrollTo(0, scrollY);

      window.requestAnimationFrame(
        () => {
          restoreStyle(
            html,
            "scroll-behavior",
            previous.htmlScrollBehavior,
            previous.htmlScrollBehaviorPriority,
          );
        },
      );
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!signOutOpen) {
      return undefined;
    }

    const body = document.body;
    const previousOverflow =
      body.style.overflow;

    body.style.overflow =
      "hidden";

    return () => {
      body.style.overflow =
        previousOverflow;
    };
  }, [signOutOpen]);

  if (loading) {
    return (
      <main className="page-message">
        <div className="loader" />
        <p>Preparing your dashboard...</p>
      </main>
    );
  }

  if (!user || !profile) {
    return (
      <main className="page-message">
        <h1>
          We could not load your account
        </h1>

        <p>
          Please sign in again to continue.
        </p>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={() =>
            navigate("/login")
          }
        >
          Return to sign in
        </button>
      </main>
    );
  }

  const role = profile.role;

  const administratorRoles = [
    "admin",
    "safeguarding_lead",
  ];

  const isMentorOnboardingAccount =
    role === "mentee" &&
    profile.signup_intent === "mentor";

  const menuRole =
    administratorRoles.includes(role)
      ? "admin"
      : isMentorOnboardingAccount
        ? "mentorOnboarding"
        : role;

  const navigationItems =
    menus[menuRole] ?? [];

  const accountTypeLabel =
    administratorRoles.includes(role)
      ? "Admin"
      : role === "mentor" ||
          isMentorOnboardingAccount
        ? "Mentor"
        : "Mentee";

  const displayName =
    profile.full_name ||
    profile.name ||
    user.user_metadata?.full_name ||
    user.email ||
    "Mentor Connect user";

  function openSignOutConfirmation() {
    setMenuOpen(false);
    setSignOutOpen(true);
  }

  function closeSignOutConfirmation() {
    if (signingOut) {
      return;
    }

    setSignOutOpen(false);
  }

  async function confirmSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    try {
      const {
        error: signOutError,
      } = await signOut({
        redirectTo: "/",
      });

      if (signOutError) {
        console.error(
          "Unable to sign out:",
          signOutError,
        );

        setSigningOut(false);
      }
    } catch (error) {
      console.error(
        "Unable to sign out:",
        error,
      );

      setSigningOut(false);
    }
  }

  return (
    <div className="dashboard-layout">
      <header className="dashboard-mobile-header">
        <DashboardBrand />

        <button
          type="button"
          className="dashboard-menu-button"
          aria-label="Open dashboard menu"
          aria-controls="dashboard-navigation"
          aria-expanded={menuOpen}
          onClick={() =>
            setMenuOpen(true)
          }
        >
          <Menu size={22} />
        </button>
      </header>

      <button
        type="button"
        className={`dashboard-menu-overlay${
          menuOpen
            ? " is-open"
            : ""
        }`}
        aria-label="Close dashboard menu"
        aria-hidden={!menuOpen}
        tabIndex={
          menuOpen
            ? 0
            : -1
        }
        onClick={() =>
          setMenuOpen(false)
        }
      />

      <aside
        id="dashboard-navigation"
        className={`dashboard-sidebar${
          menuOpen
            ? " is-open"
            : ""
        }`}
      >
        <div className="dashboard-sidebar-top">
          <DashboardBrand />

          <button
            type="button"
            className="dashboard-menu-close"
            aria-label="Close dashboard menu"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            <X size={22} />
          </button>
        </div>

        <nav aria-label="Dashboard navigation">
          {navigationItems.map(
            ({
              label,
              icon: Icon,
              path,
            }) => (
              <NavLink
                key={label}
                to={path}
                end={
                  label === "Overview"
                }
                className={({
                  isActive,
                }) =>
                  isActive
                    ? "active"
                    : ""
                }
              >
                <span className="dashboard-nav-icon">
                  <Icon
                    size={19}
                    strokeWidth={1.8}
                  />
                </span>

                <span>
                  {label}
                </span>
              </NavLink>
            ),
          )}
        </nav>

        <div className="dashboard-sidebar-footer">
          {role === "mentee" &&
            !isMentorOnboardingAccount && (
              <button
                type="button"
                className="become-mentor-button"
                onClick={() =>
                  navigate(
                    "/mentor/apply",
                  )
                }
              >
                <Sparkles
                  size={18}
                  strokeWidth={1.8}
                />

                <span>
                  Become a mentor
                </span>
              </button>
            )}

          {role === "mentor" && (
            <button
              type="button"
              className="become-mentor-button"
              onClick={() =>
                navigate(
                  "/mentor/become-a-mentee",
                )
              }
            >
              <UserRound
                size={18}
                strokeWidth={1.8}
              />

              <span>
                Become a mentee
              </span>
            </button>
          )}

          <button
            type="button"
            className="sign-out-button"
            onClick={openSignOutConfirmation}
          >
            <LogOut
              size={18}
              strokeWidth={1.8}
            />

            <span>
              Sign out
            </span>
          </button>
        </div>
      </aside>

      <main
        ref={dashboardContentRef}
        className="dashboard-content"
      >
        <header>
          <span>
            <small>
              TCN IKEJA MENTOR CONNECT
            </small>

            <h1>{title}</h1>

            <p>{description}</p>
          </span>

          <div className="dashboard-header-actions">
            {(
              role === "mentor" ||
              (
                role === "mentee" &&
                !isMentorOnboardingAccount
              )
            ) && (
              <NotificationBell
                userId={user.id}
              />
            )}

            <div className="dashboard-user">
              <strong>
                {displayName}
              </strong>

              <small>
                {accountTypeLabel}
              </small>
            </div>
          </div>
        </header>

        {children}
      </main>

      {signOutOpen && (
        <div
          className="dashboard-signout-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeSignOutConfirmation();
            }
          }}
        >
          <section
            className="dashboard-signout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-signout-title"
            aria-describedby="dashboard-signout-description"
          >
            <div className="dashboard-signout-modal-header">
              <div>
                <span>
                  ACCOUNT
                </span>

                <h2
                  id="dashboard-signout-title"
                >
                  Sign out?
                </h2>
              </div>

              <button
                type="button"
                className="dashboard-signout-close"
                aria-label="Close sign out confirmation"
                onClick={
                  closeSignOutConfirmation
                }
                disabled={signingOut}
              >
                <X size={18} />
              </button>
            </div>

            <p
              id="dashboard-signout-description"
              className="dashboard-signout-copy"
            >
              Are you sure you want to
              sign out of Mentor
              Connect?
            </p>

            <div className="dashboard-signout-actions">
              <button
                type="button"
                className="dashboard-signout-cancel"
                onClick={
                  closeSignOutConfirmation
                }
                disabled={signingOut}
              >
                Cancel
              </button>

              <button
                type="button"
                className="dashboard-signout-confirm"
                onClick={
                  confirmSignOut
                }
                disabled={signingOut}
              >
                <LogOut
                  size={16}
                  strokeWidth={1.8}
                />

                <span>
                  {signingOut
                    ? "Signing out..."
                    : "Sign out"}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default DashboardLayout;
