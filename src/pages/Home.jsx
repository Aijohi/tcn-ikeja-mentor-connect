import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
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
  Star,
  Quote,
  UserPlus,
  Users,
  X,
  Menu,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./Home.css";
import "./HomeResponsive.css";
import "./HomePublicDiscovery.css";

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

const PUBLIC_MENTOR_LIMIT = 500;
const PUBLIC_TESTIMONIAL_LIMIT = 6;

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase(),
    )
    .join("");
}

function normalisePublicMentor(mentor) {
  const categories =
    Array.isArray(
      mentor.mentorship_categories,
    )
      ? mentor.mentorship_categories
      : [];

  const yearsValue =
    Number(
      mentor.years_of_experience,
    );

  const ratingValue =
    Number(
      mentor.average_rating ??
        mentor.rating_average ??
        mentor.rating,
    );

  const reviewCountValue =
    Number(
      mentor.review_count ??
        mentor.rating_count ??
        0,
    );

  return {
    id: mentor.mentor_id,
    name:
      mentor.full_name ||
      "Approved mentor",
    photo:
      mentor.profile_photo_url ||
      "",
    jobTitle:
      mentor.job_title ||
      "Mentor",
    organisation:
      mentor.organisation ||
      "",
    categories,
    description:
      mentor.biography ||
      "Approved TCN Ikeja mentor available to support purposeful growth.",
    spaces: Math.max(
      Number(
        mentor.available_spaces ??
          0,
      ),
      0,
    ),
    yearsOfExperience:
      Number.isFinite(
        yearsValue,
      )
        ? yearsValue
        : null,
    rating:
      Number.isFinite(
        ratingValue,
      )
        ? Math.min(
            5,
            Math.max(
              0,
              ratingValue,
            ),
          )
        : null,
    reviewCount:
      Number.isFinite(
        reviewCountValue,
      )
        ? Math.max(
            0,
            reviewCountValue,
          )
        : 0,
  };
}

function normalisePublicTestimonial(
  testimonial,
) {
  return {
    id: testimonial.id,
    reviewer:
      testimonial.reviewer_name ||
      "TCN Ikeja mentee",
    mentor:
      testimonial.mentor_name ||
      "their mentor",
    rating: Math.min(
      5,
      Math.max(
        1,
        Number(
          testimonial.rating ??
            5,
        ),
      ),
    ),
    review:
      testimonial.review_text ||
      "",
  };
}

