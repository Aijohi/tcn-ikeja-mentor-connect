import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookOpenText,
  CheckCircle2,
  Edit3,
  ShieldCheck,
  Target,
  X,
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

function isProfileComplete(form) {
  return Boolean(
    form.biography.trim() &&
      form.mentorshipAreas.length > 0 &&
      form.developmentGoals.trim() &&
      form.hopesToGain.trim() &&
      form.conductAgreed &&
      form.safetyAgreed,
  );
}

function MenteeProfile() {
  const { user } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(true);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [saveToastOpen, setSaveToastOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setLoadError("");
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

        setLoadError(
          "We could not load your mentee profile. Please try again.",
        );

        setLoading(false);
        return;
      }

      if (data) {
        const nextForm = {
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
        };

        setForm(nextForm);
        setIsEditing(!isProfileComplete(nextForm));
      } else {
        setForm(initialForm);
        setIsEditing(true);
      }

      setLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!guidelinesOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        setGuidelinesOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [guidelinesOpen]);

  const completed = useMemo(
    () => isProfileComplete(form),
    [form],
  );

  function updateForm(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
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
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");

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
        "Please read and agree to the mentee code of conduct and safety guidelines.",
      );
      return;
    }

    setSubmitting(true);

    const { error: saveError } = await supabase.rpc(
      "save_mentee_profile",
      {
        p_biography: form.biography.trim(),
        p_mentorship_areas: form.mentorshipAreas,
        p_development_goals: form.developmentGoals.trim(),
        p_hopes_to_gain: form.hopesToGain.trim(),

        // These fields are no longer shown to mentees, but keeping the
        // stored values avoids removing older data from an existing profile.
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

    setIsEditing(false);
    setSaveToastOpen(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function editProfile() {
    setIsEditing(true);
    setSaveToastOpen(false);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
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
            <p>Please wait while we prepare your mentee profile.</p>
          </section>
        </div>
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout
        title="My profile"
        description="Tell mentors a little about you and the support you are looking for."
      >
        <div className="mentee-profile-page">
          <section className="dashboard-empty-state">
            <BookOpenText size={28} />
            <h2>Unable to load your profile</h2>
            <p>{loadError}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
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
        {!isEditing && completed ? (
          <CompletedProfile
            form={form}
            onEdit={editProfile}
          />
        ) : (
          <form
            className="mentee-profile-form"
            onSubmit={handleSubmit}
          >
            <section className="mentee-profile-intro">
              <div>
                <span className="eyebrow">MENTEE PROFILE</span>
                <h2>Help a mentor understand how to support you.</h2>
                <p>
                  Keep your profile focused on your goals and the guidance
                  you need. You do not need to share unnecessary private
                  information.
                </p>
              </div>
            </section>

            {error && (
              <p className="form-error mentee-profile-error" role="alert">
                {error}
              </p>
            )}

            <section className="mentee-profile-section">
              <div className="mentee-profile-section-heading">
                <BookOpenText size={19} />
                <div>
                  <h3>About you</h3>
                  <p>Give potential mentors a short introduction.</p>
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
                    Tell mentors where you would like guidance and what
                    progress would look like for you.
                  </p>
                </div>
              </div>

              <fieldset className="mentee-profile-options">
                <legend>Areas where you need mentorship</legend>

                <div className="mentee-profile-checkbox-grid">
                  {mentorshipAreas.map((area) => (
                    <label key={area}>
                      <input
                        type="checkbox"
                        checked={form.mentorshipAreas.includes(area)}
                        onChange={() => toggleMentorshipArea(area)}
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
                <ShieldCheck size={19} />
                <div>
                  <h3>Conduct and safety</h3>
                  <p>
                    Please read the guidance before saving your profile.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="mentee-profile-guidelines-link"
                onClick={() => setGuidelinesOpen(true)}
              >
                Read the Mentee Code of Conduct and Safety Guidelines
              </button>

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
                    I have read and agree to follow the Mentee Code of
                    Conduct and participate respectfully.
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
                    I have read and agree to follow the Mentor Connect
                    Safety Guidelines.
                  </span>
                </label>
              </div>
            </section>

            <div className="mentee-profile-actions">
              <button
                type="submit"
                className="primary-button mentee-profile-button"
                disabled={submitting}
              >
                {submitting ? "Saving profile..." : "Save profile"}
              </button>
            </div>
          </form>
        )}
      </div>

      {guidelinesOpen && (
        <MenteeGuidelinesModal
          onClose={() => setGuidelinesOpen(false)}
        />
      )}

      {saveToastOpen && (
        <div
          className="mentee-profile-save-toast"
          role="status"
          aria-live="polite"
        >
          <span className="mentee-profile-save-toast-icon">
            <CheckCircle2 size={20} />
          </span>

          <div>
            <strong>Your mentee profile is complete.</strong>
            <p>Your changes have been saved successfully.</p>
          </div>

          <button
            type="button"
            className="mentee-profile-toast-edit"
            onClick={editProfile}
          >
            Edit profile
          </button>

          <button
            type="button"
            className="mentee-profile-toast-close"
            aria-label="Close confirmation"
            onClick={() => setSaveToastOpen(false)}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}

function CompletedProfile({ form, onEdit }) {
  return (
    <div className="mentee-profile-complete-view">
      <section className="mentee-profile-complete-hero">
        <div className="mentee-profile-complete-icon">
          <CheckCircle2 size={24} />
        </div>

        <div>
          <span className="eyebrow">PROFILE COMPLETE</span>
          <h2>Your mentee profile is ready.</h2>
          <p>
            Mentors can now understand your goals and the support you are
            looking for. You can update these details whenever something
            changes.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button mentee-profile-edit-button"
          onClick={onEdit}
        >
          <Edit3 size={16} />
          Edit profile
        </button>
      </section>

      <section className="mentee-profile-summary-card">
        <span>ABOUT YOU</span>
        <h3>Short biography</h3>
        <p>{form.biography}</p>
      </section>

      <section className="mentee-profile-summary-card">
        <span>MENTORSHIP AREAS</span>
        <div className="mentee-profile-summary-tags">
          {form.mentorshipAreas.map((area) => (
            <i key={area}>{area}</i>
          ))}
        </div>
      </section>

      <section className="mentee-profile-summary-grid">
        <article className="mentee-profile-summary-card">
          <span>DEVELOPMENT GOALS</span>
          <p>{form.developmentGoals}</p>
        </article>

        <article className="mentee-profile-summary-card">
          <span>WHAT YOU HOPE TO GAIN</span>
          <p>{form.hopesToGain}</p>
        </article>
      </section>

      <section className="mentee-profile-conduct-complete">
        <ShieldCheck size={18} />
        <div>
          <strong>Conduct and safety confirmed</strong>
          <p>
            You agreed to the Mentee Code of Conduct and Mentor Connect
            Safety Guidelines.
          </p>
        </div>
      </section>

      <div className="mentee-profile-complete-actions">
        <button
          type="button"
          className="secondary-button mentee-profile-edit-button"
          onClick={onEdit}
        >
          <Edit3 size={16} />
          Edit profile
        </button>
      </div>
    </div>
  );
}

function MenteeGuidelinesModal({ onClose }) {
  return (
    <div
      className="mentee-guidelines-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="mentee-guidelines-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentee-guidelines-title"
      >
        <div className="mentee-guidelines-header">
          <div>
            <span className="eyebrow">MENTOR CONNECT</span>
            <h2 id="mentee-guidelines-title">
              Mentee Code of Conduct and Safety Guidelines
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close guidelines"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mentee-guidelines-content">
          <section>
            <h3>1. Be respectful</h3>
            <p>
              Treat your mentor and other members with respect. Do not use
              insulting, threatening, discriminatory or inappropriate
              language.
            </p>
          </section>

          <section>
            <h3>2. Keep the relationship focused on mentorship</h3>
            <p>
              Use the relationship for guidance, learning, accountability
              and personal or professional growth. Do not pressure a mentor
              into a romantic, commercial or unrelated relationship.
            </p>
          </section>

          <section>
            <h3>3. Respect personal boundaries</h3>
            <p>
              Respect agreed meeting times, communication preferences and
              personal boundaries. A mentor can decline a request that is
              outside their role or experience.
            </p>
          </section>

          <section>
            <h3>4. Protect private information</h3>
            <p>
              Do not share another person&apos;s private information without
              permission. Do not ask for passwords, bank details or other
              sensitive information.
            </p>
          </section>

          <section>
            <h3>5. Keep money outside the mentoring relationship</h3>
            <p>
              Do not ask a mentor for loans, gifts, investments or personal
              financial support. Report any financial pressure or suspicious
              request through Mentor Connect.
            </p>
          </section>

          <section>
            <h3>6. Communicate about sessions</h3>
            <p>
              Attend agreed sessions on time. If you need to reschedule or
              cancel, communicate as early as possible. Repeated missed
              sessions may be reviewed by the administration team.
            </p>
          </section>

          <section>
            <h3>7. Report concerns</h3>
            <p>
              If an interaction makes you feel unsafe or uncomfortable, use
              Report a concern. This includes harassment, threats, scams,
              financial pressure, impersonation or other inappropriate
              behaviour.
            </p>
          </section>

          <section>
            <h3>8. Give honest feedback</h3>
            <p>
              Keep reviews and feedback truthful, respectful and connected to
              your mentoring experience.
            </p>
          </section>
        </div>

        <div className="mentee-guidelines-actions">
          <button
            type="button"
            className="primary-button"
            onClick={onClose}
          >
            I understand
          </button>
        </div>
      </section>
    </div>
  );
}

export default MenteeProfile;
