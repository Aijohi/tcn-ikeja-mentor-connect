import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeCheck,
  BriefcaseBusiness,
  Monitor,
  Search,
  UsersRound,
} from "lucide-react";

import {
  useNavigate,
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

function normaliseMentor(row) {
  const profile =
    getProfile(row);

  const name =
    profile?.full_name ||
    "Approved mentor";

  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part
          .charAt(0)
          .toUpperCase(),
      )
      .join("");

  const maximumActive =
    Number(
      row.maximum_active_mentees ??
        0,
    );

  const currentActive =
    Number(
      row.current_active_mentees ??
        0,
    );

  const availableSpaces =
    Math.max(
      maximumActive -
        currentActive,
      0,
    );

  const meetingFormats =
    row.meeting_formats ?? [];

  return {
    id: row.mentor_id,

    name,
    initials,

    profilePhotoUrl:
      profile?.profile_photo_url ??
      null,

    role:
      row.job_title ||
      "Mentor",

    organisation:
      row.organisation || "",

    categories:
      row.mentorship_categories ??
      [],

    expertise:
      row.expertise ?? [],

    languages:
      row.languages ?? [],

    meetingFormat:
      meetingFormats.length > 0
        ? meetingFormats
            .map(formatLabel)
            .join(" / ")
        : "To be agreed",

    yearsOfExperience:
      row.years_of_experience ??
      null,

    spaces:
      availableSpaces,

    acceptingRequests:
      row.accepting_requests ===
      true,
  };
}