function Home() {
  const [
    selectedArea,
    setSelectedArea,
  ] = useState("All areas");

  const [
    mentorPage,
    setMentorPage,
  ] = useState(1);

  const [
    mentorPageSize,
    setMentorPageSize,
  ] = useState(4);

  const mentorViewportRef =
    useRef(null);

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


  const [
    mentors,
    setMentors,
  ] = useState([]);

  const [
    mentorsLoading,
    setMentorsLoading,
  ] = useState(true);

  const [
    mentorPreviewError,
    setMentorPreviewError,
  ] = useState("");

  const [
    testimonials,
    setTestimonials,
  ] = useState([]);

  const [
    testimonialsLoading,
    setTestimonialsLoading,
  ] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicContent() {
      setMentorsLoading(true);
      setTestimonialsLoading(true);
      setMentorPreviewError("");

      const [
        mentorResult,
        testimonialResult,
      ] = await Promise.all([
        supabase.rpc(
          "get_public_mentor_preview",
          {
            p_limit:
              PUBLIC_MENTOR_LIMIT,
          },
        ),
        supabase.rpc(
          "get_public_testimonials",
          {
            p_limit:
              PUBLIC_TESTIMONIAL_LIMIT,
          },
        ),
      ]);

      if (!isMounted) {
        return;
      }

      if (mentorResult.error) {
        console.error(
          "Unable to load public mentor preview:",
          mentorResult.error.message,
        );

        setMentors([]);
        setMentorPreviewError(
          "We could not load the mentor preview right now.",
        );
      } else {
        setMentors(
          (mentorResult.data ?? [])
            .map(
              normalisePublicMentor,
            )
            .filter(
              (mentor) =>
                mentor.spaces > 0,
            )
            .slice(
              0,
              PUBLIC_MENTOR_LIMIT,
            ),
        );
      }

      if (testimonialResult.error) {
        console.error(
          "Unable to load public testimonials:",
          testimonialResult.error.message,
        );

        setTestimonials([]);
      } else {
        setTestimonials(
          (
            testimonialResult.data ??
            []
          )
            .map(
              normalisePublicTestimonial,
            )
            .filter(
              (testimonial) =>
                testimonial.review.trim(),
            )
            .slice(
              0,
              PUBLIC_TESTIMONIAL_LIMIT,
            ),
        );
      }

      setMentorsLoading(false);
      setTestimonialsLoading(false);
    }

    loadPublicContent();

    return () => {
      isMounted = false;
    };
  }, []);

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

  useEffect(() => {
    function updateMentorPageSize() {
      const width =
        window.innerWidth;

      if (width <= 680) {
        setMentorPageSize(3);
        return;
      }

      if (width <= 1000) {
        setMentorPageSize(4);
        return;
      }

      setMentorPageSize(8);
    }

    updateMentorPageSize();

    window.addEventListener(
      "resize",
      updateMentorPageSize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateMentorPageSize,
      );
    };
  }, []);

  const mentorAreas =
    useMemo(() => {
      const uniqueAreas =
        new Set();

      mentors.forEach(
        (mentor) => {
          mentor.categories.forEach(
            (category) => {
              if (category) {
                uniqueAreas.add(
                  category,
                );
              }
            },
          );
        },
      );

      return [
        "All areas",
        ...Array.from(
          uniqueAreas,
        ),
      ];
    }, [mentors]);

  const visibleMentors =
    useMemo(() => {
      if (
        selectedArea ===
        "All areas"
      ) {
        return mentors;
      }

      return mentors.filter(
        (mentor) =>
          mentor.categories.includes(
            selectedArea,
          ),
      );
    }, [
      mentors,
      selectedArea,
    ]);

  const mentorTotalPages =
    Math.max(
      1,
      Math.ceil(
        visibleMentors.length /
          mentorPageSize,
      ),
    );

  const safeMentorPage =
    Math.min(
      mentorPage,
      mentorTotalPages,
    );

  const pagedMentors =
    useMemo(() => {
      const startIndex =
        (safeMentorPage - 1) *
        mentorPageSize;

      return visibleMentors.slice(
        startIndex,
        startIndex +
          mentorPageSize,
      );
    }, [
      mentorPageSize,
      safeMentorPage,
      visibleMentors,
    ]);

  const mentorPaginationPages =
    useMemo(() => {
      if (
        mentorTotalPages <= 5
      ) {
        return Array.from(
          {
            length:
              mentorTotalPages,
          },
          (
            _,
            index,
          ) => index + 1,
        );
      }

      const pages =
        new Set([
          1,
          mentorTotalPages,
          safeMentorPage - 1,
          safeMentorPage,
          safeMentorPage + 1,
        ]);

      return Array.from(
        pages,
      )
        .filter(
          (page) =>
            page >= 1 &&
            page <=
              mentorTotalPages,
        )
        .sort(
          (
            first,
            second,
          ) =>
            first - second,
        );
    }, [
      mentorTotalPages,
      safeMentorPage,
    ]);

  useEffect(() => {
    if (
      !mentorAreas.includes(
        selectedArea,
      )
    ) {
      setSelectedArea(
        "All areas",
      );
    }
  }, [
    mentorAreas,
    selectedArea,
  ]);

  useEffect(() => {
    setMentorPage(1);
  }, [
    selectedArea,
    mentorPageSize,
  ]);

  useEffect(() => {
    if (
      mentorPage >
      mentorTotalPages
    ) {
      setMentorPage(
        mentorTotalPages,
      );
    }
  }, [
    mentorPage,
    mentorTotalPages,
  ]);

  useEffect(() => {
    mentorViewportRef.current?.scrollTo({
      left: 0,
      behavior: "smooth",
    });
  }, [
    safeMentorPage,
    selectedArea,
  ]);

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
          className="hmc-section hmc-public-mentor-section"
          id="mentors"
        >
          <div className="hmc-shell hmc-reveal">
            <div className="hmc-public-mentor-heading">
              <p>
                FIND A MENTOR
              </p>

              <h2>
                Meet some of our approved
                mentors.
              </h2>

              <span>
                Discover approved TCN Ikeja
                mentors who are currently
                accepting mentorship requests
                and have space for a new mentee.
              </span>
            </div>

            <div
              className="hmc-public-mentor-tabs"
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

            {mentorsLoading ? (
              <div className="hmc-public-loading hmc-public-mentor-state">
                <div className="loader" />

                <p>
                  Loading available mentors...
                </p>
              </div>
            ) : mentorPreviewError ? (
              <div className="hmc-public-empty hmc-public-mentor-state">
                <Search
                  size={24}
                  aria-hidden="true"
                />

                <p>
                  {mentorPreviewError}
                </p>
              </div>
            ) : visibleMentors.length ===
              0 ? (
              <div className="hmc-public-empty hmc-public-mentor-state">
                <Search
                  size={24}
                  aria-hidden="true"
                />

                <p>
                  No mentors are available in
                  this area right now.
                </p>
              </div>
            ) : (
              <>
                <div
                  ref={
                    mentorViewportRef
                  }
                  className="hmc-public-mentor-viewport"
                >
                  <div className="hmc-public-mentor-grid">
                    {pagedMentors.map(
                      (mentor) => {
                        const filledStars =
                          mentor.rating ===
                          null
                            ? 0
                            : Math.round(
                                mentor.rating,
                              );

                        return (
                          <article
                            className="hmc-public-mentor-card"
                            key={
                              mentor.id
                            }
                          >
                            {mentor.photo ? (
                              <img
                                src={
                                  mentor.photo
                                }
                                alt=""
                                className="hmc-public-mentor-photo"
                              />
                            ) : (
                              <div className="hmc-public-mentor-photo hmc-public-mentor-photo--placeholder">
                                <span>
                                  {getInitials(
                                    mentor.name,
                                  ) ||
                                    "MC"}
                                </span>
                              </div>
                            )}

                            <div className="hmc-public-mentor-image-shade" />

                            <div className="hmc-public-mentor-content">
                              {mentor.categories.length >
                                0 && (
                                <div className="hmc-public-mentor-card-tags">
                                  {mentor.categories
                                    .slice(
                                      0,
                                      2,
                                    )
                                    .map(
                                      (
                                        category,
                                      ) => (
                                        <span
                                          key={
                                            category
                                          }
                                        >
                                          {
                                            category
                                          }
                                        </span>
                                      ),
                                    )}
                                </div>
                              )}

                              <h3>
                                {
                                  mentor.name
                                }
                              </h3>

                              <p className="hmc-public-mentor-role">
                                {
                                  mentor.jobTitle
                                }
                                {mentor.organisation
                                  ? ` · ${mentor.organisation}`
                                  : ""}
                              </p>

                              <div className="hmc-public-mentor-rating">
                                <div
                                  className="hmc-public-mentor-stars"
                                  aria-label={
                                    mentor.rating ===
                                    null
                                      ? "No ratings yet"
                                      : `${mentor.rating.toFixed(
                                          1,
                                        )} out of 5`
                                  }
                                >
                                  {Array.from(
                                    {
                                      length: 5,
                                    },
                                    (
                                      _,
                                      index,
                                    ) => (
                                      <Star
                                        key={
                                          index
                                        }
                                        size={14}
                                        fill={
                                          index <
                                          filledStars
                                            ? "currentColor"
                                            : "none"
                                        }
                                        aria-hidden="true"
                                      />
                                    ),
                                  )}
                                </div>

                                <span>
                                  {mentor.rating ===
                                  null
                                    ? "No ratings yet"
                                    : `${mentor.rating.toFixed(
                                        1,
                                      )}${
                                        mentor.reviewCount >
                                        0
                                          ? ` (${mentor.reviewCount})`
                                          : ""
                                      }`}
                                </span>
                              </div>

                              <div className="hmc-public-mentor-meta">
                                <span>
                                  <BriefcaseBusiness
                                    size={15}
                                    aria-hidden="true"
                                  />

                                  {mentor.yearsOfExperience ===
                                  null
                                    ? "Experience not listed"
                                    : `${mentor.yearsOfExperience} ${
                                        mentor.yearsOfExperience ===
                                        1
                                          ? "year"
                                          : "years"
                                      } experience`}
                                </span>

                                <span>
                                  <Users
                                    size={15}
                                    aria-hidden="true"
                                  />

                                  {
                                    mentor.spaces
                                  }{" "}
                                  {mentor.spaces ===
                                  1
                                    ? "space"
                                    : "spaces"}{" "}
                                  available
                                </span>
                              </div>

                              <Link
                                to="/register"
                                className="hmc-public-mentor-view"
                              >
                                <span>
                                  View mentor
                                </span>

                                <ArrowRight
                                  size={16}
                                  aria-hidden="true"
                                />
                              </Link>
                            </div>
                          </article>
                        );
                      },
                    )}
                  </div>
                </div>

                <div
                  className="hmc-public-mentor-pagination"
                  aria-label="Mentor pages"
                >
                  <button
                    type="button"
                    className="hmc-public-mentor-page-arrow"
                    onClick={() =>
                      setMentorPage(
                        (
                          current,
                        ) =>
                          Math.max(
                            1,
                            current - 1,
                          ),
                      )
                    }
                    disabled={
                      safeMentorPage ===
                      1
                    }
                    aria-label="Previous mentor page"
                  >
                    <ArrowLeft
                      size={16}
                    />

                    <span>
                      Previous
                    </span>
                  </button>

                  <div className="hmc-public-mentor-page-numbers">
                    {mentorPaginationPages.map(
                      (
                        page,
                        index,
                      ) => {
                        const previousPage =
                          mentorPaginationPages[
                            index -
                              1
                          ];

                        const showGap =
                          previousPage &&
                          page -
                            previousPage >
                            1;

                        return (
                          <span
                            className="hmc-public-mentor-page-item"
                            key={
                              page
                            }
                          >
                            {showGap && (
                              <i
                                aria-hidden="true"
                              >
                                …
                              </i>
                            )}

                            <button
                              type="button"
                              className={
                                page ===
                                safeMentorPage
                                  ? "is-current"
                                  : ""
                              }
                              aria-current={
                                page ===
                                safeMentorPage
                                  ? "page"
                                  : undefined
                              }
                              onClick={() =>
                                setMentorPage(
                                  page,
                                )
                              }
                            >
                              {
                                page
                              }
                            </button>
                          </span>
                        );
                      },
                    )}
                  </div>

                  <button
                    type="button"
                    className="hmc-public-mentor-page-arrow"
                    onClick={() =>
                      setMentorPage(
                        (
                          current,
                        ) =>
                          Math.min(
                            mentorTotalPages,
                            current + 1,
                          ),
                      )
                    }
                    disabled={
                      safeMentorPage ===
                      mentorTotalPages
                    }
                    aria-label="Next mentor page"
                  >
                    <span>
                      Next
                    </span>

                    <ArrowRight
                      size={16}
                    />
                  </button>
                </div>

                {mentorPageSize ===
                  3 &&
                  pagedMentors.length >
                    1 && (
                  <p className="hmc-public-mentor-mobile-hint">
                    Swipe to see the other
                    mentors on this page.
                  </p>
                )}
              </>
            )}
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

        {!testimonialsLoading &&
          testimonials.length > 0 && (
          <section
            className="hmc-section hmc-testimonials-section"
            id="testimonials"
          >
            <div className="hmc-shell hmc-reveal">
              <div className="hmc-section-heading">
                <p>
                  MENTEE STORIES
                </p>

                <h2>
                  What mentees are saying
                  about their mentoring
                  experience.
                </h2>

                <span>
                  These testimonials come from
                  positive feedback that mentees
                  agreed could be shared and that
                  has been approved for public
                  display.
                </span>
              </div>

              <div className="hmc-testimonial-grid">
                {testimonials.map(
                  (testimonial) => (
                    <article
                      className="hmc-testimonial-card"
                      key={testimonial.id}
                    >
                      <Quote
                        className="hmc-testimonial-quote"
                        size={22}
                        aria-hidden="true"
                      />

                      <div
                        className="hmc-testimonial-stars"
                        aria-label={`${testimonial.rating} out of 5 stars`}
                      >
                        {Array.from(
                          {
                            length: 5,
                          },
                          (
                            _,
                            index,
                          ) => (
                            <Star
                              key={index}
                              size={14}
                              aria-hidden="true"
                              fill={
                                index <
                                testimonial.rating
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          ),
                        )}
                      </div>

                      <p>
                        “{testimonial.review}”
                      </p>

                      <footer>
                        <strong>
                          {testimonial.reviewer}
                        </strong>

                        <span>
                          Mentored by{" "}
                          {testimonial.mentor}
                        </span>
                      </footer>
                    </article>
                  ),
                )}
              </div>
            </div>
          </section>
        )}

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
