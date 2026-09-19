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

function AdminMentorApplications({
  canRecommendApplications = false,
  canSecondSignoffApplications = false,
  isFullAccessAdmin = false,
  canVerifyMembership = false,
  adminOperationalRole = "",
}) {
  return (
    <div className="admin-mentor-workflow-page">
      <SubmittedApplications
        canRecommendApplications={canRecommendApplications}
        canSecondSignoffApplications={canSecondSignoffApplications}
        isFullAccessAdmin={isFullAccessAdmin}
        adminOperationalRole={adminOperationalRole}
      />
    </div>
  );
}

function MentorMembershipQueue({
  canVerifyMembership,
}) {
  const [registrations, setRegistrations] = useState([]);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRegistrations() {
    setLoading(true);
    setError("");

    const { data, error: registrationError } = await supabase
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
        created_at
      `)
      .eq("signup_intent", "mentor")
      .in("account_status", ["pending", "rejected"])
      .or("membership_verified.eq.false,membership_verified.is.null")
      .order("created_at", {
        ascending: false,
      });

    if (registrationError) {
      console.error(registrationError);
      setError(
        "We could not load mentor membership verification requests.",
      );
      setLoading(false);
      return;
    }

    setRegistrations(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadRegistrations();
  }, []);

  async function reviewMembership(action) {
    if (!selectedRegistration || processing) {
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    const { error: reviewError } = await supabase.rpc(
      "admin_review_mentor_membership",
      {
        p_user_id: selectedRegistration.id,
        p_action: action,
      },
    );

    if (reviewError) {
      console.error(reviewError);
      setError(
        reviewError.message ||
          "We could not update this mentor membership request.",
      );
      setProcessing(false);
      return;
    }

    setSuccess(
      action === "verify"
        ? "The mentor membership has been verified. The member can now continue to the mentor application."
        : "The mentor membership has been rejected.",
    );

    setSelectedRegistration(null);
    await loadRegistrations();
    setProcessing(false);
  }

  return (
    <section className="admin-list-section admin-membership-queue-section">
      <div className="admin-workflow-section-heading">
        <div>
          <span>STAGE 1</span>
          <h2>Mentor membership verification</h2>
          <p>
            Review the information supplied during mentor registration before
            allowing the person to continue to the mentor application.
          </p>
        </div>

        <strong>
          {registrations.length} awaiting review
        </strong>
      </div>

      {success && (
        <p className="admin-success-message">{success}</p>
      )}

      {error && !selectedRegistration && (
        <p className="form-error">{error}</p>
      )}

      {loading ? (
        <AdminLoadingState />
      ) : registrations.length === 0 ? (
        <AdminEmptyState
          title="No mentor membership requests"
          description="New mentor registrations that need membership verification will appear here."
        />
      ) : (
        <div className="admin-table-wrapper admin-table-wrapper--flush">
          <table className="admin-data-table admin-membership-queue-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Verification method</th>
                <th>Information supplied</th>
                <th>Email</th>
                <th>Registered</th>
                <th aria-label="Action" />
              </tr>
            </thead>

            <tbody>
              {registrations.map((registration) => (
                <tr key={registration.id}>
                  <td>
                    <strong>
                      {registration.full_name || "Name not provided"}
                    </strong>
                    <small>{registration.email || ""}</small>
                  </td>

                  <td>
                    {formatMembershipVerificationMethod(
                      registration.membership_verification_method,
                    )}
                  </td>

                  <td className="admin-membership-reference-cell">
                    {getMembershipReferenceText(registration)}
                  </td>

                  <td>
                    <StatusBadge
                      value={
                        registration.email_verified
                          ? "verified"
                          : "not_verified"
                      }
                      label={
                        registration.email_verified
                          ? "Verified"
                          : "Not verified"
                      }
                    />
                  </td>

                  <td>{formatDate(registration.created_at)}</td>

                  <td className="admin-table-action-cell">
                    <button
                      type="button"
                      className="admin-review-button"
                      onClick={() => {
                        setSelectedRegistration(registration);
                        setError("");
                      }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRegistration && (
        <MembershipReviewModal
          registration={selectedRegistration}
          canVerifyMembership={canVerifyMembership}
          processing={processing}
          error={error}
          onConfirm={reviewMembership}
          onClose={() => {
            if (!processing) {
              setSelectedRegistration(null);
              setError("");
            }
          }}
        />
      )}
    </section>
  );
}

function MembershipReviewModal({
  registration,
  canVerifyMembership,
  processing,
  error,
  onConfirm,
  onClose,
}) {
  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !processing
        ) {
          onClose();
        }
      }}
    >
      <section
        className="admin-membership-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-membership-review-title"
      >
        <div className="admin-review-modal-header">
          <div>
            <span className="admin-section-eyebrow">
              MENTOR MEMBERSHIP VERIFICATION
            </span>
            <h2 id="mentor-membership-review-title">
              {registration.full_name || "Applicant"}
            </h2>
            <p>{registration.email || ""}</p>
          </div>

          <button
            type="button"
            className="admin-modal-close-button"
            onClick={onClose}
            disabled={processing}
            aria-label="Close membership review"
          >
            <X size={18} />
          </button>
        </div>

        <div className="admin-review-details-grid admin-membership-detail-grid">
          <ReviewDetail
            label="Verification method"
            value={formatMembershipVerificationMethod(
              registration.membership_verification_method,
            )}
          />

          <ReviewDetail
            label="Information supplied"
            value={getMembershipReferenceText(registration)}
          />

          <ReviewDetail
            label="Mobile number"
            value={registration.phone_number || "Not provided"}
          />

          <ReviewDetail
            label="Email verified"
            value={registration.email_verified ? "Yes" : "No"}
          />

          <ReviewDetail
            label="Account status"
            value={formatStatusLabel(registration.account_status)}
          />

          <ReviewDetail
            label="Registered"
            value={formatDate(registration.created_at)}
          />
        </div>

        {registration.membership_verification_method ===
          "manual_admin_review" && (
          <div className="admin-review-existing-feedback">
            <strong>Manual administrator review</strong>
            <p>
              No service unit or leader reference was supplied. Confirm the
              person&apos;s TCN Ikeja membership using the records or process
              available to the administration team before approving.
            </p>
          </div>
        )}

        {error && (
          <p className="form-error">{error}</p>
        )}

        {canVerifyMembership ? (
          <div className="admin-review-modal-actions">
            <button
              type="button"
              className="admin-modal-cancel-button admin-reject-application-button"
              onClick={() => onConfirm("reject")}
              disabled={processing}
            >
              {processing ? "Please wait..." : "Reject membership"}
            </button>

            <button
              type="button"
              className="admin-modal-confirm-button admin-approve-application-button"
              onClick={() => onConfirm("verify")}
              disabled={processing || !registration.email_verified}
            >
              {processing ? "Please wait..." : "Verify membership"}
            </button>
          </div>
        ) : (
          <div className="admin-review-existing-feedback">
            <strong>View only</strong>
            <p>
              Your administrator role can view this information but cannot
              make the membership decision.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function SubmittedApplications({
  canRecommendApplications,
  canSecondSignoffApplications,
  isFullAccessAdmin,
  adminOperationalRole,
}) {
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [reviewMode, setReviewMode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadApplications({ keepModalOpen = false } = {}) {
    if (!keepModalOpen) {
      setLoading(true);
    }

    setError("");

    const { data, error: applicationError } = await supabase
      .from("mentor_applications")
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
          membership_reference
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (applicationError) {
      console.error(applicationError);
      setError("We could not load mentor applications.");
      setLoading(false);
      return;
    }

    const rawApplications = data ?? [];

    const reviewerIds = [
      ...new Set(
        rawApplications
          .flatMap((application) => [
            application.onboarding_reviewed_by,
            application.operations_reviewed_by,
          ])
          .filter(Boolean),
      ),
    ];

    let reviewerMap = new Map();

    if (reviewerIds.length > 0) {
      const { data: reviewerData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", reviewerIds);

      reviewerMap = new Map(
        (reviewerData ?? []).map((reviewer) => [
          reviewer.id,
          reviewer,
        ]),
      );
    }

    const nextApplications = rawApplications.map((application) => ({
      ...application,
      onboarding_reviewer:
        reviewerMap.get(application.onboarding_reviewed_by) ?? null,
      operations_reviewer:
        reviewerMap.get(application.operations_reviewed_by) ?? null,
    }));

    setApplications(nextApplications);

    if (keepModalOpen && selectedApplication) {
      setSelectedApplication(
        nextApplications.find(
          (application) => application.id === selectedApplication.id,
        ) ?? null,
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  function canTakeAction(application) {
    if (application.status !== "pending") {
      return false;
    }

    if (!application.onboarding_recommendation) {
      return canRecommendApplications;
    }

    if (!application.operations_decision) {
      return canSecondSignoffApplications;
    }

    return false;
  }

  async function submitReview(action) {
    if (!selectedApplication || selectedApplication.status !== "pending") {
      return;
    }

    if (
      ["recommend_reject", "reject"].includes(action) &&
      !feedback.trim()
    ) {
      setError("Please provide a reason before continuing.");
      setReviewMode(action);
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    const { error: reviewError } = await supabase.rpc(
      "admin_review_mentor_application",
      {
        p_application_id: selectedApplication.id,
        p_action: action,
        p_feedback: ["recommend_reject", "reject"].includes(action)
          ? feedback.trim()
          : null,
      },
    );

    if (reviewError) {
      console.error(reviewError);
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

    setSuccess(messages[action] || "The application was updated.");
    setReviewMode("");
    setFeedback("");

    await loadApplications({ keepModalOpen: true });
    setProcessing(false);
  }

  const filteredApplications = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      if (
        statusFilter !== "all" &&
        application.status !== statusFilter
      ) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      return [
        application.applicant?.full_name,
        application.applicant?.email,
        application.job_title,
        application.organisation,
        application.status,
        ...(application.expertise ?? []),
        ...(application.mentorship_categories ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [applications, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredApplications.length / APPLICATION_PAGE_SIZE),
  );

  const safePage = Math.min(currentPage, totalPages);
  const firstIndex = (safePage - 1) * APPLICATION_PAGE_SIZE;
  const visibleApplications = filteredApplications.slice(
    firstIndex,
    firstIndex + APPLICATION_PAGE_SIZE,
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
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={searchTerm}
              placeholder="Search applicant, email or expertise"
              aria-label="Search mentor applications"
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="admin-application-filters">
            {[
              ["all", "All"],
              ["pending", "Pending"],
              ["approved", "Approved"],
              ["rejected", "Rejected"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={statusFilter === value ? "active" : ""}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {success && (
          <p className="admin-success-message">{success}</p>
        )}

        {error && !selectedApplication && (
          <p className="form-error">{error}</p>
        )}

        {applications.length === 0 ? (
          <AdminEmptyState
            title="No submitted mentor applications"
            description="New mentor applications will appear here after a mentor submits the single application form."
          />
        ) : filteredApplications.length === 0 ? (
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
                    <th>Current role</th>
                    <th>Experience</th>
                    <th>Mentoring areas</th>
                    <th>Review stage</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th aria-label="Action" />
                  </tr>
                </thead>

                <tbody>
                  {visibleApplications.map((application) => (
                    <tr key={application.id}>
                      <td>
                        <strong>
                          {application.applicant?.full_name ||
                            "Name not provided"}
                        </strong>
                        <small>{application.applicant?.email || ""}</small>
                      </td>

                      <td>
                        {application.job_title || "Not provided"}
                        {application.organisation && (
                          <small>{application.organisation}</small>
                        )}
                      </td>

                      <td>{application.years_of_experience ?? 0} years</td>

                      <td className="admin-application-areas-cell">
                        {(application.expertise ?? []).slice(0, 3).join(", ") ||
                          "Not provided"}
                      </td>

                      <td>{getApplicationReviewStageLabel(application)}</td>
                      <td><StatusBadge value={application.status} /></td>
                      <td>{formatDate(application.created_at)}</td>

                      <td className="admin-table-action-cell">
                        <button
                          type="button"
                          className="admin-review-button"
                          onClick={() => {
                            setSelectedApplication(application);
                            setReviewMode("");
                            setFeedback("");
                            setError("");
                          }}
                        >
                          {canTakeAction(application) ? "Review" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-table-pagination">
              <p>
                Showing {filteredApplications.length === 0 ? 0 : firstIndex + 1}-
                {Math.min(
                  firstIndex + APPLICATION_PAGE_SIZE,
                  filteredApplications.length,
                )} of {filteredApplications.length}
              </p>

              <div className="admin-pagination-controls">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safePage === 1}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span>Page {safePage} of {totalPages}</span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safePage === totalPages}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {selectedApplication && (
        <ApplicationReviewModal
          application={selectedApplication}
          reviewMode={reviewMode}
          setReviewMode={setReviewMode}
          feedback={feedback}
          setFeedback={setFeedback}
          error={error}
          success={success}
          processing={processing}
          canRecommendApplications={canRecommendApplications}
          canSecondSignoffApplications={canSecondSignoffApplications}
          isFullAccessAdmin={isFullAccessAdmin}
          adminOperationalRole={adminOperationalRole}
          onSubmitReview={submitReview}
          onClose={() => {
            if (!processing) {
              setSelectedApplication(null);
              setReviewMode("");
              setFeedback("");
              setError("");
              setSuccess("");
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
  const isPending = application.status === "pending";
  const onboardingComplete = Boolean(application.onboarding_recommendation);
  const finalDecisionComplete =
    Boolean(application.operations_decision) ||
    ["approved", "rejected"].includes(application.status);

  const canMakeOnboardingRecommendation =
    isPending &&
    !onboardingComplete &&
    canRecommendApplications;

  const canMakeFinalDecision =
    isPending &&
    !finalDecisionComplete &&
    canSecondSignoffApplications &&
    (onboardingComplete || isFullAccessAdmin);

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) {
          onClose();
        }
      }}
    >
      <section
        className="admin-application-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-application-review-title"
      >
        <div className="admin-review-modal-header">
          <div>
            <span className="admin-section-eyebrow">MENTOR APPLICATION</span>
            <h2 id="mentor-application-review-title">
              {application.applicant?.full_name || "Applicant"}
            </h2>
            <p>{application.applicant?.email || ""}</p>
          </div>

          <button
            type="button"
            className="admin-modal-close-button"
            onClick={onClose}
            disabled={processing}
            aria-label="Close application review"
          >
            <X size={18} />
          </button>
        </div>

        <div className="admin-review-status-row">
          <StatusBadge value={application.status} />
          <span>
            {getApplicationReviewStageLabel(application)} · Submitted {" "}
            {formatDate(application.created_at)}
          </span>
        </div>

        {isFullAccessAdmin && (
          <div className="admin-review-existing-feedback">
            <strong>Full Access Admin</strong>
            <p>
              You can perform either review stage. Your access is not
              restricted by an operational role.
            </p>
          </div>
        )}

        {!isFullAccessAdmin && adminOperationalRole && (
          <div className="admin-review-existing-feedback">
            <strong>Your administrator role</strong>
            <p>{formatAdminOperationalRole(adminOperationalRole)}</p>
          </div>
        )}

        <div className="admin-review-existing-feedback">
          <strong>Membership verification information</strong>
          <p>
            Method: {formatMembershipVerificationMethod(
              application.membership_verification_method ||
                application.applicant?.membership_verification_method,
            )}
          </p>
          <p>
            Information supplied: {
              application.membership_reference ||
              application.applicant?.membership_reference ||
              (
                (application.membership_verification_method ||
                  application.applicant?.membership_verification_method) ===
                "manual_admin_review"
                  ? "Manual administration review requested"
                  : "Not provided"
              )
            }
          </p>
          <p>
            Email: {application.applicant?.email || "Not provided"}
            {application.applicant?.email_verified === false
              ? " · Email not yet verified"
              : application.applicant?.email_verified === true
                ? " · Email verified"
                : ""}
          </p>
        </div>

        <div className="admin-review-details-grid">
          <ReviewDetail
            label="Current role"
            value={application.job_title || "Not provided"}
          />
          <ReviewDetail
            label="Organisation"
            value={application.organisation || "Not provided"}
          />
          <ReviewDetail
            label="Experience"
            value={`${application.years_of_experience ?? 0} years`}
          />
          <ReviewDetail
            label="Maximum active mentees"
            value={application.maximum_active_mentees ?? "Not provided"}
          />
          <ReviewDetail
            label="Meeting format"
            value={(application.meeting_formats ?? []).join(", ")}
          />
          <ReviewDetail
            label="Session length"
            value={(application.session_lengths ?? [])
              .map((length) =>
                Number(length) === 60
                  ? "1 hour"
                  : `${length} minutes`,
              )
              .join(", ")}
          />
        </div>

        <ReviewList label="Areas of expertise" items={application.expertise} />
        <ReviewList
          label="Mentorship categories"
          items={application.mentorship_categories}
        />
        <ReviewList label="Languages" items={application.languages} />

        <div className="admin-review-long-copy">
          <span>BIOGRAPHY</span>
          <p>{application.biography || "Not provided"}</p>
        </div>

        <div className="admin-review-existing-feedback">
          <strong>Stage 1 · Mentor Onboarding recommendation</strong>
          {onboardingComplete ? (
            <>
              <p>
                Recommendation: <strong>
                  {application.onboarding_recommendation === "approve"
                    ? "Recommend approval"
                    : "Recommend rejection"}
                </strong>
              </p>
              <p>
                Reviewed by {" "}
                {application.onboarding_reviewer?.full_name ||
                  application.onboarding_reviewer?.email ||
                  "Administrator"}
                {application.onboarding_reviewed_at
                  ? ` on ${formatDate(application.onboarding_reviewed_at)}`
                  : ""}.
              </p>
              {application.onboarding_feedback && (
                <p>{application.onboarding_feedback}</p>
              )}
            </>
          ) : (
            <p>No recommendation has been recorded yet.</p>
          )}
        </div>

        {canMakeOnboardingRecommendation && (
          <ReviewActionBox
            title="Record the Mentor Onboarding recommendation"
            rejectionMode={reviewMode === "recommend_reject"}
            feedback={feedback}
            setFeedback={setFeedback}
            processing={processing}
            rejectLabel="Recommend rejection"
            approveLabel="Recommend approval"
            onCancel={() => {
              setReviewMode("");
              setFeedback("");
            }}
            onRejectStart={() => setReviewMode("recommend_reject")}
            onReject={() => onSubmitReview("recommend_reject")}
            onApprove={() => onSubmitReview("recommend_approve")}
          />
        )}

        <div className="admin-review-existing-feedback">
          <strong>Stage 2 · Operations and Governance decision</strong>
          {finalDecisionComplete ? (
            <>
              <p>
                Final decision: <strong>
                  {application.status === "approved" ? "Approved" : "Rejected"}
                </strong>
              </p>
              <p>
                Reviewed by {" "}
                {application.operations_reviewer?.full_name ||
                  application.operations_reviewer?.email ||
                  "Administrator"}
                {application.operations_reviewed_at
                  ? ` on ${formatDate(application.operations_reviewed_at)}`
                  : ""}.
              </p>
              {(application.operations_feedback || application.admin_feedback) && (
                <p>
                  {application.operations_feedback || application.admin_feedback}
                </p>
              )}
            </>
          ) : onboardingComplete ? (
            <p>The application is ready for Operations and Governance sign-off.</p>
          ) : isFullAccessAdmin ? (
            <p>
              No onboarding recommendation has been recorded. As a Full Access
              Admin, you may still make the final decision.
            </p>
          ) : (
            <p>Waiting for the Mentor Onboarding recommendation.</p>
          )}
        </div>

        {canMakeFinalDecision && (
          <ReviewActionBox
            title="Record the final decision"
            rejectionMode={reviewMode === "reject"}
            feedback={feedback}
            setFeedback={setFeedback}
            processing={processing}
            rejectLabel="Reject"
            approveLabel="Final approval"
            onCancel={() => {
              setReviewMode("");
              setFeedback("");
            }}
            onRejectStart={() => setReviewMode("reject")}
            onReject={() => onSubmitReview("reject")}
            onApprove={() => onSubmitReview("approve")}
          />
        )}

        {success && (
          <p className="admin-success-message">{success}</p>
        )}
        {error && (
          <p className="form-error">{error}</p>
        )}

        {!canMakeOnboardingRecommendation &&
          !canMakeFinalDecision && (
            <div className="admin-review-modal-actions">
              <button
                type="button"
                className="admin-modal-confirm-button"
                onClick={onClose}
                disabled={processing}
              >
                Close
              </button>
            </div>
          )}
      </section>
    </div>
  );
}

function ReviewActionBox({
  title,
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
    <div className="admin-review-existing-feedback">
      <strong>{title}</strong>

      {rejectionMode && (
        <label className="admin-rejection-field">
          <span>Reason</span>
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            rows="4"
            placeholder="Provide a clear reason."
            disabled={processing}
          />
        </label>
      )}

      <div className="admin-review-modal-actions">
        {rejectionMode ? (
          <>
            <button
              type="button"
              className="admin-modal-cancel-button"
              onClick={onCancel}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="admin-modal-confirm-button danger"
              onClick={onReject}
              disabled={processing}
            >
              {processing ? "Saving..." : rejectLabel}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="admin-modal-cancel-button admin-reject-application-button"
              onClick={onRejectStart}
              disabled={processing}
            >
              {rejectLabel}
            </button>
            <button
              type="button"
              className="admin-modal-confirm-button admin-approve-application-button"
              onClick={onApprove}
              disabled={processing}
            >
              {processing ? "Saving..." : approveLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ReviewDetail({ label, value }) {
  return (
    <div className="admin-review-detail">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function ReviewList({ label, items = [] }) {
  return (
    <div className="admin-review-list">
      <span>{label}</span>
      {items.length > 0 ? (
        <div>
          {items.map((item) => (
            <small key={item}>{item}</small>
          ))}
        </div>
      ) : (
        <p>Not provided</p>
      )}
    </div>
  );
}

function StatusBadge({ value, label }) {
  const normalizedValue = String(value || "unknown").replaceAll("_", "-");
  const text = label || formatStatusLabel(value);

  return (
    <span className={`admin-status-badge status-${normalizedValue}`}>
      <i className="admin-status-dot" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

function AdminLoadingState() {
  return (
    <section className="admin-state-card">
      <div className="loader" />
      <p>Loading information...</p>
    </section>
  );
}

function AdminEmptyState({ title, description }) {
  return (
    <section className="admin-state-card">
      <span className="empty-state-icon">
        <ClipboardCheck size={28} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}

function formatMembershipVerificationMethod(value) {
  const labels = {
    service_unit: "Service unit or department",
    leader_reference: "TCN leader reference",
    manual_admin_review: "Manual administrator review",
  };

  return labels[value] || "Not provided";
}

function getMembershipReferenceText(person) {
  if (person.membership_verification_method === "manual_admin_review") {
    return "Manual administrator review requested";
  }

  return person.membership_reference || "Not provided";
}

function getApplicationReviewStageLabel(application) {
  if (application.status === "approved") {
    return "Completed · Approved";
  }

  if (application.status === "rejected") {
    return "Completed · Rejected";
  }

  if (application.onboarding_recommendation) {
    return "Awaiting Operations sign-off";
  }

  return "Awaiting Mentor Onboarding review";
}

function formatAdminOperationalRole(role) {
  const labels = {
    product_technology_lead: "Product and Technology Lead",
    operations_governance_lead: "Operations and Governance Lead",
    mentor_onboarding_vetting_training_lead:
      "Mentor Onboarding, Vetting and Training Lead",
    mentee_matching_engagement_quality_lead:
      "Mentee Matching, Engagement and Quality Lead",
    trust_safety_case_resolution_lead:
      "Trust, Safety and Case Resolution Lead",
  };

  return labels[role] || formatStatusLabel(role);
}

function formatStatusLabel(status) {
  return String(status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default AdminMentorApplications;
