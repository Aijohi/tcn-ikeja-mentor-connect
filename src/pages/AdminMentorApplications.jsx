import {

  ChevronLeft,

  ChevronRight,

  ClipboardCheck,

  Mail,

  Search,

  X,

} from "lucide-react";

import {

  useEffect,

  useMemo,

  useState,

} from "react";

import { useLocation } from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./AdminLaunchFixes.css";

const APPLICATION_PAGE_SIZE = 10;

function isMentorProfileComplete(application) {

  if (!application) return false;

  const biography = String(application.biography || "").trim();

  const jobTitle = String(application.job_title || "").trim();

  const expertise = Array.isArray(application.expertise)

    ? application.expertise.filter(Boolean)

    : [];

  const mentoringCategories = Array.isArray(application.mentorship_categories)

    ? application.mentorship_categories.filter(Boolean)

    : [];

  const languages = Array.isArray(application.languages)

    ? application.languages.filter(Boolean)

    : [];

  const meetingFormats = Array.isArray(application.meeting_formats)

    ? application.meeting_formats.filter(Boolean)

    : [];

  const sessionLengths = Array.isArray(application.session_lengths)

    ? application.session_lengths.filter(Boolean)

    : [];

  return Boolean(

    biography.length >= 50 &&

    jobTitle &&

    expertise.length > 0 &&

    mentoringCategories.length > 0 &&

    languages.length > 0 &&

    meetingFormats.length > 0 &&

    sessionLengths.length > 0 &&

    application.years_of_experience !== null &&

    application.years_of_experience !== undefined &&

    application.years_of_experience !== "" &&

    application.maximum_active_mentees !== null &&

    application.maximum_active_mentees !== undefined &&

    application.maximum_active_mentees !== ""

  );

}

