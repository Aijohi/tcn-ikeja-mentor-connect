import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeCheck,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
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
import "./FindMentorSearch.css";

const RESULTS_PER_PAGE = 6;

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
    currentPage,
    setCurrentPage,
  ] = useState(1);

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
        .eq(
          "accepting_requests",
          true,
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
          "We could not load available mentors. Please try again.",
        );

        setLoading(false);
        return;
      }

      const availableMentors =
        (data ?? [])
          .map(
            normaliseMentor,
          )
          .filter(
            (mentor) =>
              mentor.spaces > 0,
          );

      setMentors(
        availableMentors,
      );

      setLoading(false);
    }

    loadMentors();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const query =
    searchTerm
      .trim()
      .toLowerCase();

  const filteredMentors =
    useMemo(() => {
      if (!query) {
        return [];
      }

      return mentors.filter(
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
      mentors,
      query,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredMentors.length /
          RESULTS_PER_PAGE,
      ),
    );

  const paginatedMentors =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        RESULTS_PER_PAGE;

      return filteredMentors.slice(
        start,
        start +
          RESULTS_PER_PAGE,
      );
    }, [
      currentPage,
      filteredMentors,
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
      description="Search for an approved mentor whose experience fits your goals."
    >
      <div className="mentee-request-flow">
        <Progress />

        <div className="request-flow-screen">
          <section className="request-flow-intro">
            <span className="request-flow-eyebrow">
              FIND A MENTOR
            </span>

            <h2>
              Search for the right mentor when you are ready.
            </h2>

            <p>
              Search by mentor name, expertise, role or
              mentorship area. Only mentors who are currently
              accepting new requests and have available space
              will appear.
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
              placeholder="Search by name, expertise or mentorship area"
              aria-label="Search mentors"
            />
          </div>

          {loading ? (
            <section className="request-flow-panel">
              <span className="request-flow-eyebrow">
                FIND A MENTOR
              </span>

              <h3>
                Preparing mentor search
              </h3>

              <p>
                We are loading mentors who are currently
                available for new mentorship requests.
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
          ) : !query ? (
            <section className="request-flow-search-empty">
              <Search
                size={24}
              />

              <div>
                <h3>
                  Start with a search
                </h3>

                <p>
                  Enter a mentor name, profession, expertise
                  or mentorship area. We will only show
                  matching mentors who can currently receive
                  a request.
                </p>
              </div>
            </section>
          ) : filteredMentors.length ===
            0 ? (
            <section className="request-flow-panel">
              <span className="request-flow-eyebrow">
                NO MATCH FOUND
              </span>

              <h3>
                No available mentor found for “
                {searchTerm.trim()}
                ”
              </h3>

              <p>
                Try another name, profession, area of
                expertise or mentorship category.
              </p>
            </section>
          ) : (
            <>
              <div className="request-flow-result-summary">
                <span>
                  {filteredMentors.length}{" "}
                  {filteredMentors.length === 1
                    ? "mentor"
                    : "mentors"}{" "}
                  found
                </span>
              </div>

              <section className="request-flow-directory-grid">
                {paginatedMentors.map(
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

              {totalPages > 1 && (
                <div className="request-flow-pagination">
                  <button
                    type="button"
                    className="request-flow-secondary-button"
                    disabled={
                      currentPage === 1
                    }
                    onClick={() =>
                      setCurrentPage(
                        (
                          current,
                        ) =>
                          Math.max(
                            1,
                            current -
                              1,
                          ),
                      )
                    }
                  >
                    <ChevronLeft
                      size={15}
                    />
                    Previous
                  </button>

                  <span>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    className="request-flow-secondary-button"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() =>
                      setCurrentPage(
                        (
                          current,
                        ) =>
                          Math.min(
                            totalPages,
                            current +
                              1,
                          ),
                      )
                    }
                  >
                    Next
                    <ChevronRight
                      size={15}
                    />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default FindMentor;
