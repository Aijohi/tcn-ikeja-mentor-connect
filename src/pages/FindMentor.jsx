import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowUpDown,
  BadgeCheck,
  Bookmark,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Star,
  UsersRound,
  Video,
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

const DESKTOP_PAGE_SIZE = 14;
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
    Array.isArray(
      row.meeting_formats,
    )
      ? row.meeting_formats
      : [];

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
      Array.isArray(
        row.mentorship_categories,
      )
        ? row.mentorship_categories
        : [],
    expertise:
      Array.isArray(
        row.expertise,
      )
        ? row.expertise
        : [],
    languages:
      Array.isArray(
        row.languages,
      )
        ? row.languages
        : [],
    meetingFormats,
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
      null ||
      row.average_rating ===
      undefined
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

function uniqueValues(values) {
  const seen =
    new Set();

  return values.filter(
    (value) => {
      const key =
        String(
          value || "",
        )
          .trim()
          .toLowerCase();

      if (
        !key ||
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);
      return true;
    },
  );
}


function DropdownField({
  icon: Icon,
  value,
  options,
  onChange,
  ariaLabel,
  formatOption = (option) => option,
  compact = false,
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const containerRef =
    useRef(null);

  useEffect(() => {
    function handlePointerDown(
      event,
    ) {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target,
        )
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(
      event,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  function selectOption(
    option,
  ) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div
      ref={
        containerRef
      }
      className={`find-mentor-dropdown${
        compact
          ? " find-mentor-dropdown--compact"
          : ""
      }${
        open
          ? " is-open"
          : ""
      }`}
    >
      <button
        type="button"
        className="find-mentor-dropdown-trigger"
        aria-label={
          ariaLabel
        }
        aria-haspopup="listbox"
        aria-expanded={
          open
        }
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
      >
        {Icon && (
          <Icon
            size={
              compact
                ? 16
                : 17
            }
            aria-hidden="true"
          />
        )}

        <span>
          {formatOption(
            value,
          )}
        </span>

        <ChevronDown
          className="find-mentor-dropdown-chevron"
          size={
            compact
              ? 15
              : 16
          }
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="find-mentor-dropdown-menu"
          role="listbox"
          aria-label={
            ariaLabel
          }
        >
          {options.map(
            (option) => {
              const selected =
                option ===
                value;

              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={
                    selected
                  }
                  className={`find-mentor-dropdown-option${
                    selected
                      ? " is-selected"
                      : ""
                  }`}
                  key={
                    option
                  }
                  onClick={() =>
                    selectOption(
                      option,
                    )
                  }
                >
                  <span>
                    {formatOption(
                      option,
                    )}
                  </span>

                  {selected && (
                    <Check
                      size={16}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span
      className="find-mentor-verified"
      title="TCN Ikeja approved mentor"
      aria-label="TCN Ikeja approved mentor"
    >
      <BadgeCheck
        size={12}
        aria-hidden="true"
      />
    </span>
  );
}

function MentorCard({
  mentor,
  bookmarked,
  onToggleBookmark,
  onView,
}) {
  const tags =
    uniqueValues([
      ...mentor.categories,
      ...mentor.expertise,
    ]).slice(
      0,
      3,
    );

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

        <span className="find-mentor-availability">
          <i aria-hidden="true" />
          Available
        </span>
      </div>

      <div className="find-mentor-card-body">
        <div className="find-mentor-card-heading">
          <h3 className="find-mentor-name-row">
            <span>
              {mentor.name}
            </span>

            <VerifiedBadge />
          </h3>

          <p>
            {mentor.role}
            {mentor.organisation
              ? ` · ${mentor.organisation}`
              : ""}
          </p>
        </div>

        <div className="find-mentor-rating">
          <div
            className="find-mentor-stars"
            aria-label={
              mentor.rating !== null
                ? `${mentor.rating.toFixed(1)} out of 5 stars`
                : "No ratings yet"
            }
          >
            {Array.from(
              {
                length: 5,
              },
              (_, index) => (
                <Star
                  key={
                    index
                  }
                  size={15}
                  strokeWidth={1.8}
                  fill={
                    mentor.rating !==
                      null &&
                    index <
                      Math.round(
                        mentor.rating,
                      )
                      ? "currentColor"
                      : "none"
                  }
                  aria-hidden="true"
                />
              ),
            )}
          </div>

          <span>
            {mentor.reviewCount >
            0
              ? `${mentor.rating?.toFixed(1) ?? ""} · ${mentor.reviewCount} ${
                  mentor.reviewCount ===
                  1
                    ? "review"
                    : "reviews"
                }`
              : "No ratings yet"}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="find-mentor-tags">
            {tags.map(
              (item) => (
                <span
                  key={
                    item
                  }
                >
                  {item}
                </span>
              ),
            )}
          </div>
        )}

        <div className="find-mentor-card-divider" />

        <div className="find-mentor-card-meta">
          <div>
            <BriefcaseBusiness
              size={18}
              aria-hidden="true"
            />

            <span>
              <strong>
                {mentor.yearsOfExperience ===
                null
                  ? "Not specified"
                  : `${mentor.yearsOfExperience} ${
                      mentor.yearsOfExperience ===
                      1
                        ? "year"
                        : "years"
                    }`}
              </strong>

              <small>
                experience
              </small>
            </span>
          </div>

          <div>
            <UsersRound
              size={18}
              aria-hidden="true"
            />

            <span>
              <strong>
                {mentor.spaces}{" "}
                {mentor.spaces ===
                1
                  ? "space"
                  : "spaces"}
              </strong>

              <small>
                available
              </small>
            </span>
          </div>
        </div>

        <div className="find-mentor-card-actions">
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
            <ChevronRight
              size={16}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            className={`find-mentor-bookmark-button ${
              bookmarked
                ? "is-bookmarked"
                : ""
            }`}
            aria-label={
              bookmarked
                ? `Remove ${mentor.name} from saved mentors`
                : `Save ${mentor.name}`
            }
            aria-pressed={
              bookmarked
            }
            onClick={() =>
              onToggleBookmark(
                mentor.id,
              )
            }
          >
            <Bookmark
              size={18}
              fill={
                bookmarked
                  ? "currentColor"
                  : "none"
              }
              aria-hidden="true"
            />
          </button>
        </div>
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
    selectedMeetingFormat,
    setSelectedMeetingFormat,
  ] = useState(
    "All meeting formats",
  );

  const [
    sortBy,
    setSortBy,
  ] = useState(
    "Most relevant",
  );

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

  const [
    bookmarkedMentors,
    setBookmarkedMentors,
  ] = useState(
    () =>
      new Set(),
  );

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
        uniqueValues(
          mentors.flatMap(
            (mentor) => [
              ...mentor.categories,
              ...mentor.expertise,
            ],
          ),
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
        );

      return [
        "All areas",
        ...values,
      ];
    }, [mentors]);

  const meetingFormats =
    useMemo(() => {
      const values =
        uniqueValues(
          mentors.flatMap(
            (mentor) =>
              mentor.meetingFormats,
          ),
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
        );

      return [
        "All meeting formats",
        ...values,
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
    if (
      !meetingFormats.includes(
        selectedMeetingFormat,
      )
    ) {
      setSelectedMeetingFormat(
        "All meeting formats",
      );
    }
  }, [
    meetingFormats,
    selectedMeetingFormat,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedArea,
    selectedMeetingFormat,
    sortBy,
    mobileView,
  ]);

  const filteredMentors =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      const matches =
        mentors.filter(
          (mentor) => {
            const mentorAreas = [
              ...mentor.categories,
              ...mentor.expertise,
            ];

            const matchesArea =
              selectedArea ===
                "All areas" ||
              mentorAreas.includes(
                selectedArea,
              );

            const matchesMeeting =
              selectedMeetingFormat ===
                "All meeting formats" ||
              mentor.meetingFormats.includes(
                selectedMeetingFormat,
              );

            if (
              !matchesArea ||
              !matchesMeeting
            ) {
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

      return [
        ...matches,
      ].sort(
        (
          first,
          second,
        ) => {
          if (
            sortBy ===
            "Most experienced"
          ) {
            return (
              Number(
                second.yearsOfExperience ??
                  0,
              ) -
              Number(
                first.yearsOfExperience ??
                  0,
              )
            );
          }

          if (
            sortBy ===
            "Most spaces"
          ) {
            return (
              second.spaces -
              first.spaces
            );
          }

          if (
            sortBy ===
            "Name A-Z"
          ) {
            return first.name.localeCompare(
              second.name,
            );
          }

          return 0;
        },
      );
    }, [
      mentors,
      searchTerm,
      selectedArea,
      selectedMeetingFormat,
      sortBy,
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

  const rangeStart =
    filteredMentors.length ===
    0
      ? 0
      : (safePage - 1) *
          pageSize +
        1;

  const rangeEnd =
    Math.min(
      safePage *
        pageSize,
      filteredMentors.length,
    );

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

  function toggleBookmark(
    mentorId,
  ) {
    setBookmarkedMentors(
      (current) => {
        const next =
          new Set(
            current,
          );

        if (
          next.has(
            mentorId,
          )
        ) {
          next.delete(
            mentorId,
          );
        } else {
          next.add(
            mentorId,
          );
        }

        return next;
      },
    );
  }

  return (
    <DashboardLayout
      title="Find a mentor"
      description="Connect with experienced professionals who are ready to support your growth."
    >
      <div className="find-mentor-page">
        <section className="find-mentor-controls">
          <label className="find-mentor-search">
            <Search
              size={19}
              aria-hidden="true"
            />

            <input
              className="find-mentor-native-control"
              type="search"
              value={
                searchTerm
              }
              placeholder="Search by name, role, company or expertise..."
              aria-label="Search mentors"
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
            />
          </label>

          <DropdownField
            icon={
              SlidersHorizontal
            }
            value={
              selectedArea
            }
            options={
              specialisations
            }
            ariaLabel="Filter by area of specialisation"
            onChange={
              setSelectedArea
            }
            formatOption={(
              area,
            ) =>
              area ===
              "All areas"
                ? "All areas of specialisation"
                : area
            }
          />

          <DropdownField
            icon={
              Video
            }
            value={
              selectedMeetingFormat
            }
            options={
              meetingFormats
            }
            ariaLabel="Filter by meeting format"
            onChange={
              setSelectedMeetingFormat
            }
            formatOption={(
              format,
            ) =>
              format ===
              "All meeting formats"
                ? "All meeting formats"
                : formatLabel(
                    format,
                  )
            }
          />
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

            <p>
              {error}
            </p>

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
              choose different filters.
            </p>
          </section>
        ) : (
          <>
            <div className="find-mentor-toolbar">
              <span className="find-mentor-results-count">
                {filteredMentors.length}{" "}
                {filteredMentors.length ===
                1
                  ? "mentor"
                  : "mentors"}{" "}
                found
              </span>

              <div className="find-mentor-sort-group">
                <span className="find-mentor-sort-label">
                  Sort by
                </span>

                <DropdownField
                  icon={
                    ArrowUpDown
                  }
                  value={
                    sortBy
                  }
                  options={[
                    "Most relevant",
                    "Most experienced",
                    "Most spaces",
                    "Name A-Z",
                  ]}
                  ariaLabel="Sort mentors"
                  onChange={
                    setSortBy
                  }
                  compact
                />
              </div>
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
                    bookmarked={
                      bookmarkedMentors.has(
                        mentor.id,
                      )
                    }
                    onToggleBookmark={
                      toggleBookmark
                    }
                    onView={
                      viewMentor
                    }
                  />
                ),
              )}
            </section>

            <div className="find-mentor-footer">
              <span>
                Showing{" "}
                {rangeStart}–{rangeEnd}{" "}
                of{" "}
                {filteredMentors.length}{" "}
                {filteredMentors.length ===
                1
                  ? "mentor"
                  : "mentors"}
              </span>

              <div className="find-mentor-pagination">
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() =>
                    setCurrentPage(
                      (
                        page,
                      ) =>
                        Math.max(
                          1,
                          page -
                            1,
                        ),
                    )
                  }
                  disabled={
                    safePage ===
                    1
                  }
                >
                  <ChevronLeft
                    size={17}
                    aria-hidden="true"
                  />
                </button>

                <strong>
                  {safePage}
                </strong>

                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() =>
                    setCurrentPage(
                      (
                        page,
                      ) =>
                        Math.min(
                          totalPages,
                          page +
                            1,
                        ),
                    )
                  }
                  disabled={
                    safePage ===
                    totalPages
                  }
                >
                  <ChevronRight
                    size={17}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default FindMentor;
