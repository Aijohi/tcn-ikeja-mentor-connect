import { useEffect, useState } from "react";

import {
  BookOpenText,
  CheckCircle2,
  HeartHandshake,
  Target,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import "./MenteeProfile.css";

const mentorshipAreas = [
  "Career development",
  "Business and entrepreneurship",
  "Leadership",
  "Faith and spiritual growth",
  "Personal development",
  "Technology",
];

const initialForm = {
  biography: "",
  mentorshipAreas: [],
  developmentGoals: "",
  hopesToGain: "",
  previousMentoringHistory: "",
  preferredAvailability: "",
  conductAgreed: false,
  safetyAgreed: false,
};

function MenteeProfile() {
  const { user } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const { data, error: profileError } = await supabase
        .from("mentee_profiles")
        .select(`
          biography,
          mentorship_areas,
          development_goals,
          hopes_to_gain,
          previous_mentoring_history,
          preferred_availability,
          conduct_agreed,
          safety_agreed
        `)
        .eq("mentee_id", user.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (profileError) {
        console.error(
          "Unable to load mentee profile:",
          profileError.message,
        );

        setError(
          "We could not load your mentee profile. Please try again.",
        );

        setLoading(false);
        return;
      }

      if (data) {
        setForm({
          biography: data.biography ?? "",
          mentorshipAreas: data.mentorship_areas ?? [],
          developmentGoals: data.development_goals ?? "",
          hopesToGain: data.hopes_to_gain ?? "",
          previousMentoringHistory:
            data.previous_mentoring_history ?? "",
          preferredAvailability:
            data.preferred_availability ?? "",
          conductAgreed: data.conduct_agreed ?? false,
          safetyAgreed: data.safety_agreed ?? false,
        });
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  function updateForm(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  }

  function toggleMentorshipArea(area) {
    setForm((current) => {
      const alreadySelected =
        current.mentorshipAreas.includes(area);

      return {
        ...current,
        mentorshipAreas: alreadySelected
          ? current.mentorshipAreas.filter(
              (item) => item !== area,
            )
          : [...current.mentorshipAreas, area],
      };
    });

    setError("");
    setSuccess("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.biography.trim()) {
      setError("Please add a short biography.");
      return;
    }

    if (form.mentorshipAreas.length === 0) {
      setError(
        "Please select at least one area where you need mentorship.",
      );
      return;
    }

    if (!form.developmentGoals.trim()) {
      setError("Please describe your development goals.");
      return;
    }

    if (!form.hopesToGain.trim()) {
      setError(
        "Please explain what you hope to gain from mentorship.",
      );
      return;
    }

    if (!form.conductAgreed || !form.safetyAgreed) {
      setError(
        "Please agree to the mentee conduct and safety guidelines.",
      );
      return;
    }

    setSubmitting(true);

    const { error: saveError } = await supabase.rpc(
      "save_mentee_profile",
      {
        p_biography: form.biography.trim(),
        p_mentorship_areas: form.mentorshipAreas,
        p_development_goals:
          form.developmentGoals.trim(),
        p_hopes_to_gain: form.hopesToGain.trim(),
        p_previous_mentoring_history:
          form.previousMentoringHistory.trim(),
        p_preferred_availability:
          form.preferredAvailability.trim(),
        p_conduct_agreed: form.conductAgreed,
        p_safety_agreed: form.safetyAgreed,
      },
    );

    setSubmitting(false);

    if (saveError) {
      console.error(
        "Unable to save mentee profile:",
        saveError.message,
      );

      setError(
        saveError.message ||
          "We could not save your profile. Please try again.",
      );

      return;
    }

    setSuccess("Your mentee profile has been saved.");
  }

  if (loading) {
    return (
      <DashboardLayout
        title="My profile"
        description="Tell mentors a little about you and the support you are looking for."
      >
        <div className="mentee-profile-page">
          <section className="dashboard-empty-state">
            <div className="loader" />

            <h2>Loading your profile</h2>

            <p>
              Please wait while we prepare your mentee profile.
            </p>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My profile"
      description="Tell mentors a little about you and the support you are looking for."
    >
      <div className="mentee-profile-page">
        <form
          className="mentee-profile-form"
          onSubmit={handleSubmit}
        >
          <section className="mentee-profile-intro">
            <div>
              <span className="eyebrow">
                MENTEE PROFILE
              </span>

              <h2>
                Help a mentor understand how to support you.
              </h2>

              <p>
                Keep your profile focused on your goals and the
                guidance you need. You do not need to share
                unnecessary private information.
              </p>
            </div>
          </section>

          {error && (
            <p className="form-error">
              {error}
            </p>
          )}

          {success && (
            <p className="mentee-profile-success">
              <CheckCircle2 size={17} />
              {success}
            </p>
          )}

          <section className="mentee-profile-section">
            <div className="mentee-profile-section-heading">
              <BookOpenText size={19} />

              <div>
                <h3>About you</h3>
                <p>
                  Give potential mentors a short introduction.
                </p>
              </div>
            </div>

            <label className="mentee-profile-field">
              Short biography
              <textarea
                name="biography"
                value={form.biography}
                onChange={updateForm}
                placeholder="Share a little about your background, current stage and what is important to you."
                disabled={submitting}
                required
              />
            </label>
          </section>

          <section className="mentee-profile-section">
            <div className="mentee-profile-section-heading">
              <Target size={19} />

              <div>
                <h3>Your mentorship goals</h3>
                <p>
                  Tell mentors where you would like guidance and
                  what progress would look like for you.
                </p>
              </div>
            </div>

            <fieldset className="mentee-profile-options">
              <legend>
                Areas where you need mentorship
              </legend>

              <div className="mentee-profile-checkbox-grid">
                {mentorshipAreas.map((area) => (
                  <label key={area}>
                    <input
                      type="checkbox"
                      checked={form.mentorshipAreas.includes(
                        area,
                      )}
                      onChange={() =>
                        toggleMentorshipArea(area)
                      }
                      disabled={submitting}
                    />

                    <span>{area}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mentee-profile-field">
              Development goals
              <textarea
                name="developmentGoals"
                value={form.developmentGoals}
                onChange={updateForm}
                placeholder="What are you currently trying to improve, achieve or understand?"
                disabled={submitting}
                required
              />
            </label>

            <label className="mentee-profile-field">
              What do you hope to gain from mentorship?
              <textarea
                name="hopesToGain"
                value={form.hopesToGain}
                onChange={updateForm}
                placeholder="For example, clearer direction, accountability, practical guidance or help building confidence."
                disabled={submitting}
                required
              />
            </label>
          </section>

          <section className="mentee-profile-section">
            <div className="mentee-profile-section-heading">
              <HeartHandshake size={19} />

              <div>
                <h3>Availability and mentoring history</h3>
                <p>
                  These details are optional, but they can help
                  with matching and planning.
                </p>
              </div>
            </div>

            <label className="mentee-profile-field">
              Preferred availability
              <textarea
                name="preferredAvailability"
                value={form.preferredAvailability}
                onChange={updateForm}
                placeholder="For example, weekday evenings or Saturday mornings."
                disabled={submitting}
              />
            </label>

            <label className="mentee-profile-field">
              Previous mentoring history{" "}
              <small>(optional)</small>
              <textarea
                name="previousMentoringHistory"
                value={form.previousMentoringHistory}
                onChange={updateForm}
                placeholder="If you have had previous mentoring on Mentor Connect, you can briefly describe it here."
                disabled={submitting}
              />
            </label>
          </section>

          <section className="mentee-profile-section">
            <div className="mentee-profile-section-heading">
              <CheckCircle2 size={19} />

              <div>
                <h3>Conduct and safety</h3>
                <p>
                  Mentorship works best when both people respect
                  the platform's boundaries and safety guidance.
                </p>
              </div>
            </div>

            <div className="mentee-profile-agreements">
              <label>
                <input
                  type="checkbox"
                  name="conductAgreed"
                  checked={form.conductAgreed}
                  onChange={updateForm}
                  disabled={submitting}
                />

                <span>
                  I agree to follow the mentee code of conduct
                  and participate respectfully.
                </span>
              </label>

              <label>
                <input
                  type="checkbox"
                  name="safetyAgreed"
                  checked={form.safetyAgreed}
                  onChange={updateForm}
                  disabled={submitting}
                />

                <span>
                  I agree to follow Mentor Connect safety
                  guidelines and keep sensitive or financial
                  requests outside the mentoring relationship.
                </span>
              </label>
            </div>
          </section>

          <div className="mentee-profile-actions">
            <button
              type="submit"
              className="primary-button mentee-profile-button mentee-profile-button--medium"
              disabled={submitting}
            >
              {submitting
                ? "Saving profile..."
                : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default MenteeProfile;