function Progress() {
  const items = [
    "Find mentor",
    "View profile",
    "Send request",
  ];

  return (
    <div className="request-flow-progress">
      {items.map(
        (label, index) => {
          const number =
            index + 1;

          const active =
            number === 1;

          return (
            <div
              key={label}
              className={[
                "request-flow-progress-item",
                active
                  ? "is-active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span>
                {number}
              </span>

              <small>
                {label}
              </small>
            </div>
          );
        },
      )}
    </div>
  );
}

function MentorAvatar({
  mentor,
}) {
  return (
    <span className="request-flow-avatar">
      {mentor.profilePhotoUrl ? (
        <img
          src={
            mentor.profilePhotoUrl
          }
          alt=""
          style={{
            width: "100%",
            height: "100%",
            borderRadius:
              "inherit",
            objectFit: "cover",
          }}
        />
      ) : (
        mentor.initials ||
        "MC"
      )}
    </span>
  );
}

function MentorCard({
  mentor,
  onView,
}) {
  return (
    <article className="request-flow-mentor-card">
      <div className="request-flow-mentor-card-top">
        <MentorAvatar
          mentor={mentor}
        />

        <div>
          <span className="request-flow-approved">
            <BadgeCheck
              size={14}
            />
            TCN Ikeja approved mentor
          </span>

          <h3>
            {mentor.name}
          </h3>

          <p>
            {mentor.role}

            {mentor.organisation
              ? ` · ${mentor.organisation}`
              : ""}
          </p>
        </div>
      </div>

      <div className="request-flow-tags">
        {mentor.categories
          .slice(0, 3)
          .map(
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

      <div className="request-flow-mentor-meta">
        <span>
          <UsersRound
            size={15}
          />

          {mentor.spaces}{" "}
          {mentor.spaces === 1
            ? "space"
            : "spaces"}{" "}
          available
        </span>

        <span>
          <Monitor
            size={15}
          />

          {mentor.meetingFormat}
        </span>

        <span>
          <BriefcaseBusiness
            size={15}
          />

          {mentor.yearsOfExperience ===
          null
            ? "Experience not specified"
            : `${mentor.yearsOfExperience} ${
                mentor.yearsOfExperience ===
                1
                  ? "year"
                  : "years"
              } experience`}
        </span>
      </div>

      <button
        type="button"
        className="request-flow-primary-button request-flow-view-profile-primary"
        onClick={() =>
          onView(mentor)
        }
      >
        View profile
      </button>
    </article>
  );
}

function FindMentor() {
  const navigate =
    useNavigate();

  const [
    mentors,
    setMentors,
  ] = useState([]);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    reloadKey,
    setReloadKey,
  ] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadMentors() {
      setLoading(true);
      setError("");

      const {
        data,
        error: mentorError,
      } = await supabase
        .from(
          "mentor_profiles",
        )
        .select(`
          mentor_id,
          job_title,
          organisation,
          expertise,
          mentorship_categories,
          languages,
          meeting_formats,
          maximum_active_mentees,
          current_active_mentees,
          years_of_experience,
          accepting_requests,
          approval_status,
          approved_at,
          profiles!mentor_profiles_mentor_id_fkey (
            full_name,
            profile_photo_url
          )
        `)
        .eq(
          "approval_status",
          "approved",
        )
        .order(
          "approved_at",
          {
            ascending: false,
          },
        );

      if (!isMounted) {
        return;
      }

      if (mentorError) {
        console.error(
          "Unable to load mentors:",
          mentorError.message,
        );

        setMentors([]);

        setError(
          "We could not load approved mentors. Please try again.",
        );

        setLoading(false);
        return;
      }

      setMentors(
        (data ?? []).map(
          normaliseMentor,
        ),
      );

      setLoading(false);
    }

    loadMentors();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const availableMentors =
    useMemo(
      () =>
        mentors.filter(
          (mentor) =>
            mentor.acceptingRequests &&
            mentor.spaces > 0,
        ),
      [mentors],
    );

  const filteredMentors =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      if (!query) {
        return availableMentors;
      }

      return availableMentors.filter(
        (mentor) => {
          const searchableValues = [
            mentor.name,
            mentor.role,
            mentor.organisation,
            ...mentor.categories,
            ...mentor.expertise,
            ...mentor.languages,
            mentor.meetingFormat,
          ];

          return searchableValues.some(
            (value) =>
              String(
                value || "",
              )
                .toLowerCase()
                .includes(
                  query,
                ),
          );
        },
      );
    }, [
      availableMentors,
      searchTerm,
    ]);

  function viewMentor(
    mentor,
  ) {
    navigate(
      `/mentee/mentors/${mentor.id}`,
    );

    window.scrollTo(
      0,
      0,
    );
  }

  return (
    <DashboardLayout
      title="Find a mentor"
      description="Find an approved mentor whose experience fits your goals."
    >
      <div className="mentee-request-flow">
        <Progress />

        <div className="request-flow-screen">
          <section className="request-flow-intro">
            <span className="request-flow-eyebrow">
              FIND A MENTOR
            </span>

            <h2>
              Choose someone whose experience fits your goals.
            </h2>

            <p>
              Browse approved mentors, review their profile
              and request mentorship when you find a suitable
              match.
            </p>
          </section>

          <div className="request-flow-search">
            <Search
              size={18}
            />

            <input
              type="text"
              value={
                searchTerm
              }
              onChange={(
                event,
              ) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              placeholder="Search by name, expertise or keyword"
              aria-label="Search mentors"
            />
          </div>

          {loading ? (
            <section className="request-flow-panel">
              <span className="request-flow-eyebrow">
                FIND A MENTOR
              </span>

              <h3>
                Finding approved mentors
              </h3>

              <p>
                We are loading mentors who are currently
                available to receive mentorship requests.
              </p>
            </section>
          ) : error ? (
            <section className="request-flow-panel">
              <span className="request-flow-eyebrow">
                SOMETHING WENT WRONG
              </span>

              <h3>
                We could not load mentors
              </h3>

              <p>
                {error}
              </p>

              <div
                className="request-flow-bottom-action"
                style={{
                  justifyContent:
                    "flex-start",
                  marginTop:
                    "18px",
                }}
              >
                <button
                  type="button"
                  className="request-flow-primary-button"
                  onClick={() =>
                    setReloadKey(
                      (
                        current,
                      ) =>
                        current +
                        1,
                    )
                  }
                >
                  Try again
                </button>
              </div>
            </section>
          ) : filteredMentors.length ===
            0 ? (
            <section className="request-flow-panel">
              {searchTerm.trim() ? (
                <>
                  <span className="request-flow-eyebrow">
                    NO MATCH FOUND
                  </span>

                  <h3>
                    No mentor found for “
                    {searchTerm.trim()}
                    ”
                  </h3>

                  <p>
                    Try another name, area of expertise or
                    mentorship category.
                  </p>
                </>
              ) : (
                <>
                  <span className="request-flow-eyebrow">
                    NO MENTORS AVAILABLE
                  </span>

                  <h3>
                    There are no mentors accepting requests
                    right now.
                  </h3>

                  <p>
                    Approved mentors will appear here when
                    they are available for new mentees.
                  </p>
                </>
              )}
            </section>
          ) : (
            <section className="request-flow-directory-grid">
              {filteredMentors.map(
                (mentor) => (
                  <MentorCard
                    key={
                      mentor.id
                    }
                    mentor={
                      mentor
                    }
                    onView={
                      viewMentor
                    }
                  />
                ),
              )}
            </section>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default FindMentor;