function getProfileCompletionLabel(application) {

  return isMentorProfileComplete(application) ? "Complete" : "Incomplete";

}

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

  const location = useLocation();

  const [onboardingChecklist, setOnboardingChecklist] = useState({});

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

    profileFilter,

    setProfileFilter,

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

    rejectionMode,

    setRejectionMode,

  ] = useState("");

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

  const [emailApplication, setEmailApplication] = useState(null);
  const [emailSubject, setEmailSubject] = useState(
    "Complete your Mentor Connect mentor profile",
  );
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  async function loadApplications({

    keepModalOpen = false,

  } = {}) {

    if (!keepModalOpen) {

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

        onboarding_checklist,

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

              application.reviewed_by,

            ],

          )

          .filter(Boolean),

      ),

    ];

    let reviewerMap =

      new Map();

    if (reviewerIds.length > 0) {

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

            reviewerMap.get(

              application.reviewed_by,

            ) ??

            null,

        }),

      );

    setApplications(

      nextApplications,

    );

    const requestedApplicationId =

      new URLSearchParams(location.search).get("applicationId");

    if (requestedApplicationId) {

      const requestedApplication = nextApplications.find(

        (application) => application.id === requestedApplicationId,

      );

      if (requestedApplication) {

        setSelectedApplication(requestedApplication);

        setOnboardingChecklist(

          requestedApplication.onboarding_checklist || {},

        );

      }

    }

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

    profileFilter,

  ]);

  function openReview(

    application,

  ) {

    setSelectedApplication(

      application,

    );

    setError("");

    setSuccess("");

    setRejectionMode("");

    setRejectionReason("");

    setOnboardingChecklist(

      application.onboarding_checklist || {},

    );

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

    setRejectionMode("");

    setRejectionReason("");

  }

  async function nudgeApplicant(application) {
    const email = application?.applicant?.email?.trim();

    if (!email) {
      setError("This applicant does not have an email address.");
      return;
    }

    setError("");
    setSuccess("");
    setProcessing(true);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    setProcessing(false);

    if (resendError) {
      console.error("Unable to resend verification email:", resendError);
      setError(
        resendError.message ||
          "We could not resend the verification email.",
      );
      return;
    }

    setSuccess(`Verification email sent again to ${email}.`);
  }

  function openEmailModal(application) {
    const name = application?.applicant?.full_name || "there";

    setEmailApplication(application);
    setEmailSubject("Complete your Mentor Connect mentor profile");
    setEmailMessage(
      `Hello ${name}\n\nThank you for your interest in becoming a mentor with Mentor Connect.\n\nOur records show that your mentor profile is not yet complete. Please sign in to Mentor Connect and complete the remaining information so your mentor application can be reviewed.\n\nThank you.\nMentor Connect | TCN IKEJA`,
    );
    setError("");
    setSuccess("");
  }

  function closeEmailModal() {
    if (emailSending) return;

    setEmailApplication(null);
    setEmailSubject("Complete your Mentor Connect mentor profile");
    setEmailMessage("");
    setError("");
  }

  async function sendApplicantEmail() {
    const email = emailApplication?.applicant?.email?.trim();
    const subject = emailSubject.trim();
    const message = emailMessage.trim();

    if (!email) {
      setError("This applicant does not have an email address.");
      return;
    }

    if (!subject) {
      setError("Please enter an email subject.");
      return;
    }

    if (!message) {
      setError("Please enter an email message.");
      return;
    }

    setEmailSending(true);
    setError("");
    setSuccess("");

    const { data, error: emailError } = await supabase.functions.invoke(
      "send-notification-email",
      {
        body: {
          to: email,
          subject,
          message,
          actionUrl: "https://mentorship.tcnikeja.org/mentor/profile",
          actionLabel: "Complete mentor profile",
          idempotencyKey: `mentor-profile-nudge-${emailApplication.id}-${Date.now()}`,
        },
      },
    );

    setEmailSending(false);

    if (emailError) {
      console.error("Unable to send applicant email:", emailError);
      setError(
        emailError.message ||
          "We could not send the email. Please try again.",
      );
      return;
    }

    if (!data?.success) {
      setError(
        data?.error ||
          "We could not send the email. Please try again.",
      );
      return;
    }

    setEmailApplication(null);
    setEmailSubject("Complete your Mentor Connect mentor profile");
    setEmailMessage("");
    setSuccess(`Email sent successfully to ${email}.`);
  }

  async function submitReview(

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

    const isRecommendationAction =

      [

        "recommend_approve",

        "recommend_reject",

      ].includes(

        action,

      );

    const isFinalAction =

      [

        "approve",

        "reject",

      ].includes(

        action,

      );

    if (

      isRecommendationAction &&

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

      isFinalAction &&

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

      isFinalAction &&

      !selectedApplication

        .onboarding_recommendation

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

      !String(

        reason ||

          "",

      ).trim()

    ) {

      setError(

        action ===

          "recommend_reject"

          ? "Please provide a reason before recommending rejection."

          : "Please provide a reason before rejecting this mentor application.",

      );

      return;

    }

    const checklistComplete = [

      "identity_checked",

      "profile_information_checked",

      "biography_checked",

      "employment_information_checked",

      "mentoring_experience_checked",

      "expertise_checked",

      "mentoring_categories_checked",

      "availability_checked",

      "meeting_format_checked",

      "safeguarding_checked",

      "conduct_checked",

    ].every((key) => onboardingChecklist[key] === true);

    const isMentorOnboardingRole =

      adminOperationalRole === "mentor_onboarding_vetting_training_lead";

    if (isRecommendationAction && !checklistComplete) {

      setError(

        "Complete the Mentor Onboarding checklist before recording the recommendation.",

      );

      return;

    }

    if (isFinalAction && isMentorOnboardingRole && !isFullAccessAdmin) {

      setError(

        "The Mentor Onboarding role cannot give the final Operations and Governance decision.",

      );

      return;

    }

    if (isRecommendationAction) {

      const { error: checklistError } = await supabase

        .from("mentor_applications")

        .update({ onboarding_checklist: onboardingChecklist })

        .eq("id", selectedApplication.id);

      if (checklistError) {

        setError(

          checklistError.message ||

            "We could not save the Mentor Onboarding checklist.",

        );

        return;

      }

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

            ? String(

                reason,

              ).trim()

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

        "Approval has been recommended. The application is now ready for Operations and Governance review.",

      recommend_reject:

        "Rejection has been recommended. The application is now ready for Operations and Governance review.",

      approve:

        "The mentor application has received final approval.",

      reject:

        "The mentor application has been rejected.",

    };

    setSuccess(

      messages[action] ||

        "The application was updated.",

    );

    setRejectionMode("");

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

          const profileComplete =

            isMentorProfileComplete(application);

          if (

            profileFilter === "complete" &&

            !profileComplete

          ) {

            return false;

          }

          if (

            profileFilter === "incomplete" &&

            profileComplete

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

            getReviewStageLabel(

              application,

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

              query,

            );

        },

      );

    }, [

      applications,

      searchTerm,

      statusFilter,

      profileFilter,

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

          <div className="admin-application-filters admin-application-filters--profile">

            {[

              [

                "all",

                "All profiles",

              ],

              [

                "complete",

                "Complete",

              ],

              [

                "incomplete",

                "Incomplete",

              ],

            ].map(

              ([

                value,

                label,

              ]) => (

                <button

                  key={`profile-${value}`}

                  type="button"

                  className={

                    profileFilter === value

                      ? "active"

                      : ""

                  }

                  onClick={() =>

                    setProfileFilter(value)

                  }

                >

                  {label}

                </button>

              ),

            )}

          </div>

          <div className="admin-application-filters">

            {[

              [

                "all",

                "All statuses",

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

                  key={`status-${value}`}

                  type="button"

                  className={

                    statusFilter === value

                      ? "active"

                      : ""

                  }

                  onClick={() =>

                    setStatusFilter(value)

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

            title="No mentor applications"

            description="Mentor applications will appear here after applicants register or submit their mentor application."

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

                      Profile

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

                          <StatusBadge

                            value={

                              isMentorProfileComplete(application)

                                ? "complete"

                                : "incomplete"

                            }

                            label={getProfileCompletionLabel(application)}

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

                          {getReviewStageLabel(

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

                          {isMentorProfileComplete(application) ? (

                            <button

                              type="button"

                              className="admin-review-button"

                              onClick={() =>

                                openReview(application)

                              }

                            >

                              {application.status === "pending"

                                ? "Review"

                                : "View"}

                            </button>

                          ) : (

                            <button

                              type="button"

                              className="admin-review-button admin-review-button--nudge"

                              onClick={() => {
                                  if (application?.applicant?.email_verified === false) {
                                    nudgeApplicant(application);
                                    return;
                                  }

                                  openEmailModal(application);
                                }}

                            >

                              <Mail

                                size={15}

                                aria-hidden="true"

                              />

                              <span>

                                {application?.applicant?.email_verified === false

                                  ? "Resend verification"

                                  : "Send email"}

                              </span>

                            </button>

                          )}

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

          onboardingChecklist={onboardingChecklist}

          setOnboardingChecklist={setOnboardingChecklist}

          processing={

            processing

          }

          error={

            error

          }

          success={

            success

          }

          onRecommendApprove={() =>

            submitReview(

              "recommend_approve",

            )

          }

          onRecommendReject={() => {

            setError("");

            setRejectionMode(

              "recommend_reject",

            );

            setRejectionReason("");

          }}

          onFinalApprove={() =>

            submitReview(

              "approve",

            )

          }

          onFinalReject={() => {

            setError("");

            setRejectionMode(

              "reject",

            );

            setRejectionReason("");

          }}

          onClose={

            closeReview

          }

        />

      )}

      {emailApplication && (
        <AdminEmailModal
          application={emailApplication}
          subject={emailSubject}
          setSubject={setEmailSubject}
          message={emailMessage}
          setMessage={setEmailMessage}
          sending={emailSending}
          error={error}
          onSend={sendApplicantEmail}
          onClose={closeEmailModal}
        />
      )}


      {selectedApplication &&

        rejectionMode && (

          <DecisionReasonModal

            application={

              selectedApplication

            }

            mode={

              rejectionMode

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

                setRejectionMode(

                  "",

                );

                setRejectionReason(

                  "",

                );

                setError("");

              }

            }}

            onConfirm={() =>

              submitReview(

                rejectionMode,

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

  canRecommendApplications,

  canSecondSignoffApplications,

  isFullAccessAdmin,

  adminOperationalRole,

  onboardingChecklist,

  setOnboardingChecklist,

  processing,

  error,

  success,

  onRecommendApprove,

  onRecommendReject,

  onFinalApprove,

  onFinalReject,

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

    onboardingComplete &&

    !finalDecisionComplete &&

    (

      canSecondSignoffApplications ||

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

              {getReviewStageLabel(

                application,

              )}

            </span>

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

                You can complete either review stage. Stage 1 must be recorded before Stage 2 so the approval trail stays clear.

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

                    {!onboardingComplete && canMakeOnboardingRecommendation && (

            <section className="admin-mentor-review-section admin-mentor-checklist-section">

              <span className="admin-section-eyebrow">STAGE 1 · REVIEW CHECKLIST</span>

              <h3>Mentor Onboarding checklist</h3>

              <p>Complete all checks before recording the first recommendation.</p>

              <div className="admin-mentor-checklist">

                {[

                  ["identity_checked", "Identity and basic information reviewed"],

                  ["profile_information_checked", "Profile information reviewed"],

                  ["biography_checked", "Biography reviewed"],

                  ["employment_information_checked", "Job title and organisation reviewed"],

                  ["mentoring_experience_checked", "Mentoring experience reviewed"],

                  ["expertise_checked", "Expertise reviewed"],

                  ["mentoring_categories_checked", "Mentoring areas reviewed"],

                  ["availability_checked", "Availability reviewed"],

                  ["meeting_format_checked", "Meeting format reviewed"],

                  ["safeguarding_checked", "Safeguarding requirements reviewed"],

                  ["conduct_checked", "Code of conduct requirements reviewed"],

                ].map(([key, label]) => (

                  <label key={key} className="admin-mentor-checklist-item">

                    <input

                      type="checkbox"

                      checked={onboardingChecklist[key] === true}

                      onChange={(event) =>

                        setOnboardingChecklist((current) => ({

                          ...current,

                          [key]: event.target.checked,

                        }))

                      }

                      disabled={processing}

                    />

                    <span>{label}</span>

                  </label>

                ))}

              </div>

            </section>

          )}

<section

            className={`admin-mentor-review-stage-card admin-mentor-review-stage-card--recommendation${

              onboardingComplete

                ? " is-complete"

                : ""

            }`}

          >

            <span>

              STAGE 1 · RECOMMENDATION

            </span>

            <h3>

              Mentor Onboarding recommendation

            </h3>

            <p>

              The Mentor Onboarding, Vetting and Training admin reviews the applicant and records a recommendation. This is not the final mentor approval.

            </p>

            {onboardingComplete ? (

              <div className="admin-mentor-stage-result">

                <strong>

                  {application.onboarding_recommendation ===

                  "approve"

                    ? "Approval recommended"

                    : "Rejection recommended"}

                </strong>

                <p>

                  Recorded by{" "}

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

                    Reason:{" "}

                    {

                      application.onboarding_feedback

                    }

                  </p>

                )}

              </div>

            ) : canMakeOnboardingRecommendation ? (

              <div className="admin-mentor-review-actions-box">

                <p className="admin-mentor-review-action-helper">

                  Choose one recommendation after reviewing the mentor's information.

                </p>

                <div className="admin-mentor-review-inline-actions">

                  <button

                    type="button"

                    className="admin-recommend-reject-button"

                    onClick={

                      onRecommendReject

                    }

                    disabled={

                      processing

                    }

                  >

                    Recommend rejection

                  </button>

                  <button

                    type="button"

                    className="admin-recommend-approve-button"

                    onClick={

                      onRecommendApprove

                    }

                    disabled={

                      processing

                    }

                  >

                    {processing

                      ? "Saving..."

                      : "Recommend approval"}

                  </button>

                </div>

              </div>

            ) : isPending ? (

              <div className="admin-mentor-stage-waiting">

                <strong>

                  Waiting for Stage 1

                </strong>

                <p>

                  A Mentor Onboarding, Vetting and Training administrator must record the recommendation first.

                </p>

              </div>

            ) : null}

          </section>

          <section

            className={`admin-mentor-review-stage-card admin-mentor-review-stage-card--final${

              canMakeFinalDecision

                ? " is-ready"

                : ""

            }${

              finalDecisionComplete

                ? " is-complete"

                : ""

            }`}

          >

            <span>

              STAGE 2 · FINAL DECISION

            </span>

            <h3>

              Operations and Governance final decision

            </h3>

            {finalDecisionComplete ? (

              <div className="admin-mentor-stage-result">

                <strong>

                  {application.status ===

                  "approved"

                    ? "Mentor approved"

                    : "Mentor rejected"}

                </strong>

                <p>

                  Final decision recorded by{" "}

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

                    : application.reviewed_at

                      ? ` on ${formatDate(

                          application.reviewed_at,

                        )}.`

                      : "."}

                </p>

                {(application.operations_feedback ||

                  application.admin_feedback) && (

                    <p>

                      Reason:{" "}

                      {application.operations_feedback ||

                        application.admin_feedback}

                    </p>

                  )}

              </div>

            ) : !onboardingComplete ? (

              <div className="admin-mentor-stage-waiting">

                <strong>

                  Stage 2 is not ready yet

                </strong>

                <p>

                  The final approval buttons will become available after the Stage 1 recommendation is recorded.

                </p>

              </div>

            ) : canMakeFinalDecision ? (

              <div className="admin-mentor-review-actions-box">

                <p className="admin-mentor-review-action-helper">

                  Review the Stage 1 recommendation, then make the final mentor decision.

                </p>

                <div className="admin-mentor-review-inline-actions">

                  <button

                    type="button"

                    className="admin-final-reject-button"

                    onClick={

                      onFinalReject

                    }

                    disabled={

                      processing

                    }

                  >

                    Reject mentor

                  </button>

                  <button

                    type="button"

                    className="admin-final-approve-button"

                    onClick={

                      onFinalApprove

                    }

                    disabled={

                      processing

                    }

                  >

                    {processing

                      ? "Saving..."

                      : "Final approval"}

                  </button>

                </div>

              </div>

            ) : isPending ? (

              <div className="admin-mentor-stage-waiting">

                <strong>

                  Awaiting Operations and Governance

                </strong>

                <p>

                  The Stage 1 recommendation is complete. An Operations and Governance administrator must record the final decision.

                </p>

              </div>

            ) : null}

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

      </section>

    </div>

  );

}

function AdminEmailModal({
  application,
  subject,
  setSubject,
  message,
  setMessage,
  sending,
  error,
  onSend,
  onClose,
}) {
  useLockBodyScroll(true);

  const applicantName =
    application?.applicant?.full_name || "Applicant";
  const applicantEmail = application?.applicant?.email || "";

  return (
    <div
      className="admin-decline-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !sending
        ) {
          onClose();
        }
      }}
    >
      <section
        className="admin-decline-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-email-modal-title"
      >
        <header>
          <div>
            <span>MENTOR PROFILE FOLLOW-UP</span>
            <h2 id="mentor-email-modal-title">Send email</h2>
            <p>
              Send a message to {applicantName} about completing the mentor profile.
            </p>
            <p>{applicantEmail}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Close email modal"
          >
            <X size={18} />
          </button>
        </header>

        <div className="admin-decline-modal-body">
          <label>
            <span>Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Email subject"
              maxLength={160}
              disabled={sending}
              autoFocus
            />
          </label>

          <label>
            <span>Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows="9"
              placeholder="Write your message to the applicant."
              maxLength={5000}
              disabled={sending}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer>
          <button
            type="button"
            className="admin-drawer-secondary"
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>

          <button
            type="button"
            className="admin-final-approve-button"
            onClick={onSend}
            disabled={
              sending ||
              !subject.trim() ||
              !message.trim()
            }
          >
            {sending ? "Sending..." : "Send email"}
          </button>
        </footer>
      </section>
    </div>
  );
}


