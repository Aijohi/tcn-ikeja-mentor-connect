import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  useAuth,
} from "../context/AuthContext";
import {
  supabase,
} from "../lib/supabase";

import "./MentorMyProfile.css";

const PHOTO_BUCKET =
  "mentor-profile-photos";

const initialForm = {
  jobTitle: "",
  organisation: "",
  yearsOfExperience: "",
  biography: "",
  expertise: "",
  mentorshipCategories: "",
  languages: "English",
  meetingFormat: "Virtual",
  sessionLength: "30",
  maximumActiveMentees: "3",
  acceptingRequests: true,
};

function convertTextToArray(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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

function MentorMyProfile() {
  const {
    user,
    profile,
    refreshProfile,
  } = useAuth();

  const photoInputRef =
    useRef(null);

  const photoMenuRef =
    useRef(null);

  const [
    photoMenuOpen,
    setPhotoMenuOpen,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState(
    initialForm,
  );

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    photoUrl,
    setPhotoUrl,
  ] = useState("");

  const [
    currentActiveMentees,
    setCurrentActiveMentees,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    uploadingPhoto,
    setUploadingPhoto,
  ] = useState(false);

  const [
    deletingPhoto,
    setDeletingPhoto,
  ] = useState(false);

  const [
    deleteModalOpen,
    setDeleteModalOpen,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError("");

      const [
        profileResult,
        mentorResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            full_name,
            profile_photo_url
          `)
          .eq(
            "id",
            user.id,
          )
          .maybeSingle(),

        supabase
          .from(
            "mentor_profiles",
          )
          .select(`
            mentor_id,
            biography,
            job_title,
            organisation,
            expertise,
            mentorship_categories,
            languages,
            meeting_formats,
            session_lengths,
            maximum_active_mentees,
            current_active_mentees,
            years_of_experience,
            accepting_requests,
            approval_status
          `)
          .eq(
            "mentor_id",
            user.id,
          )
          .maybeSingle(),
      ]);

      if (!mounted) {
        return;
      }

      if (
        profileResult.error ||
        mentorResult.error
      ) {
        console.error(
          "Unable to load mentor profile:",
          profileResult.error?.message ||
            mentorResult.error?.message,
        );

        setError(
          "We could not load your mentor profile. Please try again.",
        );

        setLoading(false);
        return;
      }

      const personalProfile =
        profileResult.data ??
        profile ??
        {};

      const mentor =
        mentorResult.data;

      if (!mentor) {
        setError(
          "Your mentor profile is not available yet.",
        );

        setLoading(false);
        return;
      }

      setFullName(
        personalProfile.full_name ||
          profile?.full_name ||
          "Mentor",
      );

      setPhotoUrl(
        personalProfile.profile_photo_url ||
          profile?.profile_photo_url ||
          "",
      );

      setCurrentActiveMentees(
        Number(
          mentor.current_active_mentees ??
            0,
        ),
      );

      setForm({
        jobTitle:
          mentor.job_title ??
          "",
        organisation:
          mentor.organisation ??
          "",
        yearsOfExperience:
          mentor.years_of_experience ===
          null
            ? ""
            : String(
                mentor.years_of_experience ??
                  "",
              ),
        biography:
          mentor.biography ??
          "",
        expertise:
          (
            mentor.expertise ??
            []
          ).join(", "),
        mentorshipCategories:
          (
            mentor.mentorship_categories ??
            []
          ).join(", "),
        languages:
          (
            mentor.languages ??
            ["English"]
          ).join(", "),
        meetingFormat:
          mentor.meeting_formats?.[0] ??
          "Virtual",
        sessionLength:
          String(
            mentor.session_lengths?.[0] ??
              60,
          ),
        maximumActiveMentees:
          String(
            mentor.maximum_active_mentees ??
              3,
          ),
        acceptingRequests:
          mentor.accepting_requests ===
          true,
      });

      setLoading(false);
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [
    user?.id,
    profile?.full_name,
    profile?.profile_photo_url,
  ]);

  useEffect(() => {
    if (!photoMenuOpen) {
      return undefined;
    }

    function handleMenuOutsideClick(
      event,
    ) {
      if (
        photoMenuRef.current &&
        !photoMenuRef.current.contains(
          event.target,
        )
      ) {
        setPhotoMenuOpen(false);
      }
    }

    function handleMenuEscape(
      event,
    ) {
      if (event.key === "Escape") {
        setPhotoMenuOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleMenuOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleMenuEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleMenuOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleMenuEscape,
      );
    };
  }, [photoMenuOpen]);

  useEffect(() => {
    if (!deleteModalOpen) {
      return undefined;
    }

    function handleEscape(
      event,
    ) {
      if (
        event.key ===
          "Escape" &&
        !deletingPhoto
      ) {
        setDeleteModalOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    deleteModalOpen,
    deletingPhoto,
  ]);

  function updateForm(
    event,
  ) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]:
          type ===
          "checkbox"
            ? checked
            : value,
      }),
    );

    setError("");
    setSuccess("");
  }

  async function saveProfile(
    event,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const expertise =
      convertTextToArray(
        form.expertise,
      );

    const categories =
      convertTextToArray(
        form.mentorshipCategories,
      );

    const languages =
      convertTextToArray(
        form.languages,
      );

    if (!form.jobTitle.trim()) {
      setError(
        "Please enter your current role or occupation.",
      );
      return;
    }

    if (
      form.biography.trim()
        .length < 40
    ) {
      setError(
        "Please write at least 40 characters in your biography.",
      );
      return;
    }

    if (
      form.yearsOfExperience ===
      ""
    ) {
      setError(
        "Please enter your years of experience.",
      );
      return;
    }

    if (
      expertise.length === 0
    ) {
      setError(
        "Please provide at least one area of expertise.",
      );
      return;
    }

    if (
      categories.length ===
      0
    ) {
      setError(
        "Please provide at least one mentorship category.",
      );
      return;
    }

    if (
      languages.length === 0
    ) {
      setError(
        "Please provide at least one language.",
      );
      return;
    }

    const maximumActiveMentees =
      Number(
        form.maximumActiveMentees,
      );

    if (
      maximumActiveMentees <
      currentActiveMentees
    ) {
      setError(
        `Your maximum active mentees cannot be lower than your current ${currentActiveMentees} active mentees.`,
      );
      return;
    }

    setSaving(true);

    const {
      error:
        saveError,
    } = await supabase.rpc(
      "save_my_mentor_profile",
      {
        p_biography:
          form.biography.trim(),
        p_job_title:
          form.jobTitle.trim(),
        p_organisation:
          form.organisation.trim() ||
          null,
        p_expertise:
          expertise,
        p_mentorship_categories:
          categories,
        p_languages:
          languages,
        p_meeting_formats: [
          form.meetingFormat,
        ],
        p_session_lengths: [
          Number(
            form.sessionLength,
          ),
        ],
        p_maximum_active_mentees:
          maximumActiveMentees,
        p_years_of_experience:
          Number(
            form.yearsOfExperience,
          ),
        p_accepting_requests:
          form.acceptingRequests,
      },
    );

    setSaving(false);

    if (saveError) {
      console.error(
        "Unable to save mentor profile:",
        saveError.message,
      );

      setError(
        saveError.message ||
          "We could not save your mentor profile.",
      );
      return;
    }

    setSuccess(
      "Your mentor profile has been updated.",
    );
  }

  async function uploadPhoto(
    event,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

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
      `${user.id}/profile-${Date.now()}.${extension}`;

    const {
      error:
        uploadError,
    } = await supabase.storage
      .from(
        PHOTO_BUCKET,
      )
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
        "Unable to upload mentor photo:",
        uploadError.message,
      );

      setError(
        uploadError.message ||
          "We could not upload your image.",
      );

      setUploadingPhoto(false);
      return;
    }

    const {
      data:
        publicUrlData,
    } = supabase.storage
      .from(
        PHOTO_BUCKET,
      )
      .getPublicUrl(
        filePath,
      );

    const newPhotoUrl =
      publicUrlData
        ?.publicUrl;

    if (!newPhotoUrl) {
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
        "Unable to save mentor image:",
        profilePhotoError.message,
      );

      await supabase.storage
        .from(
          PHOTO_BUCKET,
        )
        .remove([
          filePath,
        ]);

      setError(
        profilePhotoError.message ||
          "We could not save your image to your profile.",
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
      oldPath !==
        filePath
    ) {
      await supabase.storage
        .from(
          PHOTO_BUCKET,
        )
        .remove([
          oldPath,
        ]);
    }

    setSuccess(
      oldPhotoUrl
        ? "Your profile image has been replaced."
        : "Your profile image has been uploaded.",
    );

    setUploadingPhoto(false);
  }

  async function deletePhoto() {
    if (
      !photoUrl ||
      deletingPhoto
    ) {
      return;
    }

    setDeletingPhoto(true);
    setError("");
    setSuccess("");

    const oldPhotoUrl =
      photoUrl;

    const {
      error:
        clearError,
    } = await supabase.rpc(
      "clear_my_profile_photo_url",
    );

    if (clearError) {
      console.error(
        "Unable to remove profile image:",
        clearError.message,
      );

      setError(
        clearError.message ||
          "We could not remove your profile image.",
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
        .from(
          PHOTO_BUCKET,
        )
        .remove([
          oldPath,
        ]);

      if (
        storageDeleteError
      ) {
        console.warn(
          "Profile image reference was removed, but the old storage file could not be deleted:",
          storageDeleteError.message,
        );
      }
    }

    setDeleteModalOpen(
      false,
    );

    setSuccess(
      "Your profile image has been removed.",
    );

    setDeletingPhoto(false);
  }

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part
          .charAt(0)
          .toUpperCase(),
      )
      .join("") ||
    "MC";

  if (loading) {
    return (
      <DashboardLayout
        title="My profile"
        description="Manage how your mentor profile appears to mentees."
      >
        <section className="dashboard-empty-state">
          <div className="loader" />

          <h2>
            Loading your profile
          </h2>

          <p>
            Please wait while we prepare your mentor profile.
          </p>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My profile"
      description="Manage how your mentor profile appears to mentees."
    >
      <div className="mentor-my-profile-page">
        <section className="mentor-my-profile-intro">
          <div>
            <span className="mentor-my-profile-eyebrow">
              MENTOR PROFILE
            </span>

            <h2>
              Keep your mentor information current.
            </h2>

            <p>
              Your image and profile information can appear in the public mentor showcase and the Find a Mentor directory.
            </p>
          </div>
        </section>

        <section className="mentor-profile-photo-section">
          <div className="mentor-profile-photo-column">
            <input
              ref={
                photoInputRef
              }
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={
                uploadPhoto
              }
            />

            <div className="mentor-profile-photo-preview">
              <div className="mentor-profile-photo-media">
                {photoUrl ? (
                  <img
                    src={
                      photoUrl
                    }
                    alt=""
                  />
                ) : (
                  <span>
                    {initials}
                  </span>
                )}
              </div>

              <div
                ref={
                  photoMenuRef
                }
                className="mentor-profile-photo-menu"
              >
                <button
                  type="button"
                  className="mentor-profile-photo-menu-trigger"
                  aria-label="Profile image actions"
                  aria-haspopup="menu"
                  aria-expanded={
                    photoMenuOpen
                  }
                  disabled={
                    uploadingPhoto ||
                    deletingPhoto
                  }
                  onClick={() =>
                    setPhotoMenuOpen(
                      (current) =>
                        !current,
                    )
                  }
                >
                  <MoreVertical
                    size={19}
                    aria-hidden="true"
                  />
                </button>

                {photoMenuOpen && (
                  <div
                    className="mentor-profile-photo-menu-popover"
                    role="menu"
                    aria-label="Profile image actions"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      disabled={
                        uploadingPhoto
                      }
                      onClick={() => {
                        setPhotoMenuOpen(
                          false,
                        );

                        photoInputRef.current?.click();
                      }}
                    >
                      <Camera
                        size={17}
                        aria-hidden="true"
                      />

                      <span>
                        {uploadingPhoto
                          ? "Uploading..."
                          : photoUrl
                            ? "Replace image"
                            : "Upload image"}
                      </span>
                    </button>

                    {photoUrl && (
                      <button
                        type="button"
                        role="menuitem"
                        className="is-danger"
                        disabled={
                          deletingPhoto
                        }
                        onClick={() => {
                          setPhotoMenuOpen(
                            false,
                          );

                          setDeleteModalOpen(
                            true,
                          );
                        }}
                      >
                        <Trash2
                          size={17}
                          aria-hidden="true"
                        />

                        <span>
                          Delete image
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <small>
              JPG, PNG or WebP. Maximum 5 MB.
            </small>
          </div>

          <div className="mentor-profile-photo-copy">
            <span className="mentor-my-profile-eyebrow">
              PROFILE IMAGE
            </span>

            <h3>
              Help mentees recognise you.
            </h3>

            <p>
              Use a clear and recent image of yourself. Open the menu on the image to upload, replace or remove your profile image.
            </p>
          </div>
        </section>

        {error && (
          <p
            className="mentor-my-profile-message mentor-my-profile-message--error"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p className="mentor-my-profile-message mentor-my-profile-message--success">
            {success}
          </p>
        )}

        <form
          className="mentor-my-profile-form"
          onSubmit={
            saveProfile
          }
        >
          <section className="mentor-my-profile-card">
            <div className="mentor-my-profile-card-heading">
              <span className="mentor-my-profile-eyebrow">
                PROFESSIONAL INFORMATION
              </span>

              <h3>
                Tell mentees about your experience.
              </h3>
            </div>

            <div className="mentor-my-profile-field-grid">
              <label>
                Current role or occupation

                <input
                  type="text"
                  name="jobTitle"
                  value={
                    form.jobTitle
                  }
                  onChange={
                    updateForm
                  }
                  required
                />
              </label>

              <label>
                Organisation
                <span className="mentor-my-profile-optional">
                  Optional
                </span>

                <input
                  type="text"
                  name="organisation"
                  value={
                    form.organisation
                  }
                  onChange={
                    updateForm
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
                  min="0"
                  max="60"
                  onChange={
                    updateForm
                  }
                  required
                />
              </label>
            </div>

            <label>
              Biography

              <textarea
                name="biography"
                value={
                  form.biography
                }
                rows="5"
                minLength="40"
                onChange={
                  updateForm
                }
                required
              />

              <small>
                Write at least 40 characters.
              </small>
            </label>

            <label>
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
                placeholder="Product design, leadership, career development"
                required
              />

              <small>
                Separate each area with a comma.
              </small>
            </label>

            <label>
              Mentorship categories

              <input
                type="text"
                name="mentorshipCategories"
                value={
                  form.mentorshipCategories
                }
                onChange={
                  updateForm
                }
                placeholder="Career development, leadership, technology"
                required
              />

              <small>
                Separate each category with a comma.
              </small>
            </label>

            <label>
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
                placeholder="English, Yoruba"
                required
              />

              <small>
                Separate multiple languages with a comma.
              </small>
            </label>
          </section>

          <section className="mentor-my-profile-card">
            <div className="mentor-my-profile-card-heading">
              <span className="mentor-my-profile-eyebrow">
                MENTORING PREFERENCES
              </span>

              <h3>
                Manage your mentoring availability.
              </h3>
            </div>

            <div className="mentor-my-profile-field-grid">
              <label>
                Preferred meeting format

                <select
                  name="meetingFormat"
                  value={
                    form.meetingFormat
                  }
                  onChange={
                    updateForm
                  }
                >
                  <option value="Virtual">
                    Virtual
                  </option>

                  <option value="In person">
                    In person
                  </option>

                  <option value="Either">
                    Either
                  </option>
                </select>
              </label>

              <label>
                Preferred session length

                <select
                  name="sessionLength"
                  value={
                    form.sessionLength
                  }
                  onChange={
                    updateForm
                  }
                >
                  <option value="15">
                    15 minutes
                  </option>

                  <option value="30">
                    30 minutes
                  </option>

                  <option value="45">
                    45 minutes
                  </option>

                  <option value="60">
                    60 minutes
                  </option>
                </select>
              </label>

              <label>
                Maximum active mentees

                <select
                  name="maximumActiveMentees"
                  value={
                    form.maximumActiveMentees
                  }
                  onChange={
                    updateForm
                  }
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

                <small>
                  You currently have {currentActiveMentees} active {currentActiveMentees === 1 ? "mentee" : "mentees"}.
                </small>
              </label>
            </div>

            <label className="mentor-my-profile-availability">
              <input
                type="checkbox"
                name="acceptingRequests"
                checked={
                  form.acceptingRequests
                }
                onChange={
                  updateForm
                }
              />

              <span>
                <strong>
                  Accepting new mentorship requests
                </strong>

                <small>
                  Turn this off when you do not want to receive new requests.
                </small>
              </span>
            </label>
          </section>

          <div className="mentor-my-profile-save-row">
            <button
              type="submit"
              className="primary-button"
              disabled={
                saving
              }
            >
              {saving
                ? "Saving..."
                : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      {deleteModalOpen && (
        <div
          className="mentor-photo-modal-backdrop"
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !deletingPhoto
            ) {
              setDeleteModalOpen(
                false,
              );
            }
          }}
        >
          <div
            className="mentor-photo-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mentor-photo-delete-title"
          >
            <button
              type="button"
              className="mentor-photo-modal-close"
              aria-label="Close"
              disabled={
                deletingPhoto
              }
              onClick={() =>
                setDeleteModalOpen(
                  false,
                )
              }
            >
              <X
                size={18}
              />
            </button>

            <span className="mentor-photo-modal-icon">
              <Trash2
                size={22}
              />
            </span>

            <h2 id="mentor-photo-delete-title">
              Delete profile image?
            </h2>

            <p>
              This will remove your image from your mentor profile, Find a Mentor and the public website. You can upload a new image at any time.
            </p>

            <div className="mentor-photo-modal-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={
                  deletingPhoto
                }
                onClick={() =>
                  setDeleteModalOpen(
                    false,
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="mentor-photo-confirm-delete"
                disabled={
                  deletingPhoto
                }
                onClick={
                  deletePhoto
                }
              >
                {deletingPhoto
                  ? "Deleting..."
                  : "Delete image"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default MentorMyProfile;
