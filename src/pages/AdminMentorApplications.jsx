import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Search,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import "./AdminLaunchFixes.css";

const APPLICATION_PAGE_SIZE = 10;

function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [active]);
}

function AdminMentorApplications({
  canRecommendApplications = false,
  canSecondSignoffApplications = false,
  isFullAccessAdmin = false,
  canVerifyMembership = false,
  adminOperationalRole = "",
}) {
  return (
    <div className="admin-mentor-workflow-page">
      <MentorInterestList />

      <SubmittedApplications
        canRecommendApplications={
          canRecommendApplications
        }
        canSecondSignoffApplications={
          canSecondSignoffApplications
        }
        isFullAccessAdmin={
          isFullAccessAdmin
        }
        canVerifyMembership={
          canVerifyMembership
        }
        adminOperationalRole={
          adminOperationalRole
        }
      />
    </div>
  );
}

function MentorInterestList() {
  const [
    registrations,
    setRegistrations,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMentorInterest() {
      setLoading(true);
      setError("");

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          signup_intent,
          role,
          account_status,
          email_verified,
          onboarding_completed,
          created_at
        `)
        .eq(
          "signup_intent",
          "mentor",
        )
        .neq(
          "role",
          "mentor",
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        );

      if (!isMounted) {
        return;
      }

      if (profileError) {
        console.error(
          "Unable to load mentor registrations:",
          profileError,
        );

        setError(
          "We could not load mentor registrations.",
        );

        setLoading(false);
        return;
      }

      const profiles =
        profileData ?? [];

      if (
        profiles.length ===
        0
      ) {
        setRegistrations([]);
        setLoading(false);
        return;
      }

      const {
        data: applicationData,
        error: applicationError,
      } = await supabase
        .from(
          "mentor_applications",
        )
        .select(
          "applicant_user_id",
        )
        .in(
          "applicant_user_id",
          profiles.map(
            (
              person,
            ) =>
              person.id,
          ),
        );

      if (!isMounted) {
        return;
      }

      if (applicationError) {
        console.error(
          "Unable to check mentor applications:",
          applicationError,
        );

        setError(
          "We could not prepare the mentor registration list.",
        );

        setLoading(false);
        return;
      }

      const submittedIds =
        new Set(
          (
            applicationData ??
            []
          ).map(
            (
              application,
            ) =>
              application.applicant_user_id,
          ),
        );

      setRegistrations(
        profiles.filter(
          (
            person,
          ) =>
            !submittedIds.has(
              person.id,
            ),
        ),
      );

      setLoading(false);
    }

    loadMentorInterest();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <p
        className="form-error"
        role="alert"
      >
        {error}
      </p>
    );
  }

  if (registrations.length === 0) {
    return null;
  }

  return (
    <section className="admin-list-section admin-mentor-interest-section">
      <div className="admin-workflow-section-heading">
        <div>
          <span>
            MENTOR INTEREST
          </span>

          <h2>
            Mentor registrations awaiting application
          </h2>

          <p>
            These people selected “I want to mentor” but have not submitted the mentor application yet. This section only appears when someone is still at that stage.
          </p>
        </div>

        <strong>
          {registrations.length}{" "}
          {registrations.length === 1
            ? "person"
            : "people"}
        </strong>
      </div>

      <div className="admin-table-wrapper admin-table-wrapper--flush">
          <table className="admin-data-table admin-mentor-interest-table">
            <thead>
              <tr>
                <th>
                  Person
                </th>

                <th>
                  Email
                </th>

                <th>
                  Progress
                </th>

                <th>
                  Registered
                </th>
              </tr>
            </thead>

            <tbody>
              {registrations.map(
                (
                  person,
                ) => (
                  <tr
                    key={
                      person.id
                    }
                  >
                    <td>
                      <strong>
                        {person.full_name ||
                          "Name not provided"}
                      </strong>
                    </td>

                    <td>
                      {
                        person.email
                      }
                    </td>

                    <td>
                      <RegistrationProgress
                        person={
                          person
                        }
                      />
                    </td>

                    <td>
                      {formatDate(
                        person.created_at,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
    </section>
  );
}

function RegistrationProgress({
  person,
}) {
  if (
    person.account_status ===
    "rejected"
  ) {
    return (
      <StatusBadge
        value="rejected"
        label="Registration rejected"
      />
    );
  }

  if (
    !person.email_verified
  ) {
    return (
      <StatusBadge
        value="pending"
        label="Email verification pending"
      />
    );
  }

  return (
    <StatusBadge
      value="pending"
      label="Application not submitted"
    />
  );
}

function SubmittedApplications({
  canRecommendApplications,
  canSecondSignoffApplications,
  isFullAccessAdmin,
  canVerifyMembership,
  adminOperationalRole,
}) {
  const [
    applications,
    setApplications,
  ] = useState([]);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    selectedApplication,
    setSelectedApplication,
  ] = useState(null);

  const [
    reviewMode,
    setReviewMode,
  ] = useState("");

  const [
    feedback,
    setFeedback,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  async function loadApplications({
    keepModalOpen = false,
  } = {}) {
    if (
      !keepModalOpen
    ) {
      setLoading(true);
    }

    setError("");

    const {
      data,
      error: applicationError,
    } = await supabase
      .from(
        "mentor_applications",
      )
      .select(`
        id,
        applicant_user_id,
        biography,
        job_title,
        organisation,
        expertise,
        mentorship_categories,
        languages,
        meeting_formats,
        session_lengths,
        maximum_active_mentees,
        years_of_experience,
        membership_verification_method,
        membership_reference,
        status,
        admin_feedback,
        reviewed_at,
        reviewed_by,
        approved_at,
        mentor_account_id,
        onboarding_recommendation,
        onboarding_feedback,
        onboarding_reviewed_at,
        onboarding_reviewed_by,
        operations_decision,
        operations_feedback,
        operations_reviewed_at,
        operations_reviewed_by,
        created_at,
        updated_at,
        applicant:profiles!mentor_applications_applicant_user_id_fkey (
          id,
          full_name,
          email,
          phone_number,
          account_status,
          membership_verified,
          email_verified,
          membership_verification_method,
          membership_reference,
          profile_photo_url
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (applicationError) {
      console.error(
        "Unable to load mentor applications:",
        applicationError,
      );

      setError(
        "We could not load mentor applications.",
      );

      setLoading(false);

      return;
    }

    const rawApplications =
      data ?? [];

    const reviewerIds = [
      ...new Set(
        rawApplications
          .flatMap(
            (
              application,
            ) => [
              application.onboarding_reviewed_by,
              application.operations_reviewed_by,
            ],
          )
          .filter(Boolean),
      ),
    ];

    let reviewerMap =
      new Map();

    if (
      reviewerIds.length >
      0
    ) {
      const {
        data: reviewerData,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email",
        )
        .in(
          "id",
          reviewerIds,
        );

      reviewerMap =
        new Map(
          (
            reviewerData ??
            []
          ).map(
            (
              reviewer,
            ) => [
              reviewer.id,
              reviewer,
            ],
          ),
        );
    }

    const nextApplications =
      rawApplications.map(
        (
          application,
        ) => ({
          ...application,

          onboarding_reviewer:
            reviewerMap.get(
              application.onboarding_reviewed_by,
            ) ??
            null,

          operations_reviewer:
            reviewerMap.get(
              application.operations_reviewed_by,
            ) ??
            null,
        }),
      );

    setApplications(
      nextApplications,
    );

    if (
      keepModalOpen &&
      selectedApplication
    ) {
      setSelectedApplication(
        nextApplications.find(
          (
            application,
          ) =>
            application.id ===
            selectedApplication.id,
        ) ??
          null,
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
  ]);

  const filteredApplications =
    useMemo(() => {
      const searchValue =
        searchTerm
          .trim()
          .toLowerCase();

      return applications.filter(
        (
          application,
        ) => {
          if (
            statusFilter !==
              "all" &&
            application.status !==
              statusFilter
          ) {
            return false;
          }

          if (
            !searchValue
          ) {
            return true;
          }

          return [
            application.applicant
              ?.full_name,

            application.applicant
              ?.email,

            application.job_title,

            application.organisation,

            application.status,

            ...(
              application.mentorship_categories ??
              []
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(
              searchValue,
            );
        },
      );
    }, [
      applications,
      searchTerm,
      statusFilter,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredApplications.length /
          APPLICATION_PAGE_SIZE,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const firstIndex =
    (safePage - 1) *
    APPLICATION_PAGE_SIZE;

  const visibleApplications =
    filteredApplications.slice(
      firstIndex,
      firstIndex +
        APPLICATION_PAGE_SIZE,
    );

  function canTakeAction(
    application,
  ) {
    if (
      application.status !==
      "pending"
    ) {
      return false;
    }

    if (
      !application.onboarding_recommendation
    ) {
      return (
        canRecommendApplications ||
        isFullAccessAdmin
      );
    }

    if (
      !application.operations_decision
    ) {
      return (
        canSecondSignoffApplications ||
        isFullAccessAdmin
      );
    }

    return false;
  }

  async function submitReview(
    action,
  ) {
    if (
      !selectedApplication ||
      selectedApplication.status !==
        "pending"
    ) {
      return;
    }

    const recommendationAction =
      [
        "recommend_approve",
        "recommend_reject",
      ].includes(
        action,
      );

    const finalAction =
      [
        "approve",
        "reject",
      ].includes(
        action,
      );

    if (
      recommendationAction &&
      !(
        canRecommendApplications ||
        isFullAccessAdmin
      )
    ) {
      setError(
        "Your administrator role cannot record the Mentor Onboarding recommendation.",
      );

      return;
    }

    if (
      finalAction &&
      !(
        canSecondSignoffApplications ||
        isFullAccessAdmin
      )
    ) {
      setError(
        "Your administrator role cannot record the final Operations and Governance decision.",
      );

      return;
    }

    if (
      finalAction &&
      !selectedApplication
        .onboarding_recommendation &&
      !isFullAccessAdmin
    ) {
      setError(
        "The Mentor Onboarding recommendation must be recorded before the final Operations and Governance decision.",
      );

      return;
    }

    if (
      [
        "recommend_reject",
        "reject",
      ].includes(
        action,
      ) &&
      !feedback.trim()
    ) {
      setReviewMode(
        action,
      );

      setError(
        "Please provide a clear reason for the rejection.",
      );

      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    const {
      error: reviewError,
    } = await supabase.rpc(
      "admin_review_mentor_application",
      {
        p_application_id:
          selectedApplication.id,

        p_action:
          action,

        p_feedback:
          [
            "recommend_reject",
            "reject",
          ].includes(
            action,
          )
            ? feedback.trim()
            : null,
      },
    );

    if (reviewError) {
      console.error(
        "Unable to review mentor application:",
        reviewError,
      );

      setError(
        reviewError.message ||
          "We could not update this mentor application.",
      );

      setProcessing(false);

      return;
    }

    const messages = {
      recommend_approve:
        "Approval recommended. The application is ready for Operations and Governance sign-off.",

      recommend_reject:
        "Rejection recommended. The application is ready for Operations and Governance sign-off.",

      approve:
        "The mentor application has received final approval.",

      reject:
        "The mentor application has been rejected.",
    };

    setSuccess(
      messages[action] ||
        "The application was updated.",
    );

    setReviewMode("");
    setFeedback("");

    await loadApplications({
      keepModalOpen:
        true,
    });

    setProcessing(false);
  }

  if (loading) {
    return (
      <section className="admin-list-section">
        <AdminLoadingState />
      </section>
    );
  }

  return (
    <>
      <section className="admin-list-section admin-submitted-applications-section">
        <div className="admin-workflow-section-heading">
          <div>
            <span>
              MENTOR APPLICATIONS
            </span>

            <h2>
              Submitted mentor applications
            </h2>

            <p>
              Submitted mentor applications appear here. Review the mentor’s details, confirm the membership check, record the Mentor Onboarding recommendation, and complete the Operations and Governance decision.
            </p>
          </div>
        </div>

        <div className="admin-application-toolbar">
          <div className="admin-search-field">
            <Search
              size={16}
              aria-hidden="true"
            />

            <input
              type="search"
              value={
                searchTerm
              }
              placeholder="Search applicant or email"
              aria-label="Search mentor applications"
              onChange={(
                event,
              ) =>
                setSearchTerm(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="admin-application-filters">
            {[
              [
                "all",
                "All",
              ],
              [
                "pending",
                "Pending",
              ],
              [
                "approved",
                "Approved",
              ],
              [
                "rejected",
                "Rejected",
              ],
            ].map(
              ([
                value,
                label,
              ]) => (
                <button
                  key={
                    value
                  }
                  type="button"
                  className={
                    statusFilter ===
                    value
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setStatusFilter(
                      value,
                    )
                  }
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>

        {success && (
          <p className="admin-success-message">
            {success}
          </p>
        )}

        {error &&
          !selectedApplication && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}

        {applications.length ===
        0 ? (
          <AdminEmptyState
            title="No submitted mentor applications"
            description="Mentor applications will appear here after the applicant completes and submits the mentor application form."
          />
        ) : filteredApplications.length ===
          0 ? (
          <AdminEmptyState
            title="No matching applications"
            description="Try another search term or status filter."
          />
        ) : (
          <div className="admin-application-table-shell">
            <div className="admin-table-wrapper admin-table-wrapper--flush">
              <table className="admin-data-table admin-application-table">
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Membership check</th>
                    <th>Current role</th>
                    <th>Experience</th>
                    <th>Mentoring areas</th>
                    <th>Review stage</th>
                    <th>Decision status</th>
                    <th>Submitted</th>
                    <th aria-label="Action" />
                  </tr>
                </thead>

                <tbody>
                  {visibleApplications.map(
                    (
                      application,
                    ) => (
                      <tr
                        key={
                          application.id
                        }
                      >
                        <td>
                          <strong>
                            {application.applicant
                              ?.full_name ||
                              "Name not provided"}
                          </strong>

                          <small>
                            {application.applicant
                              ?.email ||
                              ""}
                          </small>
                        </td>

                        <td>
                          <StatusBadge
                            value={
                              application.applicant
                                ?.membership_verified
                                ? "verified"
                                : "not_verified"
                            }
                            label={
                              application.applicant
                                ?.membership_verified
                                ? "Verified"
                                : "Not verified"
                            }
                          />
                        </td>

                        <td>
                          {application.job_title ||
                            "Not provided"}

                          {application.organisation && (
                            <small>
                              {
                                application.organisation
                              }
                            </small>
                          )}
                        </td>

                        <td>
                          {application.years_of_experience ??
                            0}{" "}
                          years
                        </td>

                        <td className="admin-application-areas-cell">
                          {(
                            application.mentorship_categories ??
                            []
                          )
                            .slice(
                              0,
                              3,
                            )
                            .join(
                              ", ",
                            ) ||
                            "Not provided"}
                        </td>

                        <td>
                          {getApplicationReviewStageLabel(
                            application,
                          )}
                        </td>

                        <td>
                          <StatusBadge
                            value={
                              application.status
                            }
                            label={
                              application.status ===
                              "pending"
                                ? "Pending review"
                                : undefined
                            }
                          />
                        </td>

                        <td>
                          {formatDate(
                            application.created_at,
                          )}
                        </td>

                        <td className="admin-table-action-cell">
                          <button
                            type="button"
                            className="admin-review-button"
                            onClick={() => {
                              setSelectedApplication(
                                application,
                              );

                              setReviewMode(
                                "",
                              );

                              setFeedback(
                                "",
                              );

                              setError(
                                "",
                              );

                              setSuccess(
                                "",
                              );
                            }}
                          >
                            {canTakeAction(
                              application,
                            )
                              ? "Review"
                              : "View"}
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-table-pagination">
              <p>
                Showing{" "}
                {filteredApplications.length ===
                0
                  ? 0
                  : firstIndex +
                    1}
                -
                {Math.min(
                  firstIndex +
                    APPLICATION_PAGE_SIZE,
                  filteredApplications.length,
                )}{" "}
                of{" "}
                {
                  filteredApplications.length
                }
              </p>

              <div className="admin-pagination-controls">
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
                    safePage ===
                    1
                  }
                >
                  <ChevronLeft
                    size={16}
                  />
                  Previous
                </button>

                <span>
                  Page {safePage} of {totalPages}
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
                    size={16}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {selectedApplication && (
        <ApplicationReviewModal
          application={
            selectedApplication
          }
          reviewMode={
            reviewMode
          }
          setReviewMode={
            setReviewMode
          }
          feedback={
            feedback
          }
          setFeedback={
            setFeedback
          }
          error={
            error
          }
          success={
            success
          }
          processing={
            processing
          }
          canRecommendApplications={
            canRecommendApplications
          }
          canSecondSignoffApplications={
            canSecondSignoffApplications
          }
          isFullAccessAdmin={
            isFullAccessAdmin
          }
          adminOperationalRole={
            adminOperationalRole
          }
          onSubmitReview={
            submitReview
          }
          onClose={() => {
            if (
              !processing
            ) {
              setSelectedApplication(
                null,
              );

              setReviewMode(
                "",
              );

              setFeedback(
                "",
              );

              setError(
                "",
              );

              setSuccess(
                "",
              );
            }
          }}
        />
      )}
    </>
  );
}

function ApplicationReviewModal({
  application,
  reviewMode,
  setReviewMode,
  feedback,
  setFeedback,
  error,
  success,
  processing,
  canRecommendApplications,
  canSecondSignoffApplications,
  isFullAccessAdmin,
  adminOperationalRole,
  onSubmitReview,
  onClose,
}) {
  useLockBodyScroll(true);

  const isPending =
    application.status ===
    "pending";

  const onboardingComplete =
    Boolean(
      application.onboarding_recommendation,
    );

  const finalDecisionComplete =
    Boolean(
      application.operations_decision,
    ) ||
    [
      "approved",
      "rejected",
    ].includes(
      application.status,
    );

  /*
    This restores the mentor review experience used before
    the separate membership-verification action was added.

    Full-access administrators can see both review action groups.
    Scoped administrators only see actions allowed by their role.
  */
  const canMakeOnboardingRecommendation =
    isPending &&
    !onboardingComplete &&
    (
      canRecommendApplications ||
      isFullAccessAdmin
    );

  const canMakeFinalDecision =
    isPending &&
    !finalDecisionComplete &&
    (
      canSecondSignoffApplications ||
      isFullAccessAdmin
    ) &&
    (
      onboardingComplete ||
      isFullAccessAdmin
    );

  return (
    <div
      className="admin-mentor-review-backdrop"
      role="presentation"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !processing
        ) {
          onClose();
        }
      }}
    >
      <aside
        className="admin-mentor-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-application-review-title"
      >
        <header className="admin-mentor-review-header">
          <div className="admin-mentor-review-person">
            {application.applicant
              ?.profile_photo_url ? (
              <img
                src={
                  application.applicant
                    .profile_photo_url
                }
                alt=""
              />
            ) : (
              <span className="admin-mentor-review-avatar">
                {getInitials(
                  application.applicant
                    ?.full_name,
                )}
              </span>
            )}

            <div>
              <span className="admin-section-eyebrow">
                MENTOR APPLICATION
              </span>

              <h2 id="mentor-application-review-title">
                {application.applicant
                  ?.full_name ||
                  "Applicant"}
              </h2>

              <p>
                {application.applicant
                  ?.email ||
                  ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="admin-mentor-review-close"
            onClick={
              onClose
            }
            disabled={
              processing
            }
            aria-label="Close application review"
          >
            <X size={18} />
          </button>
        </header>

        <div className="admin-mentor-review-body">
          <div className="admin-mentor-review-status-row">
            <StatusBadge
              value={
                application.status
              }
              label={
                application.status ===
                "pending"
                  ? "Pending review"
                  : undefined
              }
            />

            <span>
              {getApplicationReviewStageLabel(
                application,
              )}{" "}
              · Submitted{" "}
              {formatDate(
                application.created_at,
              )}
            </span>
          </div>

          {isFullAccessAdmin && (
            <section className="admin-mentor-review-callout">
              <strong>
                Full Access Admin
              </strong>

              <p>
                You can perform either review stage. Your access is not restricted by an operational role.
              </p>
            </section>
          )}

          {!isFullAccessAdmin &&
            adminOperationalRole && (
              <section className="admin-mentor-review-callout">
                <strong>
                  Your administrator role
                </strong>

                <p>
                  {formatAdminOperationalRole(
                    adminOperationalRole,
                  )}
                </p>
              </section>
            )}

          <section className="admin-mentor-review-section">
            <h3>
              Membership verification information
            </h3>

            <div className="admin-mentor-review-details-grid">
              <ReviewDetail
                label="Verification method"
                value={formatMembershipVerificationMethod(
                  application.membership_verification_method ||
                    application.applicant
                      ?.membership_verification_method,
                )}
              />

              <ReviewDetail
                label="Information supplied"
                value={
                  application.membership_reference ||
                  application.applicant
                    ?.membership_reference ||
                  (
                    (
                      application.membership_verification_method ||
                      application.applicant
                        ?.membership_verification_method
                    ) ===
                    "manual_admin_review"
                      ? "Manual administration review requested"
                      : "Not provided"
                  )
                }
              />

              <ReviewDetail
                label="Email"
                value={
                  application.applicant
                    ?.email ||
                  "Not provided"
                }
              />

              <ReviewDetail
                label="Email verification"
                value={
                  application.applicant
                    ?.email_verified === true
                    ? "Verified"
                    : application.applicant
                        ?.email_verified === false
                      ? "Not verified"
                      : "Not available"
                }
              />
            </div>
          </section>

          <section className="admin-mentor-review-section">
            <h3>
              Professional information
            </h3>

            <div className="admin-mentor-review-details-grid">
              <ReviewDetail
                label="Current role"
                value={
                  application.job_title ||
                  "Not provided"
                }
              />

              <ReviewDetail
                label="Organisation"
                value={
                  application.organisation ||
                  "Not provided"
                }
              />

              <ReviewDetail
                label="Experience"
                value={`${application.years_of_experience ?? 0} years`}
              />

              <ReviewDetail
                label="Maximum active mentees"
                value={
                  application.maximum_active_mentees ??
                  "Not provided"
                }
              />

              <ReviewDetail
                label="Meeting format"
                value={(
                  application.meeting_formats ??
                  []
                ).join(
                  ", ",
                )}
              />

              <ReviewDetail
                label="Session length"
                value={(
                  application.session_lengths ??
                  []
                )
                  .map(
                    (
                      length,
                    ) =>
                      Number(
                        length,
                      ) === 60
                        ? "1 hour"
                        : `${length} minutes`,
                  )
                  .join(
                    ", ",
                  )}
              />
            </div>
          </section>

          <ReviewList
            label="Mentoring areas"
            items={
              application.mentorship_categories
            }
          />

          <ReviewList
            label="Languages"
            items={
              application.languages
            }
          />

          <section className="admin-mentor-review-section">
            <h3>
              Biography
            </h3>

            <p className="admin-mentor-review-biography">
              {application.biography ||
                "Not provided"}
            </p>
          </section>

          <section className="admin-mentor-review-stage-card">
            <span>
              STAGE 1
            </span>

            <h3>
              Mentor Onboarding recommendation
            </h3>

            {onboardingComplete ? (
              <>
                <p>
                  Recommendation:{" "}

                  <strong>
                    {application.onboarding_recommendation ===
                    "approve"
                      ? "Recommend approval"
                      : "Recommend rejection"}
                  </strong>
                </p>

                <p>
                  Reviewed by{" "}

                  <strong>
                    {application.onboarding_reviewer
                      ?.full_name ||
                      application.onboarding_reviewer
                        ?.email ||
                      "Administrator"}
                  </strong>

                  {application.onboarding_reviewed_at
                    ? ` on ${formatDate(
                        application.onboarding_reviewed_at,
                      )}.`
                    : "."}
                </p>

                {application.onboarding_feedback && (
                  <p>
                    {
                      application.onboarding_feedback
                    }
                  </p>
                )}
              </>
            ) : (
              <p>
                No recommendation has been recorded yet.
              </p>
            )}

            {canMakeOnboardingRecommendation && (
              <ReviewActionBox
                rejectionMode={
                  reviewMode ===
                  "recommend_reject"
                }
                feedback={
                  feedback
                }
                setFeedback={
                  setFeedback
                }
                processing={
                  processing
                }
                rejectLabel="Recommend rejection"
                approveLabel="Recommend approval"
                onCancel={() => {
                  setReviewMode(
                    "",
                  );

                  setFeedback(
                    "",
                  );
                }}
                onRejectStart={() => {
                  setReviewMode(
                    "recommend_reject",
                  );

                  setFeedback(
                    "",
                  );
                }}
                onReject={() =>
                  onSubmitReview(
                    "recommend_reject",
                  )
                }
                onApprove={() =>
                  onSubmitReview(
                    "recommend_approve",
                  )
                }
              />
            )}
          </section>

          <section className="admin-mentor-review-stage-card">
            <span>
              STAGE 2
            </span>

            <h3>
              Operations and Governance decision
            </h3>

            {finalDecisionComplete ? (
              <>
                <p>
                  Final decision:{" "}

                  <strong>
                    {application.status ===
                    "approved"
                      ? "Approved"
                      : "Rejected"}
                  </strong>
                </p>

                <p>
                  Reviewed by{" "}

                  <strong>
                    {application.operations_reviewer
                      ?.full_name ||
                      application.operations_reviewer
                        ?.email ||
                      "Administrator"}
                  </strong>

                  {application.operations_reviewed_at
                    ? ` on ${formatDate(
                        application.operations_reviewed_at,
                      )}.`
                    : "."}
                </p>

                {(application.operations_feedback ||
                  application.admin_feedback) && (
                  <p>
                    {application.operations_feedback ||
                      application.admin_feedback}
                  </p>
                )}
              </>
            ) : onboardingComplete ? (
              <p>
                The application is ready for Operations and Governance sign-off.
              </p>
            ) : isFullAccessAdmin ? (
              <p>
                No onboarding recommendation has been recorded. As a Full Access Admin, you can still see the final-decision actions.
              </p>
            ) : (
              <p>
                Waiting for the Mentor Onboarding recommendation.
              </p>
            )}

            {canMakeFinalDecision && (
              <ReviewActionBox
                rejectionMode={
                  reviewMode ===
                  "reject"
                }
                feedback={
                  feedback
                }
                setFeedback={
                  setFeedback
                }
                processing={
                  processing
                }
                rejectLabel="Reject"
                approveLabel="Final approval"
                onCancel={() => {
                  setReviewMode(
                    "",
                  );

                  setFeedback(
                    "",
                  );
                }}
                onRejectStart={() => {
                  setReviewMode(
                    "reject",
                  );

                  setFeedback(
                    "",
                  );
                }}
                onReject={() =>
                  onSubmitReview(
                    "reject",
                  )
                }
                onApprove={() =>
                  onSubmitReview(
                    "approve",
                  )
                }
              />
            )}
          </section>

          {success && (
            <p className="admin-success-message">
              {success}
            </p>
          )}

          {error && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="admin-mentor-review-footer">
          <button
            type="button"
            className="admin-drawer-secondary"
            onClick={
              onClose
            }
            disabled={
              processing
            }
          >
            Close
          </button>
        </footer>
      </aside>
    </div>
  );
}

function ReviewActionBox({
  rejectionMode,
  feedback,
  setFeedback,
  processing,
  rejectLabel,
  approveLabel,
  approveDisabled = false,
  approveDisabledMessage = "",
  onCancel,
  onRejectStart,
  onReject,
  onApprove,
}) {
  return (
    <div className="admin-mentor-review-actions-box">
      {rejectionMode && (
        <label className="admin-rejection-field">
          <span>
            Reason for rejection
          </span>

          <textarea
            value={
              feedback
            }
            onChange={(
              event,
            ) =>
              setFeedback(
                event.target.value,
              )
            }
            rows="4"
            placeholder="Provide a clear reason for this decision."
            disabled={
              processing
            }
          />
        </label>
      )}

      {approveDisabledMessage && (
        <p className="admin-mentor-review-action-warning">
          {
            approveDisabledMessage
          }
        </p>
      )}

      <div className="admin-mentor-review-inline-actions">
        {rejectionMode ? (
          <>
            <button
              type="button"
              className="admin-drawer-secondary"
              onClick={
                onCancel
              }
              disabled={
                processing
              }
            >
              Cancel
            </button>

            <button
              type="button"
              className="admin-drawer-danger"
              onClick={
                onReject
              }
              disabled={
                processing
              }
            >
              {processing
                ? "Saving..."
                : rejectLabel}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="admin-drawer-secondary-danger"
              onClick={
                onRejectStart
              }
              disabled={
                processing
              }
            >
              {rejectLabel}
            </button>

            <button
              type="button"
              className="admin-drawer-primary"
              onClick={
                onApprove
              }
              disabled={
                processing ||
                approveDisabled
              }
            >
              {processing
                ? "Saving..."
                : approveLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewDetail({
  label,
  value,
}) {
  return (
    <div className="admin-mentor-review-detail">
      <span>
        {label}
      </span>

      <strong>
        {value ||
          "Not provided"}
      </strong>
    </div>
  );
}

function ReviewList({
  label,
  items = [],
}) {
  return (
    <section className="admin-mentor-review-section">
      <h3>
        {label}
      </h3>

      {items?.length >
      0 ? (
        <div className="admin-mentor-review-chip-list">
          {items.map(
            (
              item,
            ) => (
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
      ) : (
        <p className="admin-mentor-review-biography">
          Not provided
        </p>
      )}
    </section>
  );
}

function StatusBadge({
  value,
  label,
}) {
  const normalizedValue =
    String(
      value ||
        "unknown",
    ).replaceAll(
      "_",
      "-",
    );

  return (
    <span
      className={`admin-status-badge status-${normalizedValue}`}
    >
      <i
        className="admin-status-dot"
        aria-hidden="true"
      />

      <span>
        {label ||
          formatStatusLabel(
            value,
          )}
      </span>
    </span>
  );
}

function AdminLoadingState() {
  return (
    <section className="admin-state-card">
      <div className="loader" />

      <p>
        Loading information...
      </p>
    </section>
  );
}

function AdminEmptyState({
  title,
  description,
}) {
  return (
    <section className="admin-state-card">
      <span className="empty-state-icon">
        <ClipboardCheck
          size={28}
        />
      </span>

      <h2>
        {title}
      </h2>

      <p>
        {description}
      </p>
    </section>
  );
}

function getApplicationReviewStageLabel(
  application,
) {
  if (
    application.status ===
    "approved"
  ) {
    return "Completed · Approved";
  }

  if (
    application.status ===
    "rejected"
  ) {
    return "Completed · Rejected";
  }

  if (
    application.onboarding_recommendation
  ) {
    return "Operations & Governance sign-off";
  }

  return "Mentor Onboarding review";
}

function formatMembershipVerificationMethod(
  value,
) {
  const labels = {
    service_unit:
      "Service unit or department",

    leader_reference:
      "TCN leader reference",

    manual_admin_review:
      "Manual administrator review",
  };

  return (
    labels[value] ||
    "Not provided"
  );
}

function formatAdminOperationalRole(
  role,
) {
  const labels = {
    product_technology_lead:
      "Product and Technology Lead",

    operations_governance_lead:
      "Operations and Governance Lead",

    mentor_onboarding_vetting_training_lead:
      "Mentor Onboarding, Vetting and Training Lead",

    mentee_matching_engagement_quality_lead:
      "Mentee Matching, Engagement and Quality Lead",

    trust_safety_case_resolution_lead:
      "Trust, Safety and Case Resolution Lead",

    full_access_admin:
      "Full Access Admin",
  };

  return (
    labels[role] ||
    formatStatusLabel(
      role,
    )
  );
}

function formatStatusLabel(
  status,
) {
  return String(
    status ||
      "unknown",
  )
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (
        character,
      ) =>
        character.toUpperCase(),
    );
}

function formatDate(
  value,
) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(
      value,
    ),
  );
}

function getInitials(
  name,
) {
  return String(
    name ||
      "MC",
  )
    .split(" ")
    .filter(Boolean)
    .slice(
      0,
      2,
    )
    .map(
      (
        part,
      ) =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join("");
}

export default AdminMentorApplications;
