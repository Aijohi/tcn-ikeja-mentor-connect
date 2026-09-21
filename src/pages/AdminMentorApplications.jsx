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
  adminOperationalRole = "",
}) {
  return (
    <div className="admin-mentor-workflow-page">
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

/* =========================================================
   SUBMITTED APPLICATIONS
========================================================= */

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
    rejectionOpen,
    setRejectionOpen,
  ] = useState(false);

  const [
    rejectionReason,
    setRejectionReason,
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

  const canDecideApplications =
    isFullAccessAdmin ||
    canRecommendApplications ||
    canSecondSignoffApplications;

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
          .map(
            (
              application,
            ) =>
              application.reviewed_by,
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

          reviewer:
            reviewerMap.get(
              application.reviewed_by,
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

  function openReview(
    application,
  ) {
    setSelectedApplication(
      application,
    );

    setError("");
    setSuccess("");
    setRejectionOpen(false);
    setRejectionReason("");
  }

  function closeReview() {
    if (processing) {
      return;
    }

    setSelectedApplication(
      null,
    );

    setError("");
    setSuccess("");
    setRejectionOpen(false);
    setRejectionReason("");
  }

  async function submitDecision(
    action,
    reason = null,
  ) {
    if (
      !selectedApplication ||
      selectedApplication.status !==
        "pending" ||
      processing
    ) {
      return;
    }

    if (
      !canDecideApplications
    ) {
      setError(
        "Your administrator role can view this application but cannot make the mentor decision.",
      );

      return;
    }

    if (
      action === "reject" &&
      !String(
        reason ||
          "",
      ).trim()
    ) {
      setError(
        "Please provide a reason for declining this mentor application.",
      );

      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    const {
      error: decisionError,
    } = await supabase.rpc(
      "admin_decide_mentor_application",
      {
        p_application_id:
          selectedApplication.id,

        p_decision:
          action,

        p_reason:
          action === "reject"
            ? String(
                reason,
              ).trim()
            : null,
      },
    );

    if (
      decisionError
    ) {
      console.error(
        "Unable to review mentor application:",
        decisionError,
      );

      setError(
        decisionError.message ||
          "We could not save this mentor decision.",
      );

      setProcessing(false);
      return;
    }

    setSuccess(
      action === "approve"
        ? "The mentor application has been approved."
        : "The mentor application has been declined.",
    );

    setRejectionOpen(false);
    setRejectionReason("");

    await loadApplications({
      keepModalOpen:
        true,
    });

    setProcessing(false);
  }

  const filteredApplications =
    useMemo(() => {
      const query =
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

          if (!query) {
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
              query,
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
                "Declined",
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
            description="Mentor applications will appear here after applicants complete and submit the form."
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
                          <StatusBadge
                            value={
                              application.status
                            }
                            label={
                              application.status ===
                              "pending"
                                ? "Pending review"
                                : application.status ===
                                    "rejected"
                                  ? "Declined"
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
                            onClick={() =>
                              openReview(
                                application,
                              )
                            }
                          >
                            {application.status ===
                            "pending"
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
        <ApplicationReviewModal
          application={
            selectedApplication
          }
          canDecideApplications={
            canDecideApplications
          }
          adminOperationalRole={
            adminOperationalRole
          }
          isFullAccessAdmin={
            isFullAccessAdmin
          }
          processing={
            processing
          }
          error={
            error
          }
          success={
            success
          }
          onApprove={() =>
            submitDecision(
              "approve",
            )
          }
          onDecline={() => {
            setError("");
            setRejectionReason("");
            setRejectionOpen(
              true,
            );
          }}
          onClose={
            closeReview
          }
        />
      )}

      {selectedApplication &&
        rejectionOpen && (
          <DeclineApplicationModal
            application={
              selectedApplication
            }
            reason={
              rejectionReason
            }
            setReason={
              setRejectionReason
            }
            processing={
              processing
            }
            error={
              error
            }
            onCancel={() => {
              if (
                !processing
              ) {
                setRejectionOpen(
                  false,
                );
                setRejectionReason(
                  "",
                );
                setError("");
              }
            }}
            onConfirm={() =>
              submitDecision(
                "reject",
                rejectionReason,
              )
            }
          />
        )}
    </>
  );
}

/* =========================================================
   APPLICATION REVIEW MODAL
========================================================= */

function ApplicationReviewModal({
  application,
  canDecideApplications,
  adminOperationalRole,
  isFullAccessAdmin,
  processing,
  error,
  success,
  onApprove,
  onDecline,
  onClose,
}) {
  useLockBodyScroll(true);

  const isPending =
    application.status ===
    "pending";

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
      <section
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
                  : application.status ===
                      "rejected"
                    ? "Declined"
                    : undefined
              }
            />

            <span>
              Submitted{" "}
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
                You can review this mentor application and approve or decline it.
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
              Membership information
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
                      ? "Manual administrator review requested"
                      : "Not provided"
                  )
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
                label="Mobile number"
                value={
                  application.applicant
                    ?.phone_number ||
                  "Not provided"
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

          {!isPending && (
            <section className="admin-mentor-decision-summary">
              <span>
                DECISION
              </span>

              <h3>
                {application.status ===
                "approved"
                  ? "Application approved"
                  : "Application declined"}
              </h3>

              <p>
                Reviewed by{" "}

                <strong>
                  {application.reviewer
                    ?.full_name ||
                    application.reviewer
                      ?.email ||
                    "Administrator"}
                </strong>

                {application.reviewed_at
                  ? ` on ${formatDate(
                      application.reviewed_at,
                    )}.`
                  : "."}
              </p>

              {application.status ===
                "rejected" &&
                application.admin_feedback && (
                  <div className="admin-mentor-decline-reason">
                    <span>
                      Reason
                    </span>

                    <p>
                      {
                        application.admin_feedback
                      }
                    </p>
                  </div>
                )}
            </section>
          )}

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

          {isPending &&
            !canDecideApplications && (
              <section className="admin-mentor-review-callout">
                <strong>
                  View only
                </strong>

                <p>
                  Your administrator role can view this application but cannot approve or decline it.
                </p>
              </section>
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

          {isPending &&
            canDecideApplications && (
              <div className="admin-mentor-review-footer-actions">
                <button
                  type="button"
                  className="admin-drawer-secondary-danger"
                  onClick={
                    onDecline
                  }
                  disabled={
                    processing
                  }
                >
                  Decline
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
                    : "Approve"}
                </button>
              </div>
            )}
        </footer>
      </section>
    </div>
  );
}

/* =========================================================
   DECLINE REASON MODAL
========================================================= */

function DeclineApplicationModal({
  application,
  reason,
  setReason,
  processing,
  error,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="admin-decline-modal-backdrop"
      role="presentation"
    >
      <section
        className="admin-decline-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-mentor-title"
      >
        <header>
          <div>
            <span>
              DECLINE APPLICATION
            </span>

            <h2 id="decline-mentor-title">
              Give a reason
            </h2>

            <p>
              Tell{" "}
              {application.applicant
                ?.full_name ||
                "the applicant"}{" "}
              why this mentor application was not approved.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              processing
            }
            aria-label="Close decline modal"
          >
            <X size={18} />
          </button>
        </header>

        <div className="admin-decline-modal-body">
          <label>
            <span>
              Reason for declining
            </span>

            <textarea
              value={
                reason
              }
              onChange={(
                event,
              ) =>
                setReason(
                  event.target.value,
                )
              }
              rows="5"
              placeholder="Provide a clear and respectful reason."
              disabled={
                processing
              }
              autoFocus
            />
          </label>

          {error && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <footer>
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
              onConfirm
            }
            disabled={
              processing ||
              !reason.trim()
            }
          >
            {processing
              ? "Declining..."
              : "Decline application"}
          </button>
        </footer>
      </section>
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
