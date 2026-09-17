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
  Filter,
  Search,
  Star,
  UsersRound,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  supabase,
} from "../lib/supabase";

import "./MenteeRequestFlow.css";
import "./FindMentorSearch.css";
import "./FindMentorGrid.css";

const DESKTOP_PAGE_SIZE = 16;
const MOBILE_PAGE_SIZE = 1;

function formatLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );
}

function normaliseMentor(row) {
  const name =
    row.full_name ||
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

  const meetingFormats =
    row.meeting_formats ?? [];

  return {
    id: row.mentor_id,
    name,
    initials,
    profilePhotoUrl:
      row.profile_photo_url ??
      null,
    role:
      row.job_title ||
      "Mentor",
    organisation:
      row.organisation ||
      "",
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
            .map(
              formatLabel,
            )
            .join(" / ")
        : "To be agreed",
    yearsOfExperience:
      row.years_of_experience ??
      null,
    spaces:
      Number(
        row.available_spaces ??
          0,
      ),
    rating:
      row.average_rating ===
      null
        ? null
        : Number(
            row.average_rating,
          ),
    reviewCount:
      Number(
        row.review_count ??
          0,
      ),
  };
}

function MentorCard({
  mentor,
  onView,
}) {
  return (
    <article className="find-mentor-card">
      <div className="find-mentor-image-shell">
        {mentor.profilePhotoUrl ? (
          <img
            src={
              mentor.profilePhotoUrl
            }
            alt=""
            className="find-mentor-image"
          />
        ) : (
          <div className="find-mentor-image find-mentor-image-placeholder">
            <span>
              {mentor.initials ||
                "MC"}
            </span>
          </div>
        )}

        <div className="find-mentor-image-overlay">
          <span className="find-mentor-approved">
            <BadgeCheck
              size={13}
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

          <div className="find-mentor-rating">
            <Star
              size={14}
              fill="currentColor"
            />

            <strong>
              {mentor.rating !==
              null
                ? mentor.rating.toFixed(
                    1,
                  )
                : "New"}
            </strong>

            <span>
              {mentor.reviewCount >
              0
                ? `(${mentor.reviewCount} ${
                    mentor.reviewCount ===
                    1
                      ? "review"
                      : "reviews"
                  })`
                : "No ratings yet"}
            </span>
          </div>
        </div>
      </div>

      <div className="find-mentor-card-body">
        <div className="find-mentor-tags">
          {[
            ...mentor.categories,
            ...mentor.expertise,
          ]
            .filter(
              (
                item,
                index,
                array,
              ) =>
                array.indexOf(
                  item,
                ) ===
                index,
            )
            .slice(
              0,
              3,
            )
            .map(
              (item) => (
                <span
                  key={item}
                >
                  {item}
                </span>
              ),
            )}
        </div>

        <div className="find-mentor-card-meta">
          <span>
            <BriefcaseBusiness
              size={14}
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

          <span>
            <UsersRound
              size={14}
            />
            {mentor.spaces}{" "}
            {mentor.spaces === 1
              ? "space"
              : "spaces"}{" "}
            available
          </span>
        </div>

        <button
          type="button"
          className="find-mentor-view-button"
          onClick={() =>
            onView(
              mentor,
            )
          }
        >
          View profile
        </button>
      </div>
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
    selectedArea,
    setSelectedArea,
  ] = useState("All areas");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    mobileView,
    setMobileView,
  ] = useState(false);

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
    function updateView() {
      setMobileView(
        window.innerWidth <=
          680,
      );
    }

    updateView();

    window.addEventListener(
      "resize",
      updateView,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateView,
      );
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadMentors() {
      setLoading(true);
      setError("");

      const {
        data,
        error: mentorError,
      } = await supabase.rpc(
        "get_public_mentor_preview",
        {
          p_limit: 500,
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

      setMentors(
        (data ?? [])
          .map(
            normaliseMentor,
          )
          .filter(
            (mentor) =>
              mentor.spaces > 0,
          ),
      );

      setLoading(false);
    }

    loadMentors();

    return () => {
      isMounted = false;
    };
  }, [reloadKey]);

  const specialisations =
    useMemo(() => {
      const values =
        new Set();

      mentors.forEach(
        (mentor) => {
          [
            ...mentor.categories,
            ...mentor.expertise,
          ].forEach(
            (value) => {
              if (
                String(
                  value || "",
                ).trim()
              ) {
                values.add(
                  value,
                );
              }
            },
          );
        },
      );

      return [
        "All areas",
        ...Array.from(
          values,
        ).sort(
          (
            first,
            second,
          ) =>
            String(
              first,
            ).localeCompare(
              String(
                second,
              ),
            ),
        ),
      ];
    }, [mentors]);

  useEffect(() => {
    if (
      !specialisations.includes(
        selectedArea,
      )
    ) {
      setSelectedArea(
        "All areas",
      );
    }
  }, [
    selectedArea,
    specialisations,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedArea,
    mobileView,
  ]);

  const filteredMentors =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      return mentors.filter(
        (mentor) => {
          const matchesArea =
            selectedArea ===
              "All areas" ||
            [
              ...mentor.categories,
              ...mentor.expertise,
            ].includes(
              selectedArea,
            );

          if (!matchesArea) {
            return false;
          }

          if (!query) {
            return true;
          }

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
      searchTerm,
      selectedArea,
    ]);

  const pageSize =
    mobileView
      ? MOBILE_PAGE_SIZE
      : DESKTOP_PAGE_SIZE;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredMentors.length /
          pageSize,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const paginatedMentors =
    useMemo(() => {
      const start =
        (safePage - 1) *
        pageSize;

      return filteredMentors.slice(
        start,
        start + pageSize,
      );
    }, [
      filteredMentors,
      pageSize,
      safePage,
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
      description="Explore approved mentors and choose someone whose experience fits your goals."
    >
      <div className="find-mentor-page">
        <section className="find-mentor-intro">
          <span className="request-flow-eyebrow">
            FIND A MENTOR
          </span>

          <h2>
            Explore mentors who are
            available to support your
            growth.
          </h2>

          <p>
            Search by name, role or
            expertise. You can also
            filter by area of
            specialisation.
          </p>
        </section>

        <section className="find-mentor-controls">
          <label className="find-mentor-search">
            <Search
              size={17}
              aria-hidden="true"
            />

            <input
              type="search"
              value={
                searchTerm
              }
              placeholder="Search by name, role or expertise"
              aria-label="Search mentors"
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
            />
          </label>

          <label className="find-mentor-filter">
            <Filter
              size={16}
              aria-hidden="true"
            />

            <select
              value={
                selectedArea
              }
              aria-label="Filter by area of specialisation"
              onChange={(event) =>
                setSelectedArea(
                  event.target.value,
                )
              }
            >
              {specialisations.map(
                (area) => (
                  <option
                    value={
                      area
                    }
                    key={
                      area
                    }
                  >
                    {area}
                  </option>
                ),
              )}
            </select>
          </label>
        </section>

        {loading ? (
          <section className="request-flow-panel">
            <div className="loader" />
            <h3>
              Loading approved mentors
            </h3>
            <p>
              Please wait while we
              prepare the directory.
            </p>
          </section>
        ) : error ? (
          <section className="request-flow-panel">
            <h3>
              We could not load mentors
            </h3>

            <p>{error}</p>

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
          </section>
        ) : filteredMentors.length ===
          0 ? (
          <section className="request-flow-panel">
            <h3>
              No matching mentor found
            </h3>

            <p>
              Try another search or
              choose a different area
              of specialisation.
            </p>
          </section>
        ) : (
          <>
            <div className="find-mentor-results-heading">
              <span>
                {filteredMentors.length}{" "}
                {filteredMentors.length ===
                1
                  ? "mentor"
                  : "mentors"}{" "}
                found
              </span>

              {!mobileView && (
                <small>
                  Up to 16 mentors are
                  shown on each page.
                </small>
              )}
            </div>

            <section className="find-mentor-grid">
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

            <div className="find-mentor-pagination">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (
                      page,
                    ) =>
                      Math.max(
                        1,
                        page - 1,
                      ),
                  )
                }
                disabled={
                  safePage === 1
                }
              >
                <ChevronLeft
                  size={17}
                />
                Previous
              </button>

              <span>
                {mobileView
                  ? `${safePage} of ${totalPages}`
                  : `Page ${safePage} of ${totalPages}`}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (
                      page,
                    ) =>
                      Math.min(
                        totalPages,
                        page + 1,
                      ),
                  )
                }
                disabled={
                  safePage ===
                  totalPages
                }
              >
                Next
                <ChevronRight
                  size={17}
                />
              </button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default FindMentor;
