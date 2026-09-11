import { useEffect, useState } from "react";

import {
  CalendarDays,
  ClipboardCheck,
  GitPullRequest,
  HeartHandshake,
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
  ],

  admin: [
    {
      label: "Overview",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    {
      label: "People",
      icon: Users,
      path: "/admin/dashboard/people",
    },
    {
      label: "Mentor applications",
      icon: ClipboardCheck,
      path: "/admin/dashboard/applications",
    },
    {
      label: "Mentorship requests",
      icon: GitPullRequest,
      path: "/admin/dashboard/requests",
    },
  ],
};

function DashboardLayout({
  title,
  description,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  const {
    user,
    profile,
    loading,
    signOut,
  } = useAuth();

  /*
    Remove stale scroll-lock styles left by earlier dashboard versions.
    This runs once and does not alter responsive spacing or layout.
  */
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    html.classList.remove("dashboard-drawer-open");
    body.classList.remove("dashboard-drawer-open");

    [
      "position",
      "top",
      "right",
      "bottom",
      "left",
      "width",
      "height",
      "max-height",
      "overflow",
      "overflow-x",
      "overflow-y",
      "touch-action",
    ].forEach((property) => {
      body.style.removeProperty(property);
    });

    [
      "height",
      "max-height",
      "overflow",
      "overflow-x",
      "overflow-y",
      "touch-action",
    ].forEach((property) => {
      html.style.removeProperty(property);
    });
  }, []);

  /*
    Close the drawer whenever the route changes.
  */
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  /*
    The page always remains naturally scrollable.
    Escape closes the drawer without changing html/body overflow.
  */
  useEffect(() => {
    function handleEscape(event) {
      if (
        event.key === "Escape"
        && isMenuOpen
      ) {
        setIsMenuOpen(false);
      }
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
  }, [isMenuOpen]);

  /*
    If the screen becomes desktop width while the drawer is open,
    close it and restore normal page scrolling.
  */
  useEffect(() => {
    function handleResize() {
      if (
        window.innerWidth > 1180 &&
        isMenuOpen
      ) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, [isMenuOpen]);

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
          className="primary-button"
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
    "super_admin",
    "safeguarding_lead",
  ];

  const menuRole =
    administratorRoles.includes(role)
      ? "admin"
      : role;

  const navigationItems =
    menus[menuRole] ?? [];

  const displayName =
    profile.full_name ||
    user.user_metadata?.full_name ||
    user.email ||
    "Mentor Connect user";

  function closeMenu() {
    setIsMenuOpen(false);
  }

  async function handleSignOut() {
    closeMenu();

    await signOut();

    navigate("/", {
      replace: true,
    });
  }

  function handleBecomeMentor() {
    closeMenu();

    navigate(
      "/mentee/become-a-mentor",
    );
  }

  return (
    <div className="dashboard-layout">
      <div className="dashboard-mobile-header">
        <div className="dashboard-brand">
          <span className="dashboard-brand-icon">
            <HeartHandshake size={22} />
          </span>

          <span className="dashboard-brand-text">
            <strong>
              Mentor Connect
            </strong>

            <small>
              TCN IKEJA
            </small>
          </span>
        </div>

        <button
          type="button"
          className="dashboard-menu-button"
          aria-label="Open navigation menu"
          aria-expanded={isMenuOpen}
          aria-controls="dashboard-sidebar"
          onClick={() =>
            setIsMenuOpen(true)
          }
        >
          <Menu size={26} />
        </button>
      </div>

      {isMenuOpen && (
        <button
          type="button"
          className="dashboard-menu-overlay"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}

      <aside
        id="dashboard-sidebar"
        className={`dashboard-sidebar ${
          isMenuOpen
            ? "is-open"
            : ""
        }`}
      >
        <div className="dashboard-sidebar-top">
          <div className="dashboard-brand">
            <span className="dashboard-brand-icon">
              <HeartHandshake size={22} />
            </span>

            <span className="dashboard-brand-text">
              <strong>
                Mentor Connect
              </strong>

              <small>
                TCN IKEJA
              </small>
            </span>
          </div>

          <button
            type="button"
            className="dashboard-menu-close"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          >
            <X size={24} />
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
                end={path.endsWith(
                  "/dashboard",
                )}
                onClick={closeMenu}
                className={({
                  isActive,
                }) =>
                  isActive
                    ? "active"
                    : ""
                }
              >
                <Icon size={19} />
                {label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="dashboard-sidebar-footer">
          {role === "mentee" && (
            <button
              type="button"
              className="become-mentor-button"
              onClick={
                handleBecomeMentor
              }
            >
              <Sparkles size={18} />
              Become a mentor
            </button>
          )}

          <button
            type="button"
            className="sign-out-button"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <header>
          <span>
            <small>
              TCN IKEJA MENTOR CONNECT
            </small>

            <h1>{title}</h1>

            <p>{description}</p>
          </span>

          <div className="dashboard-user">
            <strong>
              {displayName}
            </strong>

            <small>
              {role.replaceAll(
                "_",
                " ",
              )}
            </small>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
