import { useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Camera,
  ChevronDown,
  HeartHandshake,
  Languages,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";

import "./BecomeAMentor.css";

const PHOTO_BUCKET =
  "mentor-profile-photos";

function getStoragePathFromPublicUrl(
  publicUrl,
) {
  if (!publicUrl) {
    return "";
  }

  const marker =
    `/storage/v1/object/public/${PHOTO_BUCKET}/`;

  const markerIndex =
    publicUrl.indexOf(marker);

  if (markerIndex === -1) {
    return "";
  }

  return decodeURIComponent(
    publicUrl.slice(
      markerIndex +
        marker.length,
    ),
  );
}

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
  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const photoInputRef =
    useRef(null);

  const [form, setForm] =
    useState(initialForm);

  const [photoUrl, setPhotoUrl] =
    useState(
      profile?.profile_photo_url ||
        "",
    );

  const [
    uploadingPhoto,
    setUploadingPhoto,
  ] = useState(false);

  const [
    deletingPhoto,
    setDeletingPhoto,
  ] = useState(false);

  const [
    checkingExistingApplication,
    setCheckingExistingApplication,
  ] = useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setPhotoUrl(
      profile?.profile_photo_url ||
        "",
    );
  }, [profile?.profile_photo_url]);

  useEffect(() => {
    let isMounted = true;

    async function checkExistingApplication() {
      if (!user?.id) {
        if (isMounted) {
          setCheckingExistingApplication(false);
        }

        return;
      }

      const {
        data,
        error: applicationError,
      } = await supabase
        .from("mentor_applications")
        .select("id, status, created_at")
        .eq("applicant_user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (applicationError) {
        console.error(
          "Unable to check mentor application:",
          applicationError,
        );

        setError(
          "We could not check your mentor application. Please try again.",
        );

        setCheckingExistingApplication(false);
        return;
      }

      if (data) {
        navigate(
          "/mentor/application-status",
          {
            replace: true,
          },
        );

        return;
      }

      setCheckingExistingApplication(false);
    }

    checkExistingApplication();

    return () => {
      isMounted = false;
    };
  }, [navigate, user?.id]);

  function updateForm(event) {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  function toggleTextOption(
    field,
    option,
  ) {
    setForm((current) => {
      const currentOptions =
        current[field];

      const optionIsSelected =
        currentOptions.includes(
          option,
        );

      return {
        ...current,
        [field]: optionIsSelected
          ? currentOptions.filter(
              (item) =>
                item !== option,
            )
          : [
              ...currentOptions,
              option,
            ],
      };
    });

    setError("");
  }

  function toggleNumberOption(
    field,
    option,
  ) {
    setForm((current) => {
      const currentOptions =
        current[field];

      const optionIsSelected =
        currentOptions.includes(
          option,
        );

      return {
        ...current,
        [field]: optionIsSelected
          ? currentOptions.filter(
              (item) =>
                item !== option,
            )
          : [
              ...currentOptions,
              option,
            ].sort(
              (first, second) =>
                first - second,
            ),
      };
    });

    setError("");
  }

  async function uploadPhoto(
    event,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setError(
        "Please choose a JPG, PNG or WebP image.",
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Please choose an image smaller than 5 MB.",
      );
      return;
    }

    if (!user?.id) {
      setError(
        "We could not identify your account. Please sign in again.",
      );
      return;
    }

    setUploadingPhoto(true);

    const extension =
      (
        file.name
          .split(".")
          .pop() ||
        "jpg"
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9]/g,
          "",
        ) ||
      "jpg";

    const filePath =
      `${user.id}/mentor-application-${Date.now()}.${extension}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(
        filePath,
        file,
        {
          upsert: false,
          cacheControl:
            "3600",
        },
      );

    if (uploadError) {
      console.error(
        "Unable to upload mentor application photo:",
        uploadError.message,
      );

      setError(
        uploadError.message ||
          "We could not upload your profile photo.",
      );

      setUploadingPhoto(false);
      return;
    }

    const {
      data:
        publicUrlData,
    } = supabase.storage
      .from(PHOTO_BUCKET)
      .getPublicUrl(
        filePath,
      );

    const newPhotoUrl =
      publicUrlData
        ?.publicUrl;

    if (!newPhotoUrl) {
      await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([filePath]);

      setError(
        "The image uploaded, but we could not prepare its link.",
      );

      setUploadingPhoto(false);
      return;
    }

    const oldPhotoUrl =
      photoUrl;

    const {
      error:
        profilePhotoError,
    } = await supabase.rpc(
      "set_my_profile_photo_url",
      {
        p_profile_photo_url:
          newPhotoUrl,
      },
    );

    if (
      profilePhotoError
    ) {
      console.error(
        "Unable to save mentor application photo:",
        profilePhotoError.message,
      );

      await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([filePath]);

      setError(
        profilePhotoError.message ||
          "We could not save your profile photo.",
      );

      setUploadingPhoto(false);
      return;
    }

    setPhotoUrl(
      newPhotoUrl,
    );

    await refreshProfile?.();

    const oldPath =
      getStoragePathFromPublicUrl(
        oldPhotoUrl,
      );

    if (
      oldPath &&
      oldPath !== filePath
    ) {
      const {
        error:
          oldPhotoDeleteError,
      } = await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([oldPath]);

      if (
        oldPhotoDeleteError
      ) {
        console.warn(
          "The new photo was saved, but the old file could not be removed:",
          oldPhotoDeleteError.message,
        );
      }
    }

    setUploadingPhoto(false);
  }

  async function deletePhoto() {
    if (
      !photoUrl ||
      deletingPhoto
    ) {
      return;
    }

    setError("");
    setDeletingPhoto(true);

    const oldPhotoUrl =
      photoUrl;

    const {
      error: clearError,
    } = await supabase.rpc(
      "clear_my_profile_photo_url",
    );

    if (clearError) {
      console.error(
        "Unable to remove mentor application photo:",
        clearError.message,
      );

      setError(
        clearError.message ||
          "We could not remove your profile photo.",
      );

      setDeletingPhoto(false);
      return;
    }

    setPhotoUrl("");

    await refreshProfile?.();

    const oldPath =
      getStoragePathFromPublicUrl(
        oldPhotoUrl,
      );

    if (oldPath) {
      const {
        error:
          storageDeleteError,
      } = await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([oldPath]);

      if (
        storageDeleteError
      ) {
        console.warn(
          "The photo reference was removed, but the old storage file could not be deleted:",
          storageDeleteError.message,
        );
      }
    }

    setDeletingPhoto(false);
  }

  function splitCommaSeparatedValues(
    value,
  ) {
    return value
      .split(",")
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean);
  }

  async function handleSubmit(
    event,
  ) {
    event.preventDefault();
    setError("");

    const expertise =
      splitCommaSeparatedValues(
        form.expertise,
      );

    const languages =
      splitCommaSeparatedValues(
        form.languages,
      );

    if (!photoUrl) {
      setError(
        "Please upload a profile photo before submitting your mentor application.",
      );
      return;
    }

    if (
      uploadingPhoto ||
      deletingPhoto
    ) {
      setError(
        "Please wait for your profile photo update to finish.",
      );
      return;
    }

    if (
      form.biography.trim().length <
      50
    ) {
      setError(
        "Please write a biography containing at least 50 characters.",
      );
      return;
    }

    if (expertise.length === 0) {
      setError(
        "Please provide at least one area of expertise.",
      );
      return;
    }

    if (
      form.categories.length === 0
    ) {
      setError(
        "Please select at least one mentorship category.",
      );
      return;
    }

    if (languages.length === 0) {
      setError(
        "Please provide at least one language.",
      );
      return;
    }

    if (
      form.meetingFormats.length ===
      0
    ) {
      setError(
        "Please select at least one meeting format.",
      );
      return;
    }

    if (
      form.sessionLengths.length ===
      0
    ) {
      setError(
        "Please select at least one session length.",
      );
      return;
    }

    setSubmitting(true);

    const {
      error: applicationError,
    } = await supabase.rpc(
      "save_mentor_application",
      {
        p_biography:
          form.biography.trim(),
        p_job_title:
          form.jobTitle.trim(),
        p_organisation:
          form.organisation.trim() ||
          null,
        p_expertise: expertise,
        p_mentorship_categories:
          form.categories,
        p_languages: languages,
        p_meeting_formats:
          form.meetingFormats,
        p_session_lengths:
          form.sessionLengths,
        p_maximum_active_mentees:
          Number(
            form.maximumActiveMentees,
          ),
        p_years_of_experience:
          Number(
            form.yearsOfExperience,
          ),
      },
    );

    setSubmitting(false);

    if (applicationError) {
      console.error(
        "Unable to submit mentor application:",
        applicationError,
      );

      setError(
        applicationError.message ||
          "We could not submit your application. Please try again.",
      );

      return;
    }

    navigate(
      "/mentor/application-status",
      {
        replace: true,
      },
    );
  }

  if (checkingExistingApplication) {
    return (
      <DashboardLayout
        title="Become a mentor"
        description="Share your experience and help someone take a meaningful next step."
      >
        <div className="mentor-application-checking">
          <div className="loader" />

          <p>
            Checking your mentor application...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Mentor application"
      description="Share your experience and complete your application to mentor."
    >
      <form
        className="mentor-application-form"
        onSubmit={handleSubmit}
      >
        <section className="mentor-application-intro">
          <div>
            <span className="eyebrow">
              MENTOR APPLICATION
            </span>

            <h2>
              Tell us how you would
              like to support others.
            </h2>

            <p>
              Your application will
              be reviewed by the TCN
              Ikeja administration
              team before you can
              create a mentor account.
            </p>
          </div>
        </section>

        <section className="mentor-application-section mentor-application-photo-section">
          <div className="mentor-application-section-heading">
            <Camera
              size={21}
            />

            <div>
              <h3>
                Profile photo
              </h3>

              <p>
                Add a clear and recent
                photo of yourself. This
                photo will be used on
                your mentor profile if
                your application is
                approved.
              </p>
            </div>
          </div>

          <div className="mentor-application-photo-layout">
            <div className="mentor-application-photo-column">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={uploadPhoto}
                disabled={
                  submitting ||
                  uploadingPhoto ||
                  deletingPhoto
                }
              />

              <div
                className={`mentor-application-photo-preview ${
                  photoUrl
                    ? "has-photo"
                    : ""
                }`}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Your mentor profile preview"
                  />
                ) : (
                  <div className="mentor-application-photo-empty">
                    <Camera
                      size={28}
                      aria-hidden="true"
                    />

                    <span>
                      Add profile photo
                    </span>
                  </div>
                )}
              </div>

              <small className="mentor-application-photo-help">
                JPG, PNG or WebP. Maximum 5 MB.
              </small>
            </div>

            <div className="mentor-application-photo-copy">
              <span className="mentor-application-photo-kicker">
                PROFILE IMAGE
              </span>

              <h4>
                Help mentees recognise
                you.
              </h4>

              <p>
                Use a clear photo with
                your face visible. Once
                your mentor application
                is approved and your
                mentor account is
                created, this same photo
                will appear on your
                mentor profile and in
                mentor discovery.
              </p>

              <div className="mentor-application-photo-actions">
                <button
                  type="button"
                  className="mentor-application-photo-upload"
                  onClick={() =>
                    photoInputRef.current?.click()
                  }
                  disabled={
                    submitting ||
                    uploadingPhoto ||
                    deletingPhoto
                  }
                >
                  <Camera
                    size={16}
                    aria-hidden="true"
                  />

                  <span>
                    {uploadingPhoto
                      ? "Uploading..."
                      : photoUrl
                        ? "Replace photo"
                        : "Upload photo"}
                  </span>
                </button>

                {photoUrl && (
                  <button
                    type="button"
                    className="mentor-application-photo-remove"
                    onClick={deletePhoto}
                    disabled={
                      submitting ||
                      uploadingPhoto ||
                      deletingPhoto
                    }
                  >
                    <Trash2
                      size={16}
                      aria-hidden="true"
                    />

                    <span>
                      {deletingPhoto
                        ? "Removing..."
                        : "Remove photo"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mentor-application-section">
          <div className="mentor-application-section-heading">
            <BriefcaseBusiness
              size={21}
            />

            <div>
              <h3>
                Professional
                background
              </h3>

              <p>
                Tell us about your
                current work and
                experience.
              </p>
            </div>
          </div>

          <div className="mentor-application-grid">
            <label>
              Current role or
              occupation

              <input
                type="text"
                name="jobTitle"
                value={
                  form.jobTitle
                }
                onChange={
                  updateForm
                }
                placeholder="For example, Product Designer"
                disabled={
                  submitting
                }
                required
              />
            </label>

            <label>
              Organisation{" "}
              <small>
                (optional)
              </small>

              <input
                type="text"
                name="organisation"
                value={
                  form.organisation
                }
                onChange={
                  updateForm
                }
                placeholder="Where do you currently work?"
                disabled={
                  submitting
                }
              />
            </label>

            <label>
              Years of experience

              <input
                type="number"
                name="yearsOfExperience"
                value={
                  form.yearsOfExperience
                }
                onChange={
                  updateForm
                }
                min="0"
                max="70"
                placeholder="For example, 5"
                disabled={
                  submitting
                }
                required
              />
            </label>
          </div>
        </section>

        <section className="mentor-application-section">
          <div className="mentor-application-section-heading">
            <HeartHandshake
              size={21}
            />

            <div>
              <h3>
                Your mentoring focus
              </h3>

              <p>
                Help us understand
                the guidance you can
                provide.
              </p>
            </div>
          </div>

          <label className="mentor-application-full-field">
            Short biography

            <textarea
              name="biography"
              value={
                form.biography
              }
              onChange={
                updateForm
              }
              rows="5"
              minLength="50"
              placeholder="Share your background, experience and why you want to mentor others."
              disabled={
                submitting
              }
              required
            />

            <small>
              {
                form.biography.trim()
                  .length
              }
              /50 minimum
              characters
            </small>
          </label>

          <label className="mentor-application-full-field">
            Areas of expertise

            <input
              type="text"
              name="expertise"
              value={
                form.expertise
              }
              onChange={
                updateForm
              }
              placeholder="For example, Product design, Leadership, Career planning"
              disabled={
                submitting
              }
              required
            />

            <small>
              Separate multiple
              areas with commas.
            </small>
          </label>

          <fieldset className="mentor-option-group">
            <legend>
              Mentorship categories
            </legend>

            <p>
              Select every category
              you can confidently
              support.
            </p>

            <div className="mentor-checkbox-grid">
              {mentorshipCategories.map(
                (category) => (
                  <label
                    key={
                      category
                    }
                  >
                    <input
                      type="checkbox"
                      checked={
                        form.categories.includes(
                          category,
                        )
                      }
                      onChange={() =>
                        toggleTextOption(
                          "categories",
                          category,
                        )
                      }
                      disabled={
                        submitting
                      }
                    />

                    <span>
                      {category}
                    </span>
                  </label>
                ),
              )}
            </div>
          </fieldset>
        </section>

        <section className="mentor-application-section">
          <div className="mentor-application-section-heading">
            <Languages
              size={21}
            />

            <div>
              <h3>
                Availability
                preferences
              </h3>

              <p>
                Choose how you would
                prefer to conduct
                sessions.
              </p>
            </div>
          </div>

          <label className="mentor-application-full-field">
            Languages

            <input
              type="text"
              name="languages"
              value={
                form.languages
              }
              onChange={
                updateForm
              }
              placeholder="For example, English, Yoruba"
              disabled={
                submitting
              }
              required
            />

            <small>
              Separate multiple
              languages with commas.
            </small>
          </label>

          <div className="mentor-application-grid two-columns">
            <fieldset className="mentor-option-group compact">
              <legend>
                Meeting format
              </legend>

              <div className="mentor-checkbox-stack">
                {meetingFormatOptions.map(
                  (format) => (
                    <label
                      key={
                        format
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          form.meetingFormats.includes(
                            format,
                          )
                        }
                        onChange={() =>
                          toggleTextOption(
                            "meetingFormats",
                            format,
                          )
                        }
                        disabled={
                          submitting
                        }
                      />

                      <span>
                        {format}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </fieldset>

            <fieldset className="mentor-option-group compact">
              <legend>
                Preferred session
                length
              </legend>

              <div className="mentor-checkbox-stack">
                {sessionLengthOptions.map(
                  (length) => (
                    <label
                      key={
                        length
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          form.sessionLengths.includes(
                            length,
                          )
                        }
                        onChange={() =>
                          toggleNumberOption(
                            "sessionLengths",
                            length,
                          )
                        }
                        disabled={
                          submitting
                        }
                      />

                      <span>
                        {length} minutes
                      </span>
                    </label>
                  ),
                )}
              </div>
            </fieldset>
          </div>

          <label className="mentor-application-full-field">
            Maximum number of
            active mentees

            <div className="mentor-application-select-field">
              <select
                name="maximumActiveMentees"
                value={
                  form.maximumActiveMentees
                }
                onChange={
                  updateForm
                }
                disabled={
                  submitting
                }
                required
              >
                {[
                  1,
                  2,
                  3,
                  4,
                  5,
                  6,
                  8,
                  10,
                ].map(
                  (number) => (
                    <option
                      key={
                        number
                      }
                      value={
                        number
                      }
                    >
                      {number}{" "}
                      {number ===
                      1
                        ? "mentee"
                        : "mentees"}
                    </option>
                  ),
                )}
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
          Submitting this form does
          not create mentor access
          automatically. The
          administration team must
          review and approve your
          application first.
        </div>

        {error && (
          <p
            className="form-error mentor-application-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mentor-application-actions">
          <button
            type="button"
            className="mentor-application-cancel"
            onClick={() =>
              navigate(
                "/mentee/dashboard",
              )
            }
            disabled={
              submitting
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="mentor-application-submit"
            disabled={
              submitting ||
              uploadingPhoto ||
              deletingPhoto ||
              !photoUrl
            }
          >
            {submitting
              ? "Submitting application..."
              : uploadingPhoto
                ? "Uploading photo..."
                : deletingPhoto
                  ? "Updating photo..."
                  : "Submit application"}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}

export default BecomeAMentor;