function DecisionReasonModal({

  application,

  mode,

  reason,

  setReason,

  processing,

  error,

  onCancel,

  onConfirm,

}) {

  const isRecommendationReject =

    mode ===

    "recommend_reject";

  return (

    <div

      className="admin-decline-modal-backdrop"

      role="presentation"

      onMouseDown={(

        event,

      ) => {

        if (

          event.target ===

            event.currentTarget &&

          !processing

        ) {

          onCancel();

        }

      }}

    >

      <section

        className="admin-decline-modal"

        role="dialog"

        aria-modal="true"

        aria-labelledby="mentor-rejection-reason-title"

      >

        <header>

          <div>

            <span>

              {isRecommendationReject

                ? "STAGE 1 · RECOMMEND REJECTION"

                : "STAGE 2 · REJECT MENTOR"}

            </span>

            <h2 id="mentor-rejection-reason-title">

              Give a reason

            </h2>

            <p>

              {isRecommendationReject

                ? `Explain why ${application.applicant?.full_name || "this applicant"} should not be recommended for mentor approval.`

                : `Explain why ${application.applicant?.full_name || "this applicant"} should not receive final mentor approval.`}

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

            aria-label="Close rejection reason modal"

          >

            <X size={18} />

          </button>

        </header>

        <div className="admin-decline-modal-body">

          <label>

            <span>

              Reason

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

              ? "Saving..."

              : isRecommendationReject

                ? "Submit rejection recommendation"

                : "Reject mentor"}

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

function getReviewStageLabel(

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

    return "Completed · Declined";

  }

  if (

    application.onboarding_recommendation

  ) {

    return "Awaiting Operations sign-off";

  }

  return "Awaiting Mentor Onboarding review";

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
