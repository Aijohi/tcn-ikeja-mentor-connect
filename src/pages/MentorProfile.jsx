import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Clock3,
  Languages,
  Monitor,
  UsersRound,
} from "lucide-react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabase";

import "./MenteeRequestFlow.css";

function formatLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function getProfile(row) {
  if (Array.isArray(row?.profiles)) {
    return row.profiles[0] ?? null;
  }

  return row?.profiles ?? null;
}

function Progress() {
  const items = [
    "Find mentor",
    "View profile",
    "Send request",
  ];

  return (
    <div className="request-flow-progress">
      {items.map((label, index) => {
        const number = index + 1;
        const complete = number < 2;
        const active = number === 2;

        return (
          <div
            key={label}
            className={[
              "request-flow-progress-item",
              active ? "is-active" : "",
              complete ? "is-complete" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span>
              {complete ? (
                <Check
                  size={14}
                  strokeWidth={2.5}
                />
              ) : (
                number
              )}
            </span>

            <small>{label}</small>
          </div>
        );
      })}
    </div>
  );
}

function MentorAvatar({
  profile,
  initials,
}) {
  return (
    <span className="request-flow-avatar request-flow-avatar--large">
      {profile?.profile_photo_url ? (
        <img
          src={profile.profile_photo_url}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "inherit",
            objectFit: "cover",
          }}
        />
      ) : (
        initials || "MC"
      )}
    </span>
  );
}

