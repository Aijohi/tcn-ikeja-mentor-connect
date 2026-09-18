import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Star,
  Users,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Link,
} from "react-router-dom";

import {
  supabase,
} from "../lib/supabase";

import "./PublicMentorShowcase.css";

const MENTOR_FETCH_LIMIT = 500;

function normaliseMentor(row) {
  return {
    id: row.mentor_id,
    name:
      row.full_name ||
      "Approved mentor",
    photo:
      row.profile_photo_url ||
      "",
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
      row.expertise ??
      [],
    years:
      row.years_of_experience ??
      null,
    spaces:
      Math.max(
        Number(
          row.available_spaces ??
            0,
        ),
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
      Math.max(
        Number(
          row.review_count ??
            0,
        ),
        0,
      ),
  };
}

function getAreas(mentor) {
  return [
    ...mentor.categories,
    ...mentor.expertise,
  ]
    .filter(Boolean)
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
    );
}

function getSpecialisations(
  mentors,
) {
  const values =
    new Set();

  mentors.forEach(
    (mentor) => {
      getAreas(
        mentor,
      ).forEach(
        (value) => {
          const cleanValue =
            String(
              value || "",
            ).trim();

          if (cleanValue) {
            values.add(
              cleanValue,
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
        first.localeCompare(
          second,
        ),
    ),
  ];
}

function PublicMentorShowcasePortal() {
  const [
    portalTarget,
    setPortalTarget,
  ] = useState(null);

  const [
    mentors,
    setMentors,
  ] = useState([]);

  const [
    selectedArea,
    setSelectedArea,
  ] = useState(
    "All areas",
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mentorPage,
    setMentorPage,
  ] = useState(1);

  const [
    mentorPageSize,
    setMentorPageSize,
  ] = useState(8);

  const [
    mentorSlideIndex,
    setMentorSlideIndex,
  ] = useState(0);

  const viewportRef =
    useRef(null);

  useEffect(() => {
    let frameId;

    function findTarget() {
      const target =
        document.getElementById(
          "mentors",
        );

      if (!target) {
        frameId =
          window.requestAnimationFrame(
            findTarget,
          );

        return;
      }

      target.classList.add(
        "hmc-mentor-showcase-host",
      );

      setPortalTarget(
        target,
      );
    }

    findTarget();

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(
          frameId,
        );
      }

      document
        .getElementById(
          "mentors",
        )
        ?.classList.remove(
          "hmc-mentor-showcase-host",
        );
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadMentors() {
      setLoading(true);
      setError("");

      const {
        data,
        error:
          mentorError,
      } = await supabase.rpc(
        "get_public_mentor_preview",
        {
          p_limit:
            MENTOR_FETCH_LIMIT,
        },
      );

      if (!mounted) {
        return;
      }

      if (mentorError) {
        console.error(
          "Unable to load public mentors:",
          mentorError.message,
        );

        setError(
          "We could not load available mentors right now.",
        );

        setMentors([]);
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
              mentor.spaces >
              0,
          ),
      );

      setLoading(false);
    }

    loadMentors();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function updatePageSize() {
      const width =
        window.innerWidth;

      if (width <= 1000) {
        setMentorPageSize(4);
        return;
      }

      setMentorPageSize(8);
    }

    updatePageSize();

    window.addEventListener(
      "resize",
      updatePageSize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        updatePageSize,
      );
    };
  }, []);

  const specialisations =
    useMemo(
      () =>
        getSpecialisations(
          mentors,
        ),
      [mentors],
    );

  const filteredMentors =
    useMemo(() => {
      if (
        selectedArea ===
        "All areas"
      ) {
        return mentors;
      }

      return mentors.filter(
        (mentor) =>
          getAreas(
            mentor,
          ).includes(
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
        filteredMentors.length /
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

      return filteredMentors.slice(
        startIndex,
        startIndex +
          mentorPageSize,
      );
    }, [
      filteredMentors,
      mentorPageSize,
      safeMentorPage,
    ]);

  const paginationPages =
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
    setMentorPage(1);
    setMentorSlideIndex(0);
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
    setMentorSlideIndex(0);

    viewportRef.current?.scrollTo({
      left: 0,
      behavior: "auto",
    });
  }, [
    safeMentorPage,
    selectedArea,
  ]);

  function handleMentorScroll() {
    if (
      window.innerWidth >
      680
    ) {
      return;
    }

    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const cards =
      Array.from(
        viewport.querySelectorAll(
          ".mentor-showcase-redesign__card",
        ),
      );

    if (!cards.length) {
      return;
    }

    let closestIndex = 0;
    let closestDistance =
      Number.POSITIVE_INFINITY;

    cards.forEach(
      (
        card,
        index,
      ) => {
        const distance =
          Math.abs(
            card.offsetLeft -
              viewport.scrollLeft,
          );

        if (
          distance <
          closestDistance
        ) {
          closestDistance =
            distance;

          closestIndex =
            index;
        }
      },
    );

    setMentorSlideIndex(
      closestIndex,
    );
  }

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <section className="mentor-showcase-redesign">
      <div className="mentor-showcase-redesign__shell">
        <div className="mentor-showcase-redesign__heading">
          <span>
            FIND A MENTOR
          </span>

          <h2>
            Meet some of our approved
            mentors.
          </h2>

          <p>
            Discover approved TCN Ikeja
            mentors who are currently
            accepting mentorship requests
            and have space for a new mentee.
          </p>
        </div>

        {specialisations.length >
          1 && (
          <div className="mentor-showcase-redesign__filters">
            {specialisations.map(
              (area) => (
                <button
                  type="button"
                  key={area}
                  aria-pressed={
                    area ===
                    selectedArea
                  }
                  className={
                    area ===
                    selectedArea
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
        )}

        {loading ? (
          <div className="mentor-showcase-redesign__state">
            <div className="loader" />

            <p>
              Loading available mentors...
            </p>
          </div>
        ) : error ? (
          <div className="mentor-showcase-redesign__state">
            <p>
              {error}
            </p>
          </div>
        ) : filteredMentors.length ===
          0 ? (
          <div className="mentor-showcase-redesign__state">
            <p>
              No mentor is currently
              available in this area.
            </p>
          </div>
        ) : (
          <>
            <div
              ref={
                viewportRef
              }
              className="mentor-showcase-redesign__viewport"
              onScroll={
                handleMentorScroll
              }
            >
              <div className="mentor-showcase-redesign__track">
                {pagedMentors.map(
                  (mentor) => {
                    const areas =
                      getAreas(
                        mentor,
                      ).slice(
                        0,
                        2,
                      );

                    const safeRating =
                      mentor.rating ===
                      null
                        ? null
                        : Math.min(
                            5,
                            Math.max(
                              0,
                              mentor.rating,
                            ),
                          );

                    const roundedRating =
                      safeRating === null
                        ? 0
                        : Math.round(
                            safeRating,
                          );

                    return (
                      <article
                        className="mentor-showcase-redesign__card"
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
                            className="mentor-showcase-redesign__image"
                          />
                        ) : (
                          <div className="mentor-showcase-redesign__image mentor-showcase-redesign__placeholder">
                            <span>
                              {mentor.name
                                .split(
                                  " ",
                                )
                                .filter(
                                  Boolean,
                                )
                                .slice(
                                  0,
                                  2,
                                )
                                .map(
                                  (
                                    part,
                                  ) =>
                                    part
                                      .charAt(
                                        0,
                                      )
                                      .toUpperCase(),
                                )
                                .join(
                                  "",
                                ) ||
                                "MC"}
                            </span>
                          </div>
                        )}

                        <div className="mentor-showcase-redesign__shade" />

                        <div className="mentor-showcase-redesign__card-content">
                          {areas.length >
                            0 && (
                            <div className="mentor-showcase-redesign__areas">
                              {areas.map(
                                (
                                  area,
                                ) => (
                                  <span
                                    key={
                                      area
                                    }
                                  >
                                    {area}
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

                          <p className="mentor-showcase-redesign__role">
                            {
                              mentor.role
                            }
                            {mentor.organisation
                              ? ` · ${mentor.organisation}`
                              : ""}
                          </p>

                          <div className="mentor-showcase-redesign__rating">
                            <div
                              className="mentor-showcase-redesign__stars"
                              aria-label={
                                safeRating ===
                                null
                                  ? "No ratings yet"
                                  : `${safeRating.toFixed(
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
                                      roundedRating
                                        ? "currentColor"
                                        : "none"
                                    }
                                    aria-hidden="true"
                                  />
                                ),
                              )}
                            </div>

                            <span>
                              {safeRating ===
                              null
                                ? "No ratings yet"
                                : `${safeRating.toFixed(
                                    1,
                                  )}${
                                    mentor.reviewCount >
                                    0
                                      ? ` (${mentor.reviewCount})`
                                      : ""
                                  }`}
                            </span>
                          </div>

                          <div className="mentor-showcase-redesign__meta">
                            <span>
                              <BriefcaseBusiness
                                size={14}
                                aria-hidden="true"
                              />

                              {mentor.years ===
                              null
                                ? "Experience not listed"
                                : `${mentor.years} ${
                                    mentor.years ===
                                    1
                                      ? "year"
                                      : "years"
                                  } experience`}
                            </span>

                            <span>
                              <Users
                                size={14}
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
                            className="mentor-showcase-redesign__cta"
                          >
                            <span>
                              View mentor
                            </span>

                            <ArrowRight
                              size={15}
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

            {pagedMentors.length >
              1 && (
              <div
                className="mentor-showcase-redesign__mobile-count"
                aria-live="polite"
              >
                {mentorSlideIndex + 1}
                {" / "}
                {pagedMentors.length}
              </div>
            )}

            <nav
              className="mentor-showcase-redesign__pagination"
              aria-label="Mentor pages"
            >
              <button
                type="button"
                className="mentor-showcase-redesign__page-arrow"
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
                  aria-hidden="true"
                />

                <span>
                  Previous
                </span>
              </button>

              <div className="mentor-showcase-redesign__page-numbers">
                {paginationPages.map(
                  (
                    page,
                    index,
                  ) => {
                    const previousPage =
                      paginationPages[
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
                        className="mentor-showcase-redesign__page-item"
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
                className="mentor-showcase-redesign__page-arrow"
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
                  aria-hidden="true"
                />
              </button>
            </nav>

            <div className="mentor-showcase-redesign__footer-cta">
              <Link
                to="/register"
                className="mentor-showcase-redesign__find-button"
              >
                <span>
                  Find a mentor
                </span>

                <ArrowRight
                  size={17}
                  aria-hidden="true"
                />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>,
    portalTarget,
  );
}

export default PublicMentorShowcasePortal;
