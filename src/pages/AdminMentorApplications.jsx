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
      <MentorMembershipQueue
        canVerifyMembership={
          canVerifyMembership
        }
      />

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
        adminOperationalRole={
          adminOperationalRole
        }
      />
    </div>
  );
}

function MentorMembershipQueue({
  canVerifyMembership,
}) {
  const [
    registrations,
    setRegistrations,
  ] = useState([]);

  const [
    selectedRegistration,
    setSelectedRegistration,
  ] = useState(null);

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

  async function loadRegistrations() {
    setLoading(true);
    setError("");

    const {
      data,
      error: registrationError,
    } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone_number,
        signup_intent,
        account_status,
        membership_verified,
        membership_verification_method,
        membership_reference,
        email_verified,
        onboarding_completed,
        created_at
      `)
      .eq(
        "signup_intent",
        "mentor",
      )
      .eq(
        "account_status",
        "pending",
      )
      .eq(
        "email_verified",
        true,
      )
      .eq(
        "onboarding_completed",
        true,
      )
      .or(
        "membership_verified.eq.false,membership_verified.is.null",
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (registrationError) {
      console.error(
        "Unable to load mentor membership verification requests:",
        registrationError,
      );

      setError(
        "We could not load mentor membership verification requests.",
      );

      setLoading(false);

      return;
    }

    setRegistrations(
      data ?? [],
    );

    setLoading(false);
  }

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function reviewMembership(
    action,
  ) {
    if (
      !selectedRegistration ||
      processing
    ) {
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    const {
      error: reviewError,
    } = await supabase.rpc(
      "admin_review_mentor_membership",
      {
        p_user_id:
          selectedRegistration.id,

        p_action:
          action,
      },
    );

    if (reviewError) {
      console.error(
        "Unable to review mentor membership:",
        reviewError,
      );

      setError(
        reviewError.message ||
          "We could not update this mentor membership request.",
      );

      setProcessing(false);

      return;
    }

    setSuccess(
      action === "verify"
        ? "The mentor membership has been verified."
        : "The mentor membership has been rejected.",
    );

    setSelectedRegistration(
      null,
    );

    await loadRegistrations();

    setProcessing(false);
  }

  return (
    <section className="admin-list-section admin-membership-queue-section">
      <div className="admin-workflow-section-heading">
        <div>
          <span>
            STAGE 1
          </span>

          <h2>
            Mentor membership verification
          </h2>

          <p>
            Review completed mentor registrations before the applicant moves through the mentor approval process.
          </p>
        </div>

        <strong>
          {registrations.length}{" "}
          {registrations.length === 1
            ? "awaiting review"
            : "awaiting review"}
        </strong>
      </div>

      {success && (
        <p className="admin-success-message">
          {success}
        </p>
      )}

      {error &&
        !selectedRegistration && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

      {loading ? (
        <AdminLoadingState />
      ) : registrations.length ===
        0 ? (
        <AdminEmptyState
          title="No mentor membership requests"
          description="Mentors will appear here after they verify their email and complete the required mentor onboarding information."
        />
      ) : (
        <div className="admin-table-wrapper admin-table-wrapper--flush">
          <table className="admin-data-table admin-membership-queue-table">
            <thead>
              <tr>
                <th>
                  Applicant
                </th>

                <th>
                  Verification method
                </th>

                <th>
                  Information supplied
                </th>

                <th>
                  Email
                </th>

                <th>
                  Registered
                </th>

                <th aria-label="Action" />
              </tr>
            </thead>

            <tbody>
              {registrations.map(
                (
                  registration,
                ) => (
                  <tr
                    key={
                      registration.id
                    }
                  >
                    <td>
                      <strong>
                        {registration.full_name ||
                          "Name not provided"}
                      </strong>

                      <small>
                        {registration.email ||
                          ""}
                      </small>
                    </td>

                    <td>
                      {formatMembershipVerificationMethod(
                        registration.membership_verification_method,
                      )}
                    </td>

                    <td className="admin-membership-reference-cell">
                      {getMembershipReferenceText(
                        registration,
                      )}
                    </td>

                    <td>
                      <StatusBadge
                        value="verified"
                        label="Verified"
                      />
                    </td>

                    <td>
                      {formatDate(
                        registration.created_at,
                      )}
                    </td>

                    <td className="admin-table-action-cell">
                      <button
                        type="button"
                        className="admin-review-button"
                        onClick={() => {
                          setSelectedRegistration(
                            registration,
                          );

                          setError("");
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedRegistration && (
        <MembershipReviewDrawer
          registration={
            selectedRegistration
          }
          canVerifyMembership={
            canVerifyMembership
          }
          processing={
            processing
          }
          error={
            error
          }
          onConfirm={
            reviewMembership
          }
          onClose={() => {
            if (
              !processing
            ) {
              setSelectedRegistration(
                null,
              );

              setError("");
            }
          }}
        />
      )}
    </section>
  );
}

function MembershipReviewDrawer({
  registration,
  canVerifyMembership,
  processing,
  error,
  onConfirm,
  onClose,
}) {
  useLockBodyScroll(true);

  return (
    <div
      className="admin-review-drawer-backdrop"
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
        className="admin-review-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-membership-review-title"
      >
        <header className="admin-review-drawer-header">
          <div>
            <span className="admin-section-eyebrow">
              MENTOR MEMBERSHIP VERIFICATION
            </span>

            <h2 id="mentor-membership-review-title">
              {registration.full_name ||
                "Applicant"}
            </h2>

            <p>
              {registration.email ||
                ""}
            </p>
          </div>

          <button
            type="button"
            className="admin-review-drawer-close"
            onClick={
              onClose
            }
            disabled={
              processing
            }
            aria-label="Close membership review"
          >
            <X size={18} />
          </button>
        </header>

        <div className="admin-review-drawer-body">
          <section className="admin-review-drawer-section">
            <div className="admin-review-details-grid admin-membership-detail-grid">
              <ReviewDetail
                label="Verification method"
                value={formatMembershipVerificationMethod(
                  registration.membership_verification_method,
                )}
              />

              <ReviewDetail
                label="Information supplied"
                value={getMembershipReferenceText(
                  registration,
                )}
              />

              <ReviewDetail
                label="Mobile number"
                value={
                  registration.phone_number ||
                  "Not provided"
                }
              />

              <ReviewDetail
                label="Email verified"
                value={
                  registration.email_verified
                    ? "Yes"
                    : "No"
                }
              />

              <ReviewDetail
                label="Account status"
                value={formatStatusLabel(
                  registration.account_status,
                )}
              />

              <ReviewDetail
                label="Registered"
                value={formatDate(
                  registration.created_at,
                )}
              />
            </div>
          </section>

          {registration.membership_verification_method ===
            "manual_admin_review" && (
            <section className="admin-review-callout">
              <strong>
                Manual administrator review
              </strong>

              <p>
                No service unit or leader reference was supplied. Confirm the person's TCN Ikeja membership using the administration team's approved records or process.
              </p>
            </section>
          )}

          {error && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {!canVerifyMembership && (
            <section className="admin-review-callout">
              <strong>
                View only
              </strong>

              <p>
                Your administrator role can view this information but cannot make the membership decision.
              </p>
            </section>
          )}
        </div>

        <footer className="admin-review-drawer-footer">
          {canVerifyMembership ? (
            <>
              <button
                type="button"
                className="admin-drawer-secondary-danger"
                onClick={() =>
                  onConfirm(
                    "reject",
                  )
                }
                disabled={
                  processing
                }
              >
                {processing
                  ? "Please wait..."
                  : "Reject membership"}
              </button>

              <button
                type="button"
                className="admin-drawer-primary"
                onClick={() =>
                  onConfirm(
                    "verify",
                  )
                }
                disabled={
                  processing ||
                  !registration.email_verified
                }
              >
                {processing
                  ? "Please wait..."
                  : "Verify membership"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="admin-drawer-primary"
              onClick={
                onClose
              }
            >
              Close
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

function SubmittedApplications({
  canRecommendApplications,
  canSecondSignoffApplications,
  isFullAccessAdmin,
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
    keepDrawerOpen = false,
  } = {}) {
    if (
      !keepDrawerOpen
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

    if (
      applicationError
    ) {
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
        .from(
          "profiles",
        )
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
      keepDrawerOpen &&
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

    if (
      [
        "recommend_reject",
        "reject",
      ].includes(
        action,
      ) &&
      !feedback.trim()
    ) {
      setError(
        "Please provide a reason before continuing.",
      );

      setReviewMode(
        action,
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

        p_feedback: [
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
        "Approval has been recommended. The application is ready for Operations and Governance sign-off.",

      recommend_reject:
        "Rejection has been recommended. The application is ready for Operations and Governance sign-off.",

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
      keepDrawerOpen:
        true,
    });

    setProcessing(false);
  }

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
              application.expertise ??
              []
            ),

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
              STAGE 2
            </span>

            <h2>
              Submitted mentor applications
            </h2>

            <p>
              Review completed mentor applications, recommendations and final approval decisions.
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
              placeholder="Search applicant, email or expertise"
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
            description="Completed mentor applications will appear here."
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
                    <th>
                      Applicant
                    </th>

                    <th>
                      Current role
                    </th>

                    <th>
                      Experience
                    </th>

                    <th>
                      Mentoring areas
                    </th>

                    <th>
                      Review stage
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Submitted
                    </th>

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
                            application.expertise ??
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
                  Page{" "}
                  {
                    safePage
                  }{" "}
                  of{" "}
                  {
                    totalPages
                  }
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
        <ApplicationReviewDrawer
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

function ApplicationReviewDrawer({
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
      className="admin-review-drawer-backdrop"
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
        className="admin-review-drawer admin-application-review-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-application-review-title"
      >
        <header className="admin-review-drawer-header">
          <div className="admin-review-drawer-person">
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
              <span className="admin-review-drawer-avatar">
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
            className="admin-review-drawer-close"
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

        <div className="admin-review-drawer-body">
          <div className="admin-review-status-row">
            <StatusBadge
              value={
                application.status
              }
            />

            <span>
              {getApplicationReviewStageLabel(
                application,
              )}
            </span>
          </div>

          {isFullAccessAdmin && (
            <section className="admin-review-callout">
              <strong>
                Full Access Admin
              </strong>

              <p>
                You can perform either review stage as the platform's full-access administrator.
              </p>
            </section>
          )}

          {!isFullAccessAdmin &&
            adminOperationalRole && (
              <section className="admin-review-callout">
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

          <section className="admin-review-drawer-section">
            <h3>
              Membership information
            </h3>

            <div className="admin-review-details-grid">
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
                  "Not provided"
                }
              />

              <ReviewDetail
                label="Email verification"
                value={
                  application.applicant
                    ?.email_verified
                    ? "Verified"
                    : "Not verified"
                }
              />

              <ReviewDetail
                label="Membership"
                value={
                  application.applicant
                    ?.membership_verified
                    ? "Verified"
                    : "Not verified"
                }
              />
            </div>
          </section>

          <section className="admin-review-drawer-section">
            <h3>
              Professional information
            </h3>

            <div className="admin-review-details-grid">
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
            label="Areas of expertise"
            items={
              application.expertise
            }
          />

          <ReviewList
            label="Mentorship categories"
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

          <section className="admin-review-drawer-section">
            <h3>
              Biography
            </h3>

            <p className="admin-review-biography">
              {application.biography ||
                "Not provided"}
            </p>
          </section>

          <section className="admin-review-stage-card">
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
                onRejectStart={() =>
                  setReviewMode(
                    "recommend_reject",
                  )
                }
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

          <section className="admin-review-stage-card">
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
                No Stage 1 recommendation has been recorded yet. Full-access administrators may still make the final decision.
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
                rejectLabel="Reject application"
                approveLabel="Final approval"
                onCancel={() => {
                  setReviewMode(
                    "",
                  );

                  setFeedback(
                    "",
                  );
                }}
                onRejectStart={() =>
                  setReviewMode(
                    "reject",
                  )
                }
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

        <footer className="admin-review-drawer-footer admin-review-drawer-footer--single">
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
  onCancel,
  onRejectStart,
  onReject,
  onApprove,
}) {
  return (
    <div className="admin-review-actions-box">
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
            placeholder="Provide a clear reason."
            disabled={
              processing
            }
          />
        </label>
      )}

      <div className="admin-review-inline-actions">
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
                processing
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
    <div className="admin-review-detail">
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
    <section className="admin-review-drawer-section">
      <h3>
        {label}
      </h3>

      {items?.length >
      0 ? (
        <div className="admin-review-chip-list">
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
        <p className="admin-review-biography">
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

function getMembershipReferenceText(
  person,
) {
  if (
    person.membership_verification_method ===
    "manual_admin_review"
  ) {
    return "Manual administrator review requested";
  }

  return (
    person.membership_reference ||
    "Not provided"
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
    return "Awaiting Operations sign-off";
  }

  return "Awaiting Mentor Onboarding review";
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