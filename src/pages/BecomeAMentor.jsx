import { useState } from "react";
import {
  BriefcaseBusiness,
  ChevronDown,
  HeartHandshake,
  Languages,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import DashboardLayout from "../layouts/DashboardLayout";

const mentorshipCategories = [
  "Career development",
  "Business and entrepreneurship",
  "Leadership",
  "Faith and spiritual growth",
  "Personal development",
  "Technology",
];

const meetingFormatOptions = ["Virtual", "In person"];
const sessionLengthOptions = [30, 45, 60];

const initialForm = {
  jobTitle: "",
  organisation: "",
  yearsOfExperience: "",
  biography: "",
  expertise: "",
  categories: [],
  languages: "English",
  meetingFormats: ["Virtual"],
  sessionLengths: [45],
  maximumActiveMentees: "3",
};

function BecomeAMentor() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  function toggleTextOption(field, option) {
    setForm((current) => {
      const currentOptions = current[field];
      const optionIsSelected = currentOptions.includes(option);

      return {
        ...current,
        [field]: optionIsSelected
          ? currentOptions.filter((item) => item !== option)
          : [...currentOptions, option],
      };
    });

    setError("");
  }

  function toggleNumberOption(field, option) {
    setForm((current) => {
      const currentOptions = current[field];
      const optionIsSelected = currentOptions.includes(option);

      return {
        ...current,
        [field]: optionIsSelected
          ? currentOptions.filter((item) => item !== option)
          : [...currentOptions, option].sort((first, second) => first - second),
      };
    });

    setError("");
  }

  function splitCommaSeparatedValues(value) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const expertise = splitCommaSeparatedValues(form.expertise);
    const languages = splitCommaSeparatedValues(form.languages);

    if (form.biography.trim().length < 50) {
      setError("Please write a biography containing at least 50 characters.");
      return;
    }

    if (expertise.length === 0) {
      setError("Please provide at least one area of expertise.");
      return;
    }

    if (form.categories.length === 0) {
      setError("Please select at least one mentorship category.");
      return;
    }

    if (languages.length === 0) {
      setError("Please provide at least one language.");
      return;
    }

    if (form.meetingFormats.length === 0) {
      setError("Please select at least one meeting format.");
      return;
    }

    if (form.sessionLengths.length === 0) {
      setError("Please select at least one session length.");
      return;
    }

    setSubmitting(true);

    const { error: applicationError } = await supabase.rpc(
      "submit_mentor_application",
      {
        p_biography: form.biography.trim(),
        p_job_title: form.jobTitle.trim(),
        p_organisation: form.organisation.trim() || null,
        p_expertise: expertise,
        p_mentorship_categories: form.categories,
        p_languages: languages,
        p_meeting_formats: form.meetingFormats,
        p_session_lengths: form.sessionLengths,
        p_maximum_active_mentees: Number(form.maximumActiveMentees),
        p_years_of_experience: Number(form.yearsOfExperience),
      },
    );

    setSubmitting(false);

    if (applicationError) {
      console.error("Unable to submit mentor application:", applicationError);
      setError(
        applicationError.message ||
          "We could not submit your application. Please try again.",
      );
      return;
    }

    navigate("/mentor/application-status", {
      replace: true,
    });
  }

  return (
    <DashboardLayout
      title="Become a mentor"
      description="Share your experience and help someone take a meaningful next step."
    >
      <form className="mentor-application-form" onSubmit={handleSubmit}>
        <section className="mentor-application-intro">
          <span className="mentor-application-intro-icon">
            <HeartHandshake size={25} />
          </span>

          <div>
            <span className="eyebrow">MENTOR APPLICATION</span>
            <h2>Tell us how you would like to support others.</h2>
            <p>
              Your application will be reviewed by the TCN Ikeja administration
              team before your mentor profile becomes visible.
            </p>
          </div>
        </section>

        <section className="mentor-application-section">
          <div className="mentor-application-section-heading">
            <BriefcaseBusiness size={21} />

            <div>
              <h3>Professional background</h3>
              <p>Tell us about your current work and experience.</p>
            </div>
          </div>

          <div className="mentor-application-grid">
            <label>
              Current role or occupation
              <input
                type="text"
                name="jobTitle"
                value={form.jobTitle}
                onChange={updateForm}
                placeholder="For example, Product Designer"
                disabled={submitting}
                required
              />
            </label>

            <label>
              Organisation <small>(optional)</small>
              <input
                type="text"
                name="organisation"
                value={form.organisation}
                onChange={updateForm}
                placeholder="Where do you currently work?"
                disabled={submitting}
              />
            </label>

            <label>
              Years of experience
              <input
                type="number"
                name="yearsOfExperience"
                value={form.yearsOfExperience}
                onChange={updateForm}
                min="0"
                max="70"
                placeholder="For example, 5"
                disabled={submitting}
                required
              />
            </label>
          </div>
        </section>

        <section className="mentor-application-section">
          <div className="mentor-application-section-heading">
            <HeartHandshake size={21} />

            <div>
              <h3>Your mentoring focus</h3>
              <p>Help us understand the guidance you can provide.</p>
            </div>
          </div>

          <label className="mentor-application-full-field">
            Short biography
            <textarea
              name="biography"
              value={form.biography}
              onChange={updateForm}
              rows="5"
              minLength="50"
              placeholder="Share your background, experience and why you want to mentor others."
              disabled={submitting}
              required
            />
            <small>{form.biography.trim().length}/50 minimum characters</small>
          </label>

          <label className="mentor-application-full-field">
            Areas of expertise
            <input
              type="text"
              name="expertise"
              value={form.expertise}
              onChange={updateForm}
              placeholder="For example, Product design, Leadership, Career planning"
              disabled={submitting}
              required
            />
            <small>Separate multiple areas with commas.</small>
          </label>

          <fieldset className="mentor-option-group">
            <legend>Mentorship categories</legend>
            <p>Select every category you can confidently support.</p>

            <div className="mentor-checkbox-grid">
              {mentorshipCategories.map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    checked={form.categories.includes(category)}
                    onChange={() => toggleTextOption("categories", category)}
                    disabled={submitting}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="mentor-application-section">
          <div className="mentor-application-section-heading">
            <Languages size={21} />

            <div>
              <h3>Availability preferences</h3>
              <p>Choose how you would prefer to conduct sessions.</p>
            </div>
          </div>

          <label className="mentor-application-full-field">
            Languages
            <input
              type="text"
              name="languages"
              value={form.languages}
              onChange={updateForm}
              placeholder="For example, English, Yoruba"
              disabled={submitting}
              required
            />
            <small>Separate multiple languages with commas.</small>
          </label>

          <div className="mentor-application-grid two-columns">
            <fieldset className="mentor-option-group compact">
              <legend>Meeting format</legend>

              <div className="mentor-checkbox-stack">
                {meetingFormatOptions.map((format) => (
                  <label key={format}>
                    <input
                      type="checkbox"
                      checked={form.meetingFormats.includes(format)}
                      onChange={() =>
                        toggleTextOption("meetingFormats", format)
                      }
                      disabled={submitting}
                    />
                    <span>{format}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mentor-option-group compact">
              <legend>Preferred session length</legend>

              <div className="mentor-checkbox-stack">
                {sessionLengthOptions.map((length) => (
                  <label key={length}>
                    <input
                      type="checkbox"
                      checked={form.sessionLengths.includes(length)}
                      onChange={() =>
                        toggleNumberOption("sessionLengths", length)
                      }
                      disabled={submitting}
                    />
                    <span>{length} minutes</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <label className="mentor-application-full-field">
            Maximum number of active mentees
            <div className="mentor-application-select-field">
              <select
                name="maximumActiveMentees"
                value={form.maximumActiveMentees}
                onChange={updateForm}
                disabled={submitting}
                required
              >
                {[1, 2, 3, 4, 5, 6, 8, 10].map((number) => (
                  <option key={number} value={number}>
                    {number} {number === 1 ? "mentee" : "mentees"}
                  </option>
                ))}
              </select>

              <ChevronDown
                className="mentor-application-select-icon"
                size={18}
                aria-hidden="true"
              />
            </div>
          </label>
        </section>

        <div className="mentor-application-review-notice">
          Submitting this form does not approve mentor access automatically. The
          administration team will review your application first.
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="mentor-application-actions">
          <button
            type="button"
            className="tertiary-button"
            onClick={() => navigate("/mentee/dashboard")}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="mentor-application-submit"
            disabled={submitting}
          >
            {submitting ? "Submitting application..." : "Submit application"}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}

export default BecomeAMentor;
