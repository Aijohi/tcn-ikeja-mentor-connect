import { useEffect, useMemo, useState } from "react";

import {
  BriefcaseBusiness,
  Languages,
  Search,
  UserRoundSearch,
  Users,
  Video,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabase";

function FindMentor() {
  const navigate = useNavigate();

  const [mentors, setMentors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMentors() {
      setLoading(true);
      setError("");

      const { data, error: mentorError } = await supabase
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
        .eq("approval_status", "approved")
        .eq("accepting_requests", true)
        .order("created_at", {
          ascending: false,
        });

      if (!isMounted) {
        return;
      }

      if (mentorError) {
        console.error(
          "Unable to load mentors:",
          mentorError.message,
        );

        setError(
          "We could not load mentors right now. Please try again.",
        );

        setMentors([]);
        setLoading(false);
        return;
      }

      setMentors(data ?? []);
      setLoading(false);
    }

    loadMentors();

    return () => {
      isMounted = false;
    };
  }, []);

  const cleanedSearchTerm =
    searchTerm.trim().toLowerCase();

  const filteredMentors = useMemo(() => {
    if (!cleanedSearchTerm) {
      return mentors;
    }

    return mentors.filter((mentor) => {
      const searchableValues = [
        mentor.profiles?.full_name,
        mentor.job_title,
        mentor.organisation,
        mentor.biography,
        ...(mentor.expertise ?? []),
        ...(mentor.mentorship_categories ?? []),
        ...(mentor.languages ?? []),
        ...(mentor.meeting_formats ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableValues.includes(
        cleanedSearchTerm,
      );
    });
  }, [mentors, cleanedSearchTerm]);

  const hasSearch =
    searchTerm.trim().length > 0;

  function clearSearch() {
    setSearchTerm("");
  }

  if (loading) {
    return (
      <DashboardLayout
        title="Find a mentor"
        description="Explore approved mentors who can support your growth."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>Loading mentors</h2>

          <p>
            Please wait while we prepare the mentor directory.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        title="Find a mentor"
        description="Explore approved mentors who can support your growth."
      >
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <UserRoundSearch size={30} />
          </span>

          <h2>Unable to load mentors</h2>

          <p>{error}</p>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              window.location.reload()
            }
          >
            Try again
          </button>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Find a mentor"
      description="Explore approved mentors who can support your growth."
    >
      <section className="dashboard-section-toolbar">
        <label className="dashboard-search-field">
          <Search size={19} />

          <input
            type="text"
            value={searchTerm}
            placeholder="Search by name, expertise or keyword"
            aria-label="Search mentors"
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
          />

          {hasSearch && (
            <button
              type="button"
              aria-label="Clear mentor search"
              className="mentor-search-clear"
              onClick={clearSearch}
            >
              <X size={17} />
            </button>
          )}
        </label>

        {hasSearch && (
          <p
            className="mentor-result-count"
            aria-live="polite"
          >
            {filteredMentors.length}{" "}
            {filteredMentors.length === 1
              ? "mentor"
              : "mentors"}{" "}
            found
          </p>
        )}
      </section>

      {hasSearch &&
      filteredMentors.length === 0 ? (
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <Search size={30} />
          </span>

          <h2>
            No mentors found for "
            {searchTerm.trim()}"
          </h2>

          <p>
            Try another mentor name, area of expertise or keyword.
          </p>

          <button
            type="button"
            className="secondary-button"
            onClick={clearSearch}
          >
            Clear search
          </button>
        </section>
      ) : mentors.length === 0 ? (
        <section className="dashboard-empty-state">
          <span className="empty-state-icon">
            <UserRoundSearch size={30} />
          </span>

          <h2>No mentors available yet</h2>

          <p>
            There are currently no approved mentors accepting
            mentorship requests. Please check again later.
          </p>
        </section>
      ) : (
        <section className="mentor-directory-grid">
          {filteredMentors.map((mentor) => (
            <MentorCard
              key={mentor.mentor_id}
              mentor={mentor}
              onViewProfile={() =>
                navigate(
                  `/mentee/mentors/${mentor.mentor_id}`,
                )
              }
            />
          ))}
        </section>
      )}
    </DashboardLayout>
  );
}

function MentorCard({
  mentor,
  onViewProfile,
}) {
  const fullName =
    mentor.profiles?.full_name ||
    "Approved mentor";

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) =>
      name.charAt(0).toUpperCase(),
    )
    .join("");

  const maximumActiveMentees =
    mentor.maximum_active_mentees ?? 0;

  const currentActiveMentees =
    mentor.current_active_mentees ?? 0;

  const availableSpaces = Math.max(
    maximumActiveMentees -
      currentActiveMentees,
    0,
  );

  return (
    <article className="mentor-directory-card">
      <div className="mentor-card-header">
        {mentor.profiles?.profile_photo_url ? (
          <img
            src={
              mentor.profiles.profile_photo_url
            }
            alt=""
            className="mentor-card-avatar"
          />
        ) : (
          <span className="mentor-card-avatar mentor-card-initials">
            {initials || "MC"}
          </span>
        )}

        <div>
          <span className="mentor-approved-label">
            Approved mentor
          </span>

          <h2>{fullName}</h2>

          <p>
            {mentor.job_title || "Mentor"}

            {mentor.organisation
              ? ` at ${mentor.organisation}`
              : ""}
          </p>
        </div>
      </div>

      <p className="mentor-card-biography">
        {mentor.biography ||
          "This mentor has not added a biography yet."}
      </p>

      {mentor.mentorship_categories?.length >
        0 && (
        <div className="mentor-category-list">
          {mentor.mentorship_categories
            .slice(0, 4)
            .map((category) => (
              <span key={category}>
                {category}
              </span>
            ))}
        </div>
      )}

      <div className="mentor-card-details">
        <span>
          <BriefcaseBusiness size={16} />

          {mentor.years_of_experience
            ? `${mentor.years_of_experience} years experience`
            : "Experience not specified"}
        </span>

        <span>
          <Languages size={16} />

          {mentor.languages?.length
            ? mentor.languages.join(", ")
            : "Languages not specified"}
        </span>

        <span>
          <Video size={16} />

          {mentor.meeting_formats?.length
            ? mentor.meeting_formats.join(", ")
            : "Meeting format not specified"}
        </span>

        <span>
          <Users size={16} />

          {availableSpaces}{" "}
          {availableSpaces === 1
            ? "space"
            : "spaces"}{" "}
          available
        </span>
      </div>

      <button
        type="button"
        className="primary-button full-button"
        onClick={onViewProfile}
      >
        View mentor profile
      </button>
    </article>
  );
}

export default FindMentor;