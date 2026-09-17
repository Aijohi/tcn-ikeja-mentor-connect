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

        setMentors(
          [],
        );

        setLoading(
          false,
        );

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

  useEffect(() => {
    if (
      viewportRef.current
    ) {
      viewportRef.current.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    }
  }, [
    selectedArea,
  ]);

  function move(
    direction,
  ) {
    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const distance =
      Math.max(
        280,
        viewport.clientWidth *
          0.82,
      );

    viewport.scrollBy({
      left:
        direction *
        distance,
      behavior: "smooth",
    });
  }

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <section className="mentor-showcase-redesign">
      <div className="mentor-showcase-redesign__shell">
        <div className="mentor-showcase-redesign__top">
          <div className="mentor-showcase-redesign__heading">
            <span>
              APPROVED MENTORS
            </span>

            <h2>
              Meet mentors ready to
              support your growth.
            </h2>
          </div>

          <div className="mentor-showcase-redesign__intro">
            <p>
              Explore experienced
              mentors across different
              areas. Create an account
              to view a full profile
              and request mentorship.
            </p>

            <div className="mentor-showcase-redesign__arrows">
              <button
                type="button"
                aria-label="Previous mentors"
                onClick={() =>
                  move(-1)
                }
              >
                <ArrowLeft
                  size={18}
                />
              </button>

              <button
                type="button"
                aria-label="Next mentors"
                onClick={() =>
                  move(1)
                }
              >
                <ArrowRight
                  size={18}
                />
              </button>
            </div>
          </div>
        </div>

        {specialisations.length >
          1 && (
          <div className="mentor-showcase-redesign__filters">
            {specialisations.map(
              (area) => (
                <button
                  type="button"
                  key={area}
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
              Loading approved mentors...
            </p>
          </div>
        ) : error ? (
          <div className="mentor-showcase-redesign__state">
            <p>{error}</p>
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
          <div
            ref={
              viewportRef
            }
            className="mentor-showcase-redesign__viewport"
          >
            <div className="mentor-showcase-redesign__track">
              {filteredMentors.map(
                (mentor) => {
                  const areas =
                    getAreas(
                      mentor,
                    ).slice(
                      0,
                      2,
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
                        <span className="mentor-showcase-redesign__approved">
                          TCN IKEJA APPROVED
                        </span>

                        <div className="mentor-showcase-redesign__areas">
                          {areas.map(
                            (area) => (
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
                          {mentor.rating === null ? (
                            <>
                              <span
                                className="mentor-showcase-redesign__empty-stars"
                                aria-label="No ratings yet"
                              >
                                {Array.from({
                                  length: 5,
                                }).map((_, index) => (
                                  <Star
                                    key={index}
                                    size={13}
                                    fill="none"
                                    strokeWidth={1.7}
                                  />
                                ))}
                              </span>

                              <span>
                                No ratings yet
                              </span>
                            </>
                          ) : (
                            <>
                              <Star
                                size={14}
                                fill="currentColor"
                              />

                              <strong>
                                {mentor.rating.toFixed(
                                  1,
                                )}
                              </strong>

                              <span>
                                {mentor.reviewCount >
                                0
                                  ? `(${mentor.reviewCount})`
                                  : ""}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="mentor-showcase-redesign__meta">
                          <span>
                            <BriefcaseBusiness
                              size={14}
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
                          View mentor
                          <ArrowRight
                            size={15}
                          />
                        </Link>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </div>
        )}

        {filteredMentors.length >
          1 && (
          <div className="mentor-showcase-redesign__mobile-hint">
            Swipe or use the arrows to
            see more mentors.
          </div>
        )}
      </div>
    </section>,
    portalTarget,
  );
}

export default PublicMentorShowcasePortal;
