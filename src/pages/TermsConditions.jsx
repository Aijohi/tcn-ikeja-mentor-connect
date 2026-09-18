import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CircleUserRound,
  FileCheck2,
  HandHeart,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import {
  useLayoutEffect,
  useMemo,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./TermsConditions.css";

const sections = [
  {
    id: "introduction",
    label: "Introduction",
    icon: BookOpen,
  },
  {
    id: "using-platform",
    label: "Using the platform",
    icon: FileCheck2,
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: CircleUserRound,
  },
  {
    id: "mentor-applications",
    label: "Mentor applications",
    icon: UserRoundCheck,
  },
  {
    id: "mentorship-requests",
    label: "Mentorship requests",
    icon: UsersRound,
  },
  {
    id: "respectful-behaviour",
    label: "Respectful behaviour",
    icon: HandHeart,
  },
  {
    id: "safety-reporting",
    label: "Safety and reporting",
    icon: ShieldCheck,
  },
  {
    id: "messages",
    label: "Messages",
    icon: MessageCircle,
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: ShieldCheck,
  },
  {
    id: "account-actions",
    label: "Account suspension",
    icon: CircleUserRound,
  },
  {
    id: "changes",
    label: "Changes to these terms",
    icon: RefreshCw,
  },
  {
    id: "contact",
    label: "Contact",
    icon: Mail,
  },
];

function TermsConditions() {
  const location = useLocation();
  const navigate = useNavigate();

  const source = useMemo(
    () =>
      new URLSearchParams(location.search).get("from") ||
      "website",
    [location.search],
  );

  const fromRegistration = source === "register";

  /*
   * Open the page at the very top before the browser paints it.
   * There is intentionally no animation, timeout or delayed scroll.
   */
  useLayoutEffect(() => {
    const supportsScrollRestoration =
      "scrollRestoration" in window.history;

    const previousScrollRestoration =
      supportsScrollRestoration
        ? window.history.scrollRestoration
        : null;

    const html = document.documentElement;
    const previousScrollBehavior =
      html.style.scrollBehavior;

    if (supportsScrollRestoration) {
      window.history.scrollRestoration = "manual";
    }

    html.style.scrollBehavior = "auto";

    window.scrollTo(0, 0);
    html.scrollTop = 0;
    document.body.scrollTop = 0;

    html.style.scrollBehavior =
      previousScrollBehavior;

    return () => {
      if (
        supportsScrollRestoration &&
        previousScrollRestoration
      ) {
        window.history.scrollRestoration =
          previousScrollRestoration;
      }
    };
  }, [location.pathname, location.search]);


  function goBack() {
    navigate(
      fromRegistration
        ? "/register"
        : "/",
    );
  }

  function jumpTo(id) {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }

  return (
    <main className="terms-page">
      <div className="terms-shell">
        <header className="terms-topbar">
          <a
            href="/"
            className="terms-brand"
            onClick={(event) => {
              event.preventDefault();
              navigate("/");
            }}
          >
            <img
              src="/images/hothub-logo.png"
              alt="HOTHUB"
            />

            <span className="terms-brand-copy">
              <strong>
                Mentor Connect
              </strong>

              <small>
                TCN IKEJA
              </small>
            </span>
          </a>
        </header>

        <section className="terms-hero">
          <div className="terms-hero-pattern" />

          <div className="terms-hero-content">
            <button
              type="button"
              className="terms-back-button"
              onClick={goBack}
            >
              <ArrowLeft size={17} />

              {fromRegistration
                ? "Back to continue registration"
                : "Back to website"}
            </button>

            <div className="terms-heading">
              <span className="terms-eyebrow">
                TERMS &amp; CONDITIONS
              </span>

              <h1>
                Simple rules for using
                Mentor Connect.
              </h1>

              <p>
                These terms explain how
                Mentor Connect works and
                what we expect from
                mentees, mentors and
                administrators.
              </p>

              <small>
                Last updated: September
                2026
              </small>
            </div>
          </div>
        </section>

        <div className="terms-layout">
          <aside className="terms-sidebar">
            <div className="terms-sidebar-inner">
              <h2>
                Table of contents
              </h2>

              <nav
                aria-label="Terms and conditions sections"
              >
                {sections.map(
              ({
                id,
                label,
                icon: Icon,
              }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() =>
                    jumpTo(id)
                  }
                >
                  <Icon
                    size={17}
                    strokeWidth={1.8}
                  />

                  <span>
                    {label}
                  </span>
                </button>
              ),
            )}
              </nav>
            </div>
          </aside>

          <article className="terms-content">
            <section
              id="introduction"
              className="terms-section"
            >
              <h2>
                1. Introduction
              </h2>

              <p>
                Welcome to Mentor Connect
                | TCN Ikeja. Mentor
                Connect helps members of
                the TCN Ikeja community
                find mentors, request
                mentorship, schedule
                sessions, communicate and
                manage mentoring
                relationships.
              </p>

              <p>
                By creating an account or
                using Mentor Connect, you
                agree to follow these
                Terms &amp; Conditions. If
                you do not agree, please
                do not use the platform.
              </p>
            </section>

            <section
              id="using-platform"
              className="terms-section"
            >
              <h2>
                2. Using the platform
              </h2>

              <p>
                Mentor Connect is for
                purposeful mentoring,
                learning and personal or
                professional growth.
              </p>

              <ul>
                <li>
                  Use the platform in a
                  lawful and responsible
                  way.
                </li>

                <li>
                  Do not use Mentor
                  Connect for harmful,
                  misleading or
                  unauthorised activity.
                </li>

                <li>
                  Do not use the platform
                  as a dating service,
                  payment service or
                  public social network.
                </li>
              </ul>
            </section>

            <section
              id="accounts"
              className="terms-section"
            >
              <h2>
                3. Your account
              </h2>

              <p>
                You must provide correct
                information when creating
                and maintaining your
                account.
              </p>

              <ul>
                <li>
                  Keep your password and
                  login details private.
                </li>

                <li>
                  Do not allow another
                  person to use your
                  account.
                </li>

                <li>
                  Keep your profile
                  information accurate
                  and up to date.
                </li>

                <li>
                  Report any suspected
                  unauthorised access as
                  soon as possible.
                </li>
              </ul>
            </section>

            <section
              id="mentor-applications"
              className="terms-section"
            >
              <h2>
                4. Mentor applications
              </h2>

              <p>
                Members who want to
                mentor may be asked to
                provide information about
                their experience,
                expertise, availability
                and mentoring interests.
              </p>

              <ul>
                <li>
                  Submitting an
                  application does not
                  guarantee approval.
                </li>

                <li>
                  The TCN Ikeja
                  administration team may
                  review and verify the
                  information provided.
                </li>

                <li>
                  Approved mentors are
                  expected to maintain
                  respectful conduct and
                  accurate profile
                  information.
                </li>
              </ul>
            </section>

            <section
              id="mentorship-requests"
              className="terms-section"
            >
              <h2>
                5. Mentorship requests
              </h2>

              <p>
                Mentees can request
                mentorship from approved
                mentors who are accepting
                requests.
              </p>

              <ul>
                <li>
                  A request does not
                  guarantee acceptance.
                </li>

                <li>
                  Mentors may accept,
                  decline, request more
                  information or refer a
                  mentee when
                  appropriate.
                </li>

                <li>
                  Be clear and respectful
                  when explaining your
                  goals and why you chose
                  a mentor.
                </li>
              </ul>
            </section>

            <section
              id="respectful-behaviour"
              className="terms-section"
            >
              <h2>
                6. Respectful behaviour
              </h2>

              <p>
                Mentor Connect should be
                a safe and respectful
                community for everyone.
              </p>

              <p>
                You must not harass,
                threaten, discriminate
                against or impersonate
                another person. Do not
                pressure anyone for money,
                send inappropriate
                messages, share false
                information or misuse
                another person&apos;s
                private information.
              </p>
            </section>

            <section
              id="safety-reporting"
              className="terms-section"
            >
              <h2>
                7. Safety and reporting
              </h2>

              <p>
                If an interaction makes
                you feel unsafe or
                uncomfortable, use the
                Report a concern feature.
              </p>

              <p>
                Reports may be reviewed
                by authorised Trust,
                Safety and Case
                Resolution administrators
                or Full Access
                Administrators. Depending
                on the situation, action
                may include guidance, a
                warning, temporary
                restriction, suspension,
                removal or referral to
                the appropriate TCN Ikeja
                leadership.
              </p>
            </section>

            <section
              id="messages"
              className="terms-section"
            >
              <h2>
                8. Messages
              </h2>

              <p>
                Messages should be used
                for appropriate mentoring
                and platform
                communication. Private
                mentor and mentee
                conversations are
                separate from
                administrative messages.
              </p>
            </section>

            <section
              id="privacy"
              className="terms-section"
            >
              <h2>
                9. Privacy
              </h2>

              <p>
                Do not share another
                person&apos;s private
                information without
                permission. Mentor
                Connect stores
                information needed to
                operate the platform,
                manage accounts, support
                mentorship and handle
                safety concerns.
              </p>

              <p>
                Sensitive information
                should only be available
                to authorised people who
                need it for their role.
              </p>
            </section>

            <section
              id="account-actions"
              className="terms-section"
            >
              <h2>
                10. Account suspension or
                removal
              </h2>

              <p>
                Mentor Connect may
                restrict, suspend or
                remove an account when
                there is serious misuse,
                repeated misconduct,
                false information, a
                safety concern or another
                important reason
                connected to community
                safety and integrity.
              </p>
            </section>

            <section
              id="changes"
              className="terms-section"
            >
              <h2>
                11. Changes to these
                terms
              </h2>

              <p>
                These terms may be
                updated as Mentor Connect
                grows or as platform
                processes change.
                Important updates will be
                published on the
                platform.
              </p>
            </section>

            <section
              id="contact"
              className="terms-section"
            >
              <h2>
                12. Questions
              </h2>

              <p>
                If you have questions
                about these terms, please
                contact the Mentor Connect
                administration team
                through the platform.
              </p>
            </section>

            <div className="terms-final-note">
              <strong>
                A respectful community
                builds stronger people.
              </strong>

              <p>
                Please use Mentor Connect
                with care, honesty and
                respect for other
                members.
              </p>
            </div>

            <div className="terms-scroll-top-wrap">
              <button
                type="button"
                className="terms-scroll-top"
                onClick={scrollToTop}
              >
                <ArrowUp size={16} />
                Scroll to top
              </button>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}

export default TermsConditions;
