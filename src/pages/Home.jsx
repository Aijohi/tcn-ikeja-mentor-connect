import {
  ArrowRight,
  CalendarDays,
  FileSearch,
  Fingerprint,
  MessageCircle,
  MessagesSquare,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
  Menu,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import "./Home.css";

const howSteps = [
  {
    number: "01",
    title: "Request",
    copy:
      "Share your goal and why the mentor feels like the right fit.",
    icon: Send,
  },
  {
    number: "02",
    title: "Review",
    copy:
      "The mentor reviews your request and profile before responding.",
    icon: Search,
  },
  {
    number: "03",
    title: "Schedule",
    copy:
      "Choose an agreed session slot and receive reminders.",
    icon: CalendarDays,
  },
  {
    number: "04",
    title: "Meet",
    copy:
      "Have a focused, purposeful mentoring conversation.",
    icon: MessageCircle,
  },
  {
    number: "05",
    title: "Reflect",
    copy:
      "Confirm attendance and share feedback after the session.",
    icon: Sparkles,
  },
];

const mentorAreas = [
  "All areas",
  "Career",
  "Business",
  "Leadership",
  "Faith",
  "Family life",
];

const sampleMentors = [
  {
    id: 1,
    initials: "TO",
    name: "Tunde O.",
    area: "Business",
    specialty: "Business & Finance",
    description:
      "Guidance on business registration, cash flow and early-stage growth.",
    status: "Sample profile",
  },
  {
    id: 2,
    initials: "FI",
    name: "Funke I.",
    area: "Faith",
    specialty: "Faith & Family",
    description:
      "Mentoring around spiritual growth, family life and navigating relationships.",
    status: "Sample profile",
  },
  {
    id: 3,
    initials: "KE",
    name: "Kunle E.",
    area: "Career",
    specialty: "Academics & Career",
    description:
      "Support with academic direction, career planning and stronger study habits.",
    status: "Sample profile",
  },
  {
    id: 4,
    initials: "AO",
    name: "Amaka O.",
    area: "Leadership",
    specialty: "Leadership & Growth",
    description:
      "Practical guidance for communication, confidence and team leadership.",
    status: "Sample profile",
  },
  {
    id: 5,
    initials: "BA",
    name: "Bola A.",
    area: "Family life",
    specialty: "Family Life",
    description:
      "Support for healthier routines, relationships and family priorities.",
    status: "Sample profile",
  },
];

function Home() {
  const [
    selectedArea,
    setSelectedArea,
  ] = useState("All areas");

  const [
    activeSection,
    setActiveSection,
  ] = useState("");

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  const [
    headerPastHero,
    setHeaderPastHero,
  ] = useState(false);

  useEffect(() => {
    const sectionIds = [
      "how",
      "mentors",
      "trust",
      "accountability",
    ];

    function updateActiveSection() {
      const headerOffset = 150;

      let currentSection = "";

      sectionIds.forEach(
        (sectionId) => {
          const section =
            document.getElementById(
              sectionId,
            );

          if (!section) {
            return;
          }

          const sectionTop =
            section.offsetTop -
            headerOffset;

          if (
            window.scrollY >=
            sectionTop
          ) {
            currentSection =
              sectionId;
          }
        },
      );

      setActiveSection(
        currentSection,
      );
    }

    updateActiveSection();

    window.addEventListener(
      "scroll",
      updateActiveSection,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "resize",
      updateActiveSection,
    );

    return () => {
      window.removeEventListener(
        "scroll",
        updateActiveSection,
      );

      window.removeEventListener(
        "resize",
        updateActiveSection,
      );
    };
  }, []);

  useEffect(() => {
    function updateHeaderMode() {
      const hero =
        document.getElementById("top");

      if (!hero) {
        return;
      }

      const heroBottom =
        hero.getBoundingClientRect().bottom;

      setHeaderPastHero(
        heroBottom <= 90,
      );
    }

    updateHeaderMode();

    window.addEventListener(
      "scroll",
      updateHeaderMode,
      {
        passive: true,
      },
    );

    window.addEventListener(
      "resize",
      updateHeaderMode,
    );

    return () => {
      window.removeEventListener(
        "scroll",
        updateHeaderMode,
      );

      window.removeEventListener(
        "resize",
        updateHeaderMode,
      );
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    function handleResize() {
      if (window.innerWidth > 1100) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, [mobileMenuOpen]);

  const visibleMentors =
    useMemo(() => {
      if (
        selectedArea ===
        "All areas"
      ) {
        return sampleMentors;
      }

      return sampleMentors.filter(
        (mentor) =>
          mentor.area ===
          selectedArea,
      );
    }, [selectedArea]);

  function goToSection(
    event,
    id,
  ) {
    event.preventDefault();

    setMobileMenuOpen(false);

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <div className="hmc-home">

      <header
        className={
          headerPastHero
            ? "hmc-header is-scrolled"
            : "hmc-header is-hero"
        }
      >
        <div className="hmc-shell hmc-nav">
      <a
        href="#top"
        className="hmc-brand"
        onClick={(event) =>
          goToSection(
            event,
            "top",
          )
        }
      >
        <img
          src="/images/hothub-logo.png"
          alt="HOTHUB"
          className="hmc-logo"
        />

        <span className="hmc-brand-copy">
          <strong>
            TCN Ikeja Mentor Connect
          </strong>

          <small>
            HOUSE OF TRANSFORMATION
          </small>
        </span>
      </a>

      <nav className="hmc-nav-links">
        <a
          href="#how"
          className={
            activeSection ===
            "how"
              ? "is-current"
              : ""
          }
          aria-current={
            activeSection ===
            "how"
              ? "location"
              : undefined
          }
          onClick={(event) =>
            goToSection(
              event,
              "how",
            )
          }
        >
          How it works
        </a>

        <a
          href="#mentors"
          className={
            activeSection ===
            "mentors"
              ? "is-current"
              : ""
          }
          aria-current={
            activeSection ===
            "mentors"
              ? "location"
              : undefined
          }
          onClick={(event) =>
            goToSection(
              event,
              "mentors",
            )
          }
        >
          Find a mentor
        </a>

        <a
          href="#trust"
          className={
            activeSection ===
            "trust"
              ? "is-current"
              : ""
          }
          aria-current={
            activeSection ===
            "trust"
              ? "location"
              : undefined
          }
          onClick={(event) =>
            goToSection(
              event,
              "trust",
            )
          }
        >
          Trust &amp; safety
        </a>

        <a
          href="#accountability"
          className={
            activeSection ===
            "accountability"
              ? "is-current"
              : ""
          }
          aria-current={
            activeSection ===
            "accountability"
              ? "location"
              : undefined
          }
          onClick={(event) =>
            goToSection(
              event,
              "accountability",
            )
          }
        >
          Accountability
        </a>
      </nav>

      <div className="hmc-nav-actions">
        <Link
          to="/login"
          className="hmc-sign-in"
        >
          Sign in
        </Link>

        <Link
          to="/register"
          className="hmc-header-cta"
        >
          <UserPlus
            size={16}
            aria-hidden="true"
          />

          Create account
        </Link>
      </div>

      <button
        type="button"
        className="hmc-menu-button"
        aria-label="Open navigation menu"
        aria-expanded={mobileMenuOpen}
        aria-controls="hmc-mobile-navigation"
        onClick={() =>
          setMobileMenuOpen(true)
        }
      >
        <Menu
          size={21}
          aria-hidden="true"
        />
      </button>
        </div>
      </header>

      <button
        type="button"
        className={
          mobileMenuOpen
            ? "hmc-mobile-overlay is-open"
            : "hmc-mobile-overlay"
        }
        aria-label="Close navigation menu"
        tabIndex={
          mobileMenuOpen
            ? 0
            : -1
        }
        onClick={() =>
          setMobileMenuOpen(false)
        }
      />

      <aside
        id="hmc-mobile-navigation"
        className={
          mobileMenuOpen
            ? "hmc-mobile-drawer is-open"
            : "hmc-mobile-drawer"
        }
        aria-label="Mobile navigation"
        aria-hidden={
          !mobileMenuOpen
        }
      >
        <div className="hmc-mobile-drawer-head">
          <a
            href="#top"
            className="hmc-mobile-drawer-brand"
            onClick={(event) =>
              goToSection(
                event,
                "top",
              )
            }
          >
            <img
              src="/images/hothub-logo.png"
              alt="HOTHUB"
            />

            <span>
              <strong>
                TCN Ikeja Mentor Connect
              </strong>

              <small>
                HOUSE OF TRANSFORMATION
              </small>
            </span>
          </a>

          <button
            type="button"
            className="hmc-mobile-close"
            aria-label="Close navigation menu"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          >
            <X
              size={20}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="hmc-mobile-drawer-body">
          <p className="hmc-mobile-menu-label">
            EXPLORE
          </p>

          <nav className="hmc-mobile-nav">
            {[
              [
                "01",
                "How it works",
                "how",
              ],
              [
                "02",
                "Find a mentor",
                "mentors",
              ],
              [
                "03",
                "Trust & safety",
                "trust",
              ],
              [
                "04",
                "Accountability",
                "accountability",
              ],
            ].map(
              ([
                number,
                label,
                id,
              ]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={
                    activeSection === id
                      ? "is-current"
                      : ""
                  }
                  onClick={(event) =>
                    goToSection(
                      event,
                      id,
                    )
                  }
                >
                  <small>
                    {number}
                  </small>

                  <span>
                    {label}
                  </span>

                  <ArrowRight
                    size={17}
                    aria-hidden="true"
                  />
                </a>
              ),
            )}
          </nav>
        </div>

        <div className="hmc-mobile-drawer-actions">
          <Link
            to="/login"
            className="hmc-mobile-signin"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          >
            Sign in
          </Link>

          <Link
            to="/register"
            className="hmc-mobile-create"
            onClick={() =>
              setMobileMenuOpen(false)
            }
          >
            <UserPlus
              size={16}
              aria-hidden="true"
            />

            Create account
          </Link>
        </div>
      </aside>

      <main className="hmc-main">
        <section
          className="hmc-hero"
          id="top"
        >
          <div className="hmc-shell hmc-hero-content">
              <div className="hmc-hero-copy">
                <p className="hmc-kicker">
                  MENTORSHIP BUILT AROUND PURPOSE
                </p>

                <h1>
                  Connect with the right mentor.{" "}
                  <span className="hmc-title-accent-inline">
                    Grow with purpose.
                  </span>
                </h1>

                <p className="hmc-hero-description">
                  Connect with approved mentors in the TCN Ikeja
                  community, schedule purposeful sessions and build
                  accountability as you grow.
                </p>

                <div className="hmc-hero-actions">
                  <a
                    href="#mentors"
                    className="hmc-pill hmc-pill--glass-primary"
                    onClick={(event) =>
                      goToSection(
                        event,
                        "mentors",
                      )
                    }
                  >
                    <span>
                      Find a mentor
                    </span>

                    <i>
                      <ArrowRight size={18} />
                    </i>
                  </a>

                  <Link
                    to="/register"
                    className="hmc-pill hmc-pill--glass-secondary"
                  >
                    <span>
                      Become a mentor
                    </span>

                    <i>
                      <ArrowRight size={18} />
                    </i>
                  </Link>
                </div>

                <p className="hmc-hero-note">
                  People · Purpose · Possibilities
                </p>
              </div>

              <div
                className="hmc-hero-art"
                aria-hidden="true"
              >
                <span className="hmc-modern-glow" />

                <span className="hmc-modern-arc hmc-modern-arc--outer" />
                <span className="hmc-modern-arc hmc-modern-arc--middle" />
                <span className="hmc-modern-arc hmc-modern-arc--inner" />

                <span className="hmc-modern-orbit hmc-modern-orbit--one" />
                <span className="hmc-modern-orbit hmc-modern-orbit--two" />

                <span className="hmc-modern-dot hmc-modern-dot--one" />
                <span className="hmc-modern-dot hmc-modern-dot--two" />

                <div className="hmc-hero-side-note">
                  <span />
                  <p>
                    PEOPLE<br />
                    EMPOWER<br />
                    PEOPLE
                  </p>
                </div>
              </div>
          </div>
        </section>

        <section
          className="hmc-section hmc-how-section hmc-how-cards-section"
          id="how"
        >
          <div className="hmc-shell hmc-reveal">
            <div className="hmc-how-cards-head">
              <p className="hmc-how-eyebrow">
                HOW IT WORKS
              </p>

              <h2>
                From request to reflection,
                in five clear steps.
              </h2>

              <p className="hmc-how-cards-copy">
                Mentor Connect gives each mentoring
                relationship a clear beginning,
                structure and accountability.
              </p>
            </div>

            <div className="hmc-how-cards-grid">
              {howSteps.map(
                ({
                  number,
                  title,
                  copy,
                }) => (
                  <article
                    className="hmc-how-card"
                    key={number}
                  >
                    <span
                      className={`hmc-how-card-accent hmc-how-card-accent--${number}`}
                      aria-hidden="true"
                    />

                    <p className="hmc-how-card-step">
                      STEP {number}
                    </p>

                    <h3>
                      {title}
                    </h3>

                    <p className="hmc-how-card-copy">
                      {copy}
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          className="hmc-section"
          id="mentors"
        >
          <div className="hmc-shell hmc-reveal">
            <div className="hmc-section-heading">
              <p>
                FIND A MENTOR
              </p>

              <h2>
                A preview of the mentors
                you’ll be able to discover.
              </h2>

              <span>
                These sample profiles show how
                mentoring areas and mentor details
                will appear once approved mentors
                are added to Mentor Connect.
              </span>
            </div>

            <div
              className="hmc-tabs"
              role="tablist"
              aria-label="Mentoring areas"
            >
              {mentorAreas.map(
                (area) => (
                  <button
                    key={area}
                    type="button"
                    role="tab"
                    aria-selected={
                      selectedArea ===
                      area
                    }
                    className={
                      selectedArea ===
                      area
                        ? "is-active"
                        : ""
                    }
                    onClick={() =>
                      setSelectedArea(
                        area,
                      )
                    }
                  >
                    {area}
                  </button>
                ),
              )}
            </div>

            <div className="hmc-mentor-grid">
              {visibleMentors.map(
                (mentor) => (
                  <article
                    className="hmc-mentor-card"
                    key={mentor.id}
                  >
                    <div className="hmc-mentor-card-top">
                      <div className="hmc-avatar">
                        {mentor.initials}
                      </div>

                      <div>
                        <strong>
                          {mentor.name}
                        </strong>

                        <small>
                          {mentor.specialty}
                        </small>
                      </div>
                    </div>

                    <p>
                      {mentor.description}
                    </p>

                    <div className="hmc-mentor-card-bottom">
                      <span className="hmc-sample-badge">
                        {mentor.status}
                      </span>
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          className="hmc-section hmc-trust"
          id="trust"
        >
          <div className="hmc-shell hmc-reveal">
            <div className="hmc-trust-intro">
              <p>
                TRUST &amp; SAFETY
              </p>

              <h2>
                Safer mentoring is built
                into the experience.
              </h2>

              <span>
                Clear access rules, reviewed
                mentors and structured
                communication help the
                community mentor with more
                confidence.
              </span>
            </div>

            <div className="hmc-trust-grid">
              {[
                {
                  title: "Verified membership",
                  copy:
                    "Access is limited to the intended TCN Ikeja mentoring community.",
                  icon: Fingerprint,
                },
                {
                  title: "Approval before listing",
                  copy:
                    "Mentor applications are reviewed before profiles appear in discovery.",
                  icon: FileSearch,
                },
                {
                  title: "Messaging after acceptance",
                  copy:
                    "Private mentoring communication starts only after a request is accepted.",
                  icon: MessagesSquare,
                },
                {
                  title: "Reporting is always available",
                  copy:
                    "Members can raise safety, impersonation or conduct concerns when needed.",
                  icon: ShieldAlert,
                },
              ].map(
                ({
                  title,
                  copy,
                  icon: TrustIcon,
                }) => (
                  <article
                    className="hmc-trust-card"
                    key={title}
                  >
                    <div className="hmc-trust-icon">
                      <TrustIcon
                        size={19}
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </div>

                    <h3>
                      {title}
                    </h3>

                    <p>
                      {copy}
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>

        <section
          className="hmc-section"
          id="accountability"
        >
          <div className="hmc-shell hmc-reveal">
            <div className="hmc-section-heading">
              <p>
                ACCOUNTABILITY
              </p>

              <h2>
                Feedback supports better
                mentoring on both sides.
              </h2>

              <span>
                After a completed session,
                mentors and mentees can reflect
                on the experience and provide
                useful feedback.
              </span>
            </div>

            <div className="hmc-rating-grid">
              <article>
                <small>
                  Mentee reflects on the
                  mentoring session
                </small>

                <div>
                  <span>
                    Professionalism
                  </span>

                  <span>
                    Preparedness
                  </span>

                  <span>
                    Reliability
                  </span>
                </div>
              </article>

              <article>
                <small>
                  Mentor reflects on the
                  mentee&apos;s participation
                </small>

                <div>
                  <span>
                    Preparedness
                  </span>

                  <span>
                    Attendance
                  </span>

                  <span>
                    Openness
                  </span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="hmc-section hmc-cta-section">
          <div className="hmc-shell hmc-reveal">
            <div className="hmc-cta">
              <h2>
                Start with the guidance you
                need, or share the experience
                you already have.
              </h2>

              <p>
                Join Mentor Connect as a
                mentee, or apply to support
                someone else&apos;s growth as a
                mentor.
              </p>

              <div className="hmc-hero-actions">
                <Link
                  to="/register"
                  className="hmc-pill hmc-pill--primary"
                >
                  <span>
                    Find a mentor
                  </span>

                  <i>
                    <ArrowRight size={18} />
                  </i>
                </Link>

                <Link
                  to="/register"
                  className="hmc-pill hmc-pill--secondary hmc-pill--secondary-inverse"
                >
                  <span>
                    Become a mentor
                  </span>

                  <i>
                    <ArrowRight size={18} />
                  </i>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="hmc-footer">
        <div className="hmc-shell">
          <div className="hmc-footer-grid">
            <div className="hmc-footer-brand">
              <div className="hmc-brand">
                <img
                  src="/images/hothub-logo.png"
                  alt="HOTHUB"
                  className="hmc-logo"
                />

                <span className="hmc-brand-copy">
                  <strong>
                    TCN Ikeja Mentor Connect
                  </strong>

                  <small>
                    HOUSE OF TRANSFORMATION
                  </small>
                </span>
              </div>

              <p>
                Purposeful, accountable
                mentoring for the TCN Ikeja
                community.
              </p>
            </div>

            <div>
              <h4>
                Platform
              </h4>

              <Link to="/register">
                Become a mentor
              </Link>

              <a
                href="#mentors"
                onClick={(event) =>
                  goToSection(
                    event,
                    "mentors",
                  )
                }
              >
                Find a mentor
              </a>

              <a
                href="#how"
                onClick={(event) =>
                  goToSection(
                    event,
                    "how",
                  )
                }
              >
                How it works
              </a>
            </div>

            <div>
              <h4>
                Trust
              </h4>

              <a
                href="#trust"
                onClick={(event) =>
                  goToSection(
                    event,
                    "trust",
                  )
                }
              >
                Trust &amp; safety
              </a>

              <a
                href="#accountability"
                onClick={(event) =>
                  goToSection(
                    event,
                    "accountability",
                  )
                }
              >
                Accountability
              </a>
            </div>

            <div>
              <h4>
                Access
              </h4>

              <Link to="/login">
                Member sign in
              </Link>

              <Link to="/admin/login">
                TCN Administrator
              </Link>
            </div>
          </div>

          <div className="hmc-footer-bottom">
            <span>
              © 2026 TCN Ikeja Mentor Connect.
              All rights reserved.
            </span>

            <span>
              People · Purpose · Possibilities
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