function MentorProfile() {
  const { mentorId } =
    useParams();

  const navigate =
    useNavigate();

  const [
    mentor,
    setMentor,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMentor() {
      setLoading(true);
      setError("");

      const {
        data,
        error: mentorError,
      } = await supabase
        .from("mentor_profiles")
        .select(`
          mentor_id,
          biography,
          job_title,
          organisation,
          expertise,
          mentorship_categories,
          languages,
          meeting_formats,
          session_lengths,
          maximum_active_mentees,
          current_active_mentees,
          years_of_experience,
          accepting_requests,
          approval_status,
          profiles!mentor_profiles_mentor_id_fkey (
            full_name,
            profile_photo_url
          )
        `)
        .eq(
          "mentor_id",
          mentorId,
        )
        .eq(
          "approval_status",
          "approved",
        )
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (mentorError) {
        console.error(
          "Unable to load mentor profile:",
          mentorError.message,
        );

        setError(
          "We could not load this mentor profile. Please try again.",
        );

        setLoading(false);
        return;
      }

      if (!data) {
        setError(
          "This mentor profile is no longer available.",
        );

        setLoading(false);
        return;
      }

      setMentor(data);
      setLoading(false);
    }

    loadMentor();

    return () => {
      isMounted = false;
    };
  }, [mentorId]);

  if (loading) {
    return (
      <DashboardLayout
        title="Mentor profile"
        description="Learn more about this mentor."
      >
        <div className="mentee-request-flow">
          <Progress />

          <section className="request-flow-panel">
            <span className="request-flow-eyebrow">
              MENTOR PROFILE
            </span>

            <h3>
              Loading mentor profile
            </h3>

            <p>
              Please wait while we prepare this mentor&apos;s
              information.
            </p>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !mentor) {
    return (
      <DashboardLayout
        title="Mentor profile"
        description="Learn more about this mentor."
      >
        <div className="mentee-request-flow">
          <Progress />

          <section className="request-flow-panel">
            <span className="request-flow-eyebrow">
              PROFILE UNAVAILABLE
            </span>

            <h3>
              Mentor profile unavailable
            </h3>

            <p>{error}</p>

            <div
              className="request-flow-bottom-action"
              style={{
                marginTop: "18px",
                justifyContent: "flex-start",
              }}
            >
              <button
                type="button"
                className="request-flow-secondary-button"
                onClick={() =>
                  navigate(
                    "/mentee/find-mentor",
                  )
                }
              >
                Back to mentors
              </button>
            </div>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  const profile =
    getProfile(mentor);

  const fullName =
    profile?.full_name ||
    "Approved mentor";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) =>
        name
          .charAt(0)
          .toUpperCase(),
      )
      .join("");

  const maximumActiveMentees =
    Number(
      mentor.maximum_active_mentees ??
        0,
    );

  const currentActiveMentees =
    Number(
      mentor.current_active_mentees ??
        0,
    );

  const availableSpaces =
    Math.max(
      maximumActiveMentees -
        currentActiveMentees,
      0,
    );

  const atCapacity =
    availableSpaces <= 0 ||
    mentor.accepting_requests !==
      true;

  const meetingFormats =
    mentor.meeting_formats ?? [];

  const sessionLengths =
    mentor.session_lengths ?? [];

  const languages =
    mentor.languages ?? [];

  const categories =
    mentor.mentorship_categories ??
    [];

  const expertise =
    mentor.expertise ?? [];

  return (
    <DashboardLayout
      title="Mentor profile"
      description="Learn more about this mentor before deciding to request mentorship."
    >
      <div className="mentee-request-flow">
        <Progress />

        <div className="request-flow-screen">
          <button
            type="button"
            className="request-flow-back"
            onClick={() =>
              navigate(
                "/mentee/find-mentor",
              )
            }
          >
            <ArrowLeft size={16} />
            Back to mentors
          </button>

          <section className="request-flow-profile-hero">
            <div className="request-flow-profile-main">
              <MentorAvatar
                profile={profile}
                initials={initials}
              />

              <div>
                <span className="request-flow-approved">
                  <BadgeCheck
                    size={15}
                  />
                  TCN Ikeja approved mentor
                </span>

                <h2>
                  {fullName}
                </h2>

                <p>
                  {mentor.job_title ||
                    "Mentor"}

                  {mentor.organisation
                    ? ` · ${mentor.organisation}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="request-flow-profile-action">
              <span>
                {atCapacity
                  ? "Not currently accepting new requests"
                  : `${availableSpaces} ${
                      availableSpaces ===
                      1
                        ? "mentoring space"
                        : "mentoring spaces"
                    } available`}
              </span>

              {!atCapacity && (
                <button
                  type="button"
                  className="request-flow-primary-button"
                  onClick={() =>
                    navigate(
                      `/mentee/mentors/${mentor.mentor_id}/request`,
                    )
                  }
                >
                  Request mentorship
                </button>
              )}
            </div>
          </section>

          <section className="request-flow-stat-grid">
            <article>
              <BriefcaseBusiness
                size={18}
              />

              <strong>
                {mentor.years_of_experience ??
                  "—"}
              </strong>

              <span>
                {mentor.years_of_experience ===
                1
                  ? "year of experience"
                  : "years of experience"}
              </span>
            </article>

            <article>
              <UsersRound
                size={18}
              />

              <strong>
                {availableSpaces}
              </strong>

              <span>
                mentoring{" "}
                {availableSpaces === 1
                  ? "space"
                  : "spaces"}{" "}
                available
              </span>
            </article>

            <article>
              <Clock3 size={18} />

              <strong>
                {sessionLengths.length >
                0
                  ? sessionLengths[0]
                  : "—"}
              </strong>

              <span>
                preferred session length
                {sessionLengths.length >
                0
                  ? " minutes"
                  : ""}
              </span>
            </article>
          </section>

          <div className="request-flow-profile-grid">
            <section className="request-flow-panel">
              <span className="request-flow-eyebrow">
                ABOUT
              </span>

              <h3>
                About{" "}
                {fullName.split(" ")[0]}
              </h3>

              <p>
                {mentor.biography ||
                  "This mentor has not added a biography yet."}
              </p>

              <div className="request-flow-detail">
                <BriefcaseBusiness
                  size={18}
                />

                <div>
                  <small>
                    Areas of mentorship
                  </small>

                  {categories.length >
                  0 ? (
                    <div className="request-flow-tags">
                      {categories.map(
                        (category) => (
                          <span
                            key={
                              category
                            }
                          >
                            {category}
                          </span>
                        ),
                      )}
                    </div>
                  ) : (
                    <strong>
                      Not specified
                    </strong>
                  )}
                </div>
              </div>

              {expertise.length >
                0 && (
                <div className="request-flow-detail">
                  <BriefcaseBusiness
                    size={18}
                  />

                  <div>
                    <small>
                      Areas of expertise
                    </small>

                    <div className="request-flow-tags">
                      {expertise.map(
                        (item) => (
                          <span
                            key={item}
                          >
                            {item}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="request-flow-detail">
                <Languages
                  size={18}
                />

                <div>
                  <small>
                    Languages
                  </small>

                  <strong>
                    {languages.length >
                    0
                      ? languages.join(
                          ", ",
                        )
                      : "Not specified"}
                  </strong>
                </div>
              </div>

              <div className="request-flow-detail">
                <Monitor size={18} />

                <div>
                  <small>
                    Session format
                  </small>

                  <strong>
                    {meetingFormats.length >
                    0
                      ? meetingFormats
                          .map(
                            formatLabel,
                          )
                          .join(" / ")
                      : "To be agreed"}
                  </strong>
                </div>
              </div>
            </section>

            <aside className="request-flow-panel">
              <span className="request-flow-eyebrow">
                SESSION PREFERENCES
              </span>

              <h3>
                How mentoring sessions work
              </h3>

              <p>
                Final booking happens only after your
                mentorship request has been accepted.
              </p>

              <div className="request-flow-availability">
                {meetingFormats.length >
                0 ? (
                  meetingFormats.map(
                    (format) => (
                      <span
                        key={format}
                      >
                        <Monitor
                          size={16}
                        />

                        {formatLabel(
                          format,
                        )}
                      </span>
                    ),
                  )
                ) : (
                  <span>
                    <Monitor
                      size={16}
                    />
                    Session format to be agreed
                  </span>
                )}
              </div>

              <div className="request-flow-session-length">
                <Clock3 size={17} />

                <div>
                  <small>
                    Preferred session length
                  </small>

                  <strong>
                    {sessionLengths.length >
                    0
                      ? sessionLengths
                          .map(
                            (length) =>
                              `${length} minutes`,
                          )
                          .join(", ")
                      : "To be agreed"}
                  </strong>
                </div>
              </div>
            </aside>
          </div>

          <div className="request-flow-bottom-action">
            {!atCapacity ? (
              <button
                type="button"
                className="request-flow-primary-button"
                onClick={() =>
                  navigate(
                    `/mentee/mentors/${mentor.mentor_id}/request`,
                  )
                }
              >
                Request mentorship
              </button>
            ) : (
              <button
                type="button"
                className="request-flow-primary-button"
                disabled
              >
                Mentor at capacity
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default MentorProfile;
