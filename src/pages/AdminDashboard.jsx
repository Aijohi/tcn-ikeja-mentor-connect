import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  GitPullRequest,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabase";

import "./AdminDashboard.css";
import "./AdminRequests.css";
import "./AdminSessions.css";

const ATTENTION_PAGE_SIZE = 5;
const PEOPLE_PAGE_SIZE = 10;
const APPLICATION_PAGE_SIZE = 10;
const REQUEST_PAGE_SIZE = 10;
const SESSION_PAGE_SIZE = 10;

const ADMIN_ROUTES = {
  overview: "/admin/dashboard",
  people: "/admin/dashboard/people",
  applications: "/admin/dashboard/mentor-applications",
  requests: "/admin/dashboard/mentorship-requests",
  sessions: "/admin/dashboard/sessions",
};

const pageInformation = {
  overview: {
    title: "Community overview",
    description:
      "Monitor registration, mentor applications and mentorship requests.",
  },

  people: {
    title: "People",
    description:
      "View the people who have registered on Mentor Connect.",
  },

  applications: {
    title: "Mentor applications",
    description:
      "Review people who have applied to become mentors.",
  },

  requests: {
    title: "Mentorship requests",
    description:
      "Monitor the mentorship requests submitted by mentees.",
  },

  requestDetails: {
    title: "Mentorship request details",
    description:
      "Review the request, participants, goal and request history.",
  },

  sessions: {
    title: "Sessions",
    description:
      "Monitor mentorship sessions across the Mentor Connect community.",
  },

  sessionDetails: {
    title: "Session details",
    description:
      "Review the participants, schedule and session information.",
  },
};

function getAdminSection(pathname) {
  const cleanPath =
    pathname.length > 1
      ? pathname.replace(/\/+$/, "")
      : pathname;

  if (cleanPath === ADMIN_ROUTES.people) {
    return "people";
  }

  if (
    cleanPath === ADMIN_ROUTES.applications ||
    cleanPath === "/admin/dashboard/applications"
  ) {
    return "applications";
  }

  if (
    cleanPath.startsWith(`${ADMIN_ROUTES.sessions}/`) &&
    cleanPath !== ADMIN_ROUTES.sessions
  ) {
    return "sessionDetails";
  }

  if (cleanPath === ADMIN_ROUTES.sessions) {
    return "sessions";
  }

  if (
    cleanPath.startsWith(`${ADMIN_ROUTES.requests}/`) &&
    cleanPath !== ADMIN_ROUTES.requests
  ) {
    return "requestDetails";
  }

  if (
    cleanPath === ADMIN_ROUTES.requests ||
    cleanPath === "/admin/dashboard/requests"
  ) {
    return "requests";
  }

  return "overview";
}

function AdminDashboard() {
  const location = useLocation();

  const section =
    getAdminSection(
      location.pathname,
    );

  const currentPage =
    pageInformation[section];

  return (
    <DashboardLayout
      title={currentPage.title}
      description={currentPage.description}
    >
      {section === "people" && (
        <PeoplePage />
      )}

      {section ===
        "applications" && (
        <ApplicationsPage />
      )}

      {section === "requests" && (
        <RequestsPage />
      )}

      {section === "requestDetails" && (
        <RequestDetailsPage />
      )}

      {section === "sessions" && (
        <SessionsPage />
      )}

      {section === "sessionDetails" && (
        <SessionDetailsPage />
      )}

      {section === "overview" && (
        <OverviewPage />
      )}
    </DashboardLayout>
  );
}

function OverviewPage() {
  const [statistics, setStatistics] = useState({
    registeredPeople: 0,
    approvedMentors: 0,
    pendingApplications: 0,
    pendingRequests: 0,
  });

  const [attentionItems, setAttentionItems] = useState([]);
  const [attentionPage, setAttentionPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      setLoading(true);
      setError("");

      const [
        peopleResult,
        approvedMentorsResult,
        pendingApplicationsCountResult,
        pendingRequestsCountResult,
        pendingApplicationsResult,
        pendingRequestsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("*", {
          count: "exact",
          head: true,
        }),

        supabase
          .from("mentor_profiles")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("approval_status", "approved"),

        supabase
          .from("mentor_applications")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        supabase
          .from("mentorship_requests")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        supabase
          .from("mentor_applications")
          .select(
            `
              id,
              applicant_user_id,
              expertise,
              mentorship_categories,
              status,
              created_at,
              applicant:profiles!mentor_applications_applicant_user_id_fkey (
                full_name,
                email
              )
            `,
          )
          .eq("status", "pending")
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("mentorship_requests")
          .select(
            `
              id,
              mentoring_area,
              status,
              created_at,
              mentee:profiles!mentorship_requests_mentee_id_fkey (
                full_name,
                email
              ),
              mentor:profiles!mentorship_requests_mentor_id_fkey (
                full_name,
                email
              )
            `,
          )
          .eq("status", "pending")
          .order("created_at", {
            ascending: false,
          }),
      ]);

      if (!isMounted) {
        return;
      }

      const firstError =
        peopleResult.error ||
        approvedMentorsResult.error ||
        pendingApplicationsCountResult.error ||
        pendingRequestsCountResult.error ||
        pendingApplicationsResult.error ||
        pendingRequestsResult.error;

      if (firstError) {
        console.error("Unable to load Admin overview:", firstError);

        setError("We could not load the dashboard information.");
        setLoading(false);
        return;
      }

      const applicationItems = (pendingApplicationsResult.data ?? []).map(
        (application) => {
          const areas =
            application.expertise?.length > 0
              ? application.expertise
              : application.mentorship_categories ?? [];

          return {
            id: `application-${application.id}`,
            type: "Mentor application",
            personName:
              application.applicant?.full_name || "Applicant name not provided",
            personEmail: application.applicant?.email || "",
            detail:
              areas.slice(0, 2).join(", ") || "Mentoring areas not provided",
            submittedAt: application.created_at,
            status: application.status,
            reviewPath: ADMIN_ROUTES.applications,
          };
        },
      );

      const requestItems = (pendingRequestsResult.data ?? []).map((request) => ({
        id: `request-${request.id}`,
        type: "Mentorship request",
        personName: request.mentee?.full_name || "Mentee",
        personEmail: request.mentee?.email || "",
        detail: request.mentoring_area || "Mentoring area not provided",
        submittedAt: request.created_at,
        status: request.status,
        reviewPath: ADMIN_ROUTES.requests,
      }));

      const combinedAttentionItems = [
        ...applicationItems,
        ...requestItems,
      ].sort((firstItem, secondItem) => {
        const firstDate = firstItem.submittedAt
          ? new Date(firstItem.submittedAt).getTime()
          : 0;

        const secondDate = secondItem.submittedAt
          ? new Date(secondItem.submittedAt).getTime()
          : 0;

        return secondDate - firstDate;
      });

      setStatistics({
        registeredPeople: peopleResult.count ?? 0,
        approvedMentors: approvedMentorsResult.count ?? 0,
        pendingApplications: pendingApplicationsCountResult.count ?? 0,
        pendingRequests: pendingRequestsCountResult.count ?? 0,
      });

      setAttentionItems(combinedAttentionItems);
      setAttentionPage(1);
      setLoading(false);
    }

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const attentionCount =
    statistics.pendingApplications + statistics.pendingRequests;

  const totalAttentionPages = Math.max(
    1,
    Math.ceil(attentionItems.length / ATTENTION_PAGE_SIZE),
  );

  const safeAttentionPage = Math.min(attentionPage, totalAttentionPages);

  const firstAttentionIndex =
    (safeAttentionPage - 1) * ATTENTION_PAGE_SIZE;

  const visibleAttentionItems = attentionItems.slice(
    firstAttentionIndex,
    firstAttentionIndex + ATTENTION_PAGE_SIZE,
  );

  const visibleStart =
    attentionItems.length === 0 ? 0 : firstAttentionIndex + 1;

  const visibleEnd = Math.min(
    firstAttentionIndex + ATTENTION_PAGE_SIZE,
    attentionItems.length,
  );

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return <AdminErrorState message={error} />;
  }

  return (
    <div className="admin-overview-page">
      <section className="admin-overview-hero">
        <div className="admin-overview-hero-copy">
          <span className="admin-overview-eyebrow">MODERATED COMMUNITY</span>

          <h2>A trusted mentoring community, growing with care.</h2>

          <div className="admin-overview-attention-message">
            <span className="admin-overview-attention-count">
              {attentionCount}
            </span>

            <p>
              {attentionCount === 0
                ? "There are no pending items requiring administrator attention."
                : `${attentionCount} ${
                    attentionCount === 1 ? "item requires" : "items require"
                  } administrator attention.`}
            </p>
          </div>
        </div>

        <div className="admin-overview-pattern" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="admin-summary-grid" aria-label="Community summary">
        <SummaryCard
          icon={<Users size={19} />}
          label="Registered people"
          value={statistics.registeredPeople}
        />

        <SummaryCard
          icon={<UserCheck size={19} />}
          label="Approved mentors"
          value={statistics.approvedMentors}
        />

        <SummaryCard
          icon={<ClipboardCheck size={19} />}
          label="Pending applications"
          value={statistics.pendingApplications}
          attention={statistics.pendingApplications > 0}
        />

        <SummaryCard
          icon={<GitPullRequest size={19} />}
          label="Pending requests"
          value={statistics.pendingRequests}
          attention={statistics.pendingRequests > 0}
        />
      </section>

      <section
        className="admin-attention-section"
        id="admin-needs-attention"
      >
        <div className="admin-attention-heading">
          <div>
            <span className="admin-section-eyebrow">NEEDS ATTENTION</span>

            <h2>Pending items</h2>

            <p>
              Mentor applications and mentorship requests waiting for
              administrator review.
            </p>
          </div>

        </div>

        {attentionItems.length === 0 ? (
          <div className="admin-attention-empty">
            <span>
              <ClipboardCheck size={21} />
            </span>

            <div>
              <strong>You are all caught up.</strong>
              <p>There are no pending applications or requests to review.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="admin-attention-table-wrapper">
              <table className="admin-attention-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Person</th>
                    <th>Details</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th aria-label="Action" />
                  </tr>
                </thead>

                <tbody>
                  {visibleAttentionItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="admin-attention-type">
                          {item.type}
                        </span>
                      </td>

                      <td>
                        <div className="admin-attention-person">
                          <strong>{item.personName}</strong>

                          {item.personEmail && <small>{item.personEmail}</small>}
                        </div>
                      </td>

                      <td className="admin-attention-detail">{item.detail}</td>

                      <td>{formatDate(item.submittedAt)}</td>

                      <td>
                        <StatusBadge value={item.status} />
                      </td>

                      <td className="admin-attention-action-cell">
                        <Link
                          to={item.reviewPath}
                          className="admin-review-link"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-table-pagination">
              <p>
                Showing {visibleStart}-{visibleEnd} of {attentionItems.length}
              </p>

              <div className="admin-pagination-controls">
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={() =>
                    setAttentionPage((currentPage) =>
                      Math.max(1, currentPage - 1),
                    )
                  }
                  disabled={safeAttentionPage === 1}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span>
                  Page {safeAttentionPage} of {totalAttentionPages}
                </span>

                <button
                  type="button"
                  aria-label="Next page"
                  onClick={() =>
                    setAttentionPage((currentPage) =>
                      Math.min(totalAttentionPages, currentPage + 1),
                    )
                  }
                  disabled={safeAttentionPage === totalAttentionPages}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function PeoplePage() {
  const [people, setPeople] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [peoplePage, setPeoplePage] = useState(1);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPeople() {
    setLoading(true);
    setError("");

    const { data, error: peopleError } = await supabase
      .from("profiles")
      .select(
        `
          id,
          full_name,
          email,
          phone_number,
          role,
          signup_intent,
          account_status,
          membership_verified,
          email_verified,
          created_at
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (peopleError) {
      console.error(peopleError);
      setError("We could not load registered people.");
      setLoading(false);
      return;
    }

    setPeople(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadPeople();
  }, []);

  function openConfirmation(person, action) {
    setSelectedPerson(person);
    setSelectedAction(action);
    setError("");
    setSuccess("");
  }

  function closeConfirmation() {
    if (processing) {
      return;
    }

    setSelectedPerson(null);
    setSelectedAction("");
  }

  async function confirmAction() {
    if (!selectedPerson || !selectedAction) {
      return;
    }

    const actionBeingCompleted = selectedAction;
    const personBeingUpdated = selectedPerson;

    setProcessing(true);
    setError("");
    setSuccess("");

    const { data, error: actionError } = await supabase.rpc(
      "admin_manage_member",
      {
        p_user_id: personBeingUpdated.id,
        p_action: actionBeingCompleted,
      },
    );

    if (actionError) {
      console.error(actionError);
      setError(actionError.message || "We could not update this account.");
      setProcessing(false);
      return;
    }

    setPeople((currentPeople) =>
      currentPeople.map((person) =>
        person.id === personBeingUpdated.id ? { ...person, ...data } : person,
      ),
    );

    setSuccess(getSuccessMessage(actionBeingCompleted));
    setSelectedPerson(null);
    setSelectedAction("");
    setProcessing(false);
  }

  const searchValue = searchTerm.trim().toLowerCase();

  const filteredPeople = people.filter((person) => {
    if (!searchValue) {
      return true;
    }

    return [
      person.full_name,
      person.email,
      person.role,
      person.signup_intent,
      getPersonAccountType(person),
      person.account_status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchValue);
  });

  const totalPeoplePages = Math.max(
    1,
    Math.ceil(
      filteredPeople.length /
        PEOPLE_PAGE_SIZE,
    ),
  );

  const safePeoplePage = Math.min(
    peoplePage,
    totalPeoplePages,
  );

  const firstPeopleIndex =
    (safePeoplePage - 1) *
    PEOPLE_PAGE_SIZE;

  const visiblePeople =
    filteredPeople.slice(
      firstPeopleIndex,
      firstPeopleIndex +
        PEOPLE_PAGE_SIZE,
    );

  const visiblePeopleStart =
    filteredPeople.length === 0
      ? 0
      : firstPeopleIndex + 1;

  const visiblePeopleEnd =
    Math.min(
      firstPeopleIndex +
        PEOPLE_PAGE_SIZE,
      filteredPeople.length,
    );

  if (loading) {
    return <AdminLoadingState />;
  }

  return (
    <section className="admin-list-section">
      <div className="admin-list-toolbar">
        <input
          type="search"
          value={searchTerm}
          placeholder="Search by name, email or role"
          aria-label="Search registered people"
          onChange={(event) => {
            setSearchTerm(
              event.target.value,
            );
            setPeoplePage(1);
          }}
        />

        <span>
          {filteredPeople.length}{" "}
          {filteredPeople.length === 1 ? "person" : "people"}
        </span>
      </div>

      {success && <p className="admin-success-message">{success}</p>}

      {error && <p className="form-error">{error}</p>}

      {people.length === 0 ? (
        <AdminEmptyState
          title="No registered people"
          description="Registered users will appear here."
        />
      ) : filteredPeople.length === 0 ? (
        <AdminEmptyState
          title="No matching people"
          description="Try another name, email or role."
        />
      ) : (
        <div className="admin-mobile-table-shell">
          <div className="admin-table-wrapper admin-responsive-table-desktop">
            <table className="admin-data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email address</th>
                <th>Account type</th>
                <th>Account status</th>
                <th>Membership</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {visiblePeople.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{person.full_name || "Name not provided"}</strong>
                  </td>

                  <td>{person.email}</td>

                  <td>
                    <StatusBadge
                      value={getPersonAccountTypeValue(person)}
                      label={getPersonAccountType(person)}
                    />
                  </td>

                  <td>
                    <StatusBadge
                      value={person.account_status}
                      label={
                        person.account_status === "pending"
                          ? "Awaiting verification"
                          : undefined
                      }
                    />
                  </td>

                  <td>
                    <StatusBadge
                      value={
                        person.membership_verified
                          ? "verified"
                          : "not_verified"
                      }
                      label={
                        person.membership_verified
                          ? "Verified"
                          : "Not verified"
                      }
                    />
                  </td>

                  <td>{formatDate(person.created_at)}</td>

                  <td>
                    <MemberActions
                      person={person}
                      onAction={openConfirmation}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          <div className="admin-responsive-mobile-list">
            {visiblePeople.map((person) => (
              <article className="admin-mobile-record-card" key={person.id}>
                <div className="admin-mobile-record-header">
                  <div>
                    <span>PERSON</span>
                    <strong>{person.full_name || "Name not provided"}</strong>
                    <small>{person.email}</small>
                  </div>

                  <StatusBadge
                    value={getPersonAccountTypeValue(person)}
                    label={getPersonAccountType(person)}
                  />
                </div>

                <dl className="admin-mobile-record-details">
                  <div>
                    <dt>Account status</dt>
                    <dd>
                      <StatusBadge
                        value={person.account_status}
                        label={
                          person.account_status === "pending"
                            ? "Awaiting verification"
                            : undefined
                        }
                      />
                    </dd>
                  </div>

                  <div>
                    <dt>Membership</dt>
                    <dd>
                      <StatusBadge
                        value={
                          person.membership_verified
                            ? "verified"
                            : "not_verified"
                        }
                        label={
                          person.membership_verified
                            ? "Verified"
                            : "Not verified"
                        }
                      />
                    </dd>
                  </div>

                  <div>
                    <dt>Registered</dt>
                    <dd>{formatDate(person.created_at)}</dd>
                  </div>
                </dl>

                <div className="admin-mobile-record-actions">
                  <MemberActions
                    person={person}
                    onAction={openConfirmation}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="admin-table-pagination">
            <p>
              Showing{" "}
              {visiblePeopleStart}-
              {visiblePeopleEnd} of{" "}
              {filteredPeople.length}
            </p>

            <div className="admin-pagination-controls">
              <button
                type="button"
                aria-label="Previous people page"
                onClick={() =>
                  setPeoplePage(
                    (currentPage) =>
                      Math.max(
                        1,
                        currentPage - 1,
                      ),
                  )
                }
                disabled={
                  safePeoplePage === 1
                }
              >
                <ChevronLeft
                  size={16}
                />
                Previous
              </button>

              <span>
                Page {safePeoplePage} of{" "}
                {totalPeoplePages}
              </span>

              <button
                type="button"
                aria-label="Next people page"
                onClick={() =>
                  setPeoplePage(
                    (currentPage) =>
                      Math.min(
                        totalPeoplePages,
                        currentPage + 1,
                      ),
                  )
                }
                disabled={
                  safePeoplePage ===
                  totalPeoplePages
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

      {selectedPerson && (
        <ConfirmationModal
          person={selectedPerson}
          action={selectedAction}
          processing={processing}
          onConfirm={confirmAction}
          onClose={closeConfirmation}
        />
      )}
    </section>
  );
}

function getPersonAccountType(person) {
  if (
    person.role === "admin" ||
    person.role === "safeguarding_lead"
  ) {
    return "Admin";
  }

  if (person.role === "mentor") {
    return "Mentor";
  }

  if (
    person.role === "mentee" &&
    person.signup_intent === "mentor"
  ) {
    return "Mentor";
  }

  return "Mentee";
}

function getPersonAccountTypeValue(person) {
  if (
    person.role === "admin" ||
    person.role === "safeguarding_lead"
  ) {
    return "admin";
  }

  if (person.role === "mentor") {
    return "mentor";
  }

  if (
    person.role === "mentee" &&
    person.signup_intent === "mentor"
  ) {
    return "mentor_applicant";
  }

  return "mentee";
}

function MemberActions({ person, onAction }) {
  const isAdministrator = ["admin", "safeguarding_lead"].includes(person.role);

  if (isAdministrator) {
    return <span className="admin-protected-account">Protected account</span>;
  }

  if (
    person.account_status === "pending" ||
    person.account_status === "rejected"
  ) {
    return (
      <div className="admin-row-actions">
        <button
          type="button"
          className="admin-verify-button"
          onClick={() => onAction(person, "verify")}
        >
          Verify membership
        </button>

        {person.account_status !== "rejected" && (
          <button
            type="button"
            className="admin-text-danger"
            onClick={() => onAction(person, "reject")}
          >
            Reject
          </button>
        )}
      </div>
    );
  }

  if (person.account_status === "active") {
    return (
      <button
        type="button"
        className="admin-text-danger"
        onClick={() => onAction(person, "suspend")}
      >
        Suspend
      </button>
    );
  }

  if (person.account_status === "suspended") {
    return (
      <button
        type="button"
        className="admin-verify-button"
        onClick={() => onAction(person, "reactivate")}
      >
        Reactivate
      </button>
    );
  }

  return null;
}

function ConfirmationModal({ person, action, processing, onConfirm, onClose }) {
  const actionInformation = {
    verify: {
      title: "Verify this membership?",
      description:
        "This will activate the member’s account and give them access to the platform.",
      button: "Verify membership",
      danger: false,
    },

    reject: {
      title: "Reject this membership?",
      description: "The member will not be allowed to access the platform.",
      button: "Reject membership",
      danger: true,
    },

    suspend: {
      title: "Suspend this account?",
      description:
        "The member will lose access until an administrator reactivates the account.",
      button: "Suspend account",
      danger: true,
    },

    reactivate: {
      title: "Reactivate this account?",
      description:
        "The member will regain access according to their membership status.",
      button: "Reactivate account",
      danger: false,
    },
  };

  const information = actionInformation[action];

  if (!information) {
    return null;
  }

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="admin-confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
      >
        <h2 id="confirmation-title">{information.title}</h2>

        <p>{information.description}</p>

        <div className="admin-selected-person">
          <strong>{person.full_name || "Name not provided"}</strong>
          <small>{person.email}</small>
        </div>

        <div className="admin-modal-actions">
          <button
            type="button"
            className="admin-modal-cancel-button"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>

          <button
            type="button"
            className={
              information.danger
                ? "admin-modal-confirm-button danger"
                : "admin-modal-confirm-button"
            }
            onClick={onConfirm}
            disabled={processing}
          >
            {processing ? "Please wait..." : information.button}
          </button>
        </div>
      </section>
    </div>
  );
}

function getSuccessMessage(action) {
  const messages = {
    verify: "The membership has been verified.",
    reject: "The membership has been rejected.",
    suspend: "The account has been suspended.",
    reactivate: "The account has been reactivated.",
  };

  return messages[action] || "The account was updated.";
}

function ApplicationsPage() {
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
      .select(
        `
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
            membership_verified
          )
        `,
      )
      .order("created_at", {
        ascending: false,
      });

    if (applicationError) {
      console.error(applicationError);
      setError("We could not load mentor applications.");
      setLoading(false);
      return;
    }

    const nextApplications = data ?? [];
    setApplications(nextApplications);

    if (keepModalOpen && selectedApplication) {
      const refreshedApplication = nextApplications.find(
        (application) => application.id === selectedApplication.id,
      );

      setSelectedApplication(refreshedApplication ?? null);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (!selectedApplication) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape" && !processing) {
        closeReview();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedApplication, processing]);

  function openReview(application) {
    setSelectedApplication(application);
    setReviewMode("");
    setFeedback(application.admin_feedback ?? "");
    setError("");
    setSuccess("");
  }

  function closeReview() {
    if (processing) {
      return;
    }

    setSelectedApplication(null);
    setReviewMode("");
    setFeedback("");
    setError("");
    setSuccess("");
  }

  async function submitReview(action) {
    if (!selectedApplication || selectedApplication.status !== "pending") {
      return;
    }

    if (action === "reject" && !feedback.trim()) {
      setError("Please provide feedback before rejecting this application.");
      setReviewMode("reject");
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
        p_feedback: action === "reject" ? feedback.trim() : null,
      },
    );

    if (reviewError) {
      console.error(reviewError);
      setError(
        reviewError.message || "We could not review this mentor application.",
      );
      setProcessing(false);
      return;
    }

    setSuccess(
      action === "approve"
        ? "The mentor application has been approved."
        : "The mentor application has been rejected.",
    );

    setReviewMode("");
    await loadApplications({ keepModalOpen: true });
    setProcessing(false);
  }

  const filteredApplications = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus =
        statusFilter === "all" || application.status === statusFilter;

      if (!matchesStatus) {
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

  const visibleStart =
    filteredApplications.length === 0 ? 0 : firstIndex + 1;

  const visibleEnd = Math.min(
    firstIndex + APPLICATION_PAGE_SIZE,
    filteredApplications.length,
  );

  if (loading) {
    return <AdminLoadingState />;
  }

  return (
    <>
      <section className="admin-list-section">
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
              { value: "all", label: "All" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={statusFilter === filter.value ? "active" : ""}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {success && <p className="admin-success-message">{success}</p>}

        {error && !selectedApplication && (
          <p className="form-error">{error}</p>
        )}

        {applications.length === 0 ? (
          <AdminEmptyState
            title="No mentor applications"
            description="Applications will appear here after eligible members submit them."
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

                      <td>
                        <StatusBadge value={application.status} />
                      </td>

                      <td>{formatDate(application.created_at)}</td>

                      <td className="admin-table-action-cell">
                        <button
                          type="button"
                          className="admin-review-button"
                          onClick={() => openReview(application)}
                        >
                          {application.status === "pending" ? "Review" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="admin-responsive-mobile-list">
              {visibleApplications.map((application) => (
                <article
                  className="admin-mobile-record-card"
                  key={application.id}
                >
                  <div className="admin-mobile-record-header">
                    <div>
                      <span>APPLICANT</span>
                      <strong>
                        {application.applicant?.full_name ||
                          "Name not provided"}
                      </strong>
                      <small>{application.applicant?.email || ""}</small>
                    </div>

                    <StatusBadge value={application.status} />
                  </div>

                  <dl className="admin-mobile-record-details">
                    <div>
                      <dt>Current role</dt>
                      <dd>
                        {application.job_title || "Not provided"}
                        {application.organisation
                          ? ` · ${application.organisation}`
                          : ""}
                      </dd>
                    </div>

                    <div>
                      <dt>Experience</dt>
                      <dd>{application.years_of_experience ?? 0} years</dd>
                    </div>

                    <div>
                      <dt>Mentoring areas</dt>
                      <dd>
                        {(application.expertise ?? [])
                          .slice(0, 3)
                          .join(", ") || "Not provided"}
                      </dd>
                    </div>

                    <div>
                      <dt>Submitted</dt>
                      <dd>{formatDate(application.created_at)}</dd>
                    </div>
                  </dl>

                  <div className="admin-mobile-record-actions">
                    <button
                      type="button"
                      className="admin-review-button"
                      onClick={() => openReview(application)}
                    >
                      {application.status === "pending" ? "Review" : "View"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="admin-table-pagination">
              <p>
                Showing {visibleStart}-{visibleEnd} of {filteredApplications.length}
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

                <span>
                  Page {safePage} of {totalPages}
                </span>

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
          onSubmitReview={submitReview}
          onClose={closeReview}
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
  onSubmitReview,
  onClose,
}) {
  const isPending = application.status === "pending";

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
          <span>Submitted {formatDate(application.created_at)}</span>
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
              .map((length) => `${length} minutes`)
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

        {application.admin_feedback && (
          <div className="admin-review-existing-feedback">
            <strong>Administrator feedback</strong>
            <p>{application.admin_feedback}</p>
          </div>
        )}

        {error && (
          <p className="form-error admin-review-message" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="admin-success-message admin-review-message">
            {success}
          </p>
        )}

        {isPending && reviewMode === "reject" && (
          <label className="admin-rejection-field">
            <span>Feedback for the applicant</span>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows="4"
              placeholder="Explain what needs to change before they apply again."
              disabled={processing}
            />
          </label>
        )}

        <div className="admin-review-modal-actions">
          {isPending ? (
            reviewMode === "reject" ? (
              <>
                <button
                  type="button"
                  className="admin-modal-cancel-button"
                  onClick={() => setReviewMode("")}
                  disabled={processing}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="admin-modal-confirm-button danger"
                  onClick={() => onSubmitReview("reject")}
                  disabled={processing}
                >
                  {processing ? "Rejecting..." : "Reject application"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="admin-modal-cancel-button admin-reject-application-button"
                  onClick={() => setReviewMode("reject")}
                  disabled={processing}
                >
                  Reject
                </button>

                <button
                  type="button"
                  className="admin-modal-confirm-button admin-approve-application-button"
                  onClick={() => onSubmitReview("approve")}
                  disabled={processing}
                >
                  {processing ? "Approving..." : "Approve application"}
                </button>
              </>
            )
          ) : (
            <button
              type="button"
              className="admin-modal-confirm-button"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </section>
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

function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
      setLoading(true);
      setError("");

      const { data, error: requestError } = await supabase
        .from("mentorship_requests")
        .select(
          `
            id,
            mentoring_area,
            goal_statement,
            status,
            created_at,
            mentee:profiles!mentorship_requests_mentee_id_fkey (
              full_name,
              email
            ),
            mentor:profiles!mentorship_requests_mentor_id_fkey (
              full_name,
              email
            )
          `,
        )
        .order("created_at", {
          ascending: false,
        });

      if (!isMounted) {
        return;
      }

      if (requestError) {
        console.error(requestError);
        setError("We could not load mentorship requests.");
        setLoading(false);
        return;
      }

      setRequests(data ?? []);
      setLoading(false);
    }

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const filteredRequests = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter = requestMatchesAdminFilter(
        request.status,
        statusFilter,
      );

      if (!matchesFilter) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      return [
        request.mentee?.full_name,
        request.mentee?.email,
        request.mentor?.full_name,
        request.mentor?.email,
        request.mentoring_area,
        request.goal_statement,
        request.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [requests, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / REQUEST_PAGE_SIZE),
  );

  const safePage = Math.min(currentPage, totalPages);
  const firstIndex = (safePage - 1) * REQUEST_PAGE_SIZE;

  const visibleRequests = filteredRequests.slice(
    firstIndex,
    firstIndex + REQUEST_PAGE_SIZE,
  );

  const visibleStart =
    filteredRequests.length === 0 ? 0 : firstIndex + 1;

  const visibleEnd = Math.min(
    firstIndex + REQUEST_PAGE_SIZE,
    filteredRequests.length,
  );

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return <AdminErrorState message={error} />;
  }

  return (
    <section className="admin-list-section admin-requests-page">
      <div className="admin-request-toolbar">
        <div className="admin-search-field admin-request-search">
          <Search size={16} aria-hidden="true" />

          <input
            type="search"
            value={searchTerm}
            placeholder="Search mentee, mentor or mentoring area"
            aria-label="Search mentorship requests"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div
          className="admin-request-filters"
          aria-label="Filter mentorship requests"
        >
          {[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "active", label: "Active" },
            { value: "closed", label: "Closed" },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={statusFilter === filter.value ? "active" : ""}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-request-results-summary">
        <span>
          {filteredRequests.length}{" "}
          {filteredRequests.length === 1 ? "request" : "requests"}
        </span>

        <small>
          Pending includes clarification requests. Active contains accepted
          relationships. Closed contains declined, referred and withdrawn
          requests.
        </small>
      </div>

      {requests.length === 0 ? (
        <AdminEmptyState
          title="No mentorship requests"
          description="Requests submitted by mentees will appear here."
        />
      ) : filteredRequests.length === 0 ? (
        <AdminEmptyState
          title="No matching requests"
          description="Try another search term or status filter."
        />
      ) : (
        <div className="admin-request-table-shell">
          <div className="admin-table-wrapper admin-table-wrapper--flush admin-request-desktop-table">
            <table className="admin-data-table admin-request-table">
              <thead>
                <tr>
                  <th>Mentee</th>
                  <th>Mentor</th>
                  <th>Mentoring area</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th aria-label="Action" />
                </tr>
              </thead>

              <tbody>
                {visibleRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.mentee?.full_name || "Mentee"}</strong>
                      <small>{request.mentee?.email || ""}</small>
                    </td>

                    <td>
                      <strong>{request.mentor?.full_name || "Mentor"}</strong>
                      <small>{request.mentor?.email || ""}</small>
                    </td>

                    <td className="admin-request-area-cell">
                      {request.mentoring_area || "Not provided"}
                    </td>

                    <td>
                      <StatusBadge value={request.status} />
                    </td>

                    <td>{formatDate(request.created_at)}</td>

                    <td className="admin-table-action-cell">
                      <Link
                        to={`${ADMIN_ROUTES.requests}/${request.id}`}
                        className="admin-review-button admin-request-view-button"
                      >
                        <Eye size={14} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-request-mobile-list">
            {visibleRequests.map((request) => (
              <article className="admin-request-mobile-card" key={request.id}>
                <div className="admin-request-mobile-card-header">
                  <div>
                    <span>Mentee</span>
                    <strong>{request.mentee?.full_name || "Mentee"}</strong>
                    <small>{request.mentee?.email || ""}</small>
                  </div>

                  <StatusBadge value={request.status} />
                </div>

                <dl>
                  <div>
                    <dt>Mentor</dt>
                    <dd>{request.mentor?.full_name || "Mentor"}</dd>
                  </div>

                  <div>
                    <dt>Mentoring area</dt>
                    <dd>{request.mentoring_area || "Not provided"}</dd>
                  </div>

                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDate(request.created_at)}</dd>
                  </div>
                </dl>

                <Link
                  to={`${ADMIN_ROUTES.requests}/${request.id}`}
                  className="admin-request-mobile-view"
                >
                  <Eye size={14} />
                  View details
                </Link>
              </article>
            ))}
          </div>

          <div className="admin-table-pagination">
            <p>
              Showing {visibleStart}-{visibleEnd} of {filteredRequests.length}
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

              <span>
                Page {safePage} of {totalPages}
              </span>

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
  );
}

function RequestDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const requestId = location.pathname
    .replace(/\/+$/, "")
    .split("/")
    .pop();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRequestDetails() {
      setLoading(true);
      setError("");

      const detailedSelection = `
        id,
        mentee_id,
        mentor_id,
        mentoring_area,
        goal_statement,
        reason_for_choosing_mentor,
        preferred_times,
        status,
        decline_reason,
        declined_at,
        referral_reason,
        referred_at,
        withdrawal_reason,
        created_at,
        updated_at,
        mentee:profiles!mentorship_requests_mentee_id_fkey (
          full_name,
          email
        ),
        mentor:profiles!mentorship_requests_mentor_id_fkey (
          full_name,
          email
        )
      `;

      let result = await supabase
        .from("mentorship_requests")
        .select(detailedSelection)
        .eq("id", requestId)
        .maybeSingle();

      /*
        Older databases may not have every request-history column yet.
        Fall back to the core request fields instead of breaking the page.
      */
      if (result.error) {
        console.warn(
          "Detailed request fields were unavailable. Falling back to core fields.",
          result.error,
        );

        result = await supabase
          .from("mentorship_requests")
          .select(
            `
              id,
              mentee_id,
              mentor_id,
              mentoring_area,
              goal_statement,
              status,
              created_at,
              mentee:profiles!mentorship_requests_mentee_id_fkey (
                full_name,
                email
              ),
              mentor:profiles!mentorship_requests_mentor_id_fkey (
                full_name,
                email
              )
            `,
          )
          .eq("id", requestId)
          .maybeSingle();
      }

      if (!isMounted) {
        return;
      }

      if (result.error) {
        console.error(result.error);
        setError("We could not load this mentorship request.");
        setLoading(false);
        return;
      }

      if (!result.data) {
        setError("This mentorship request could not be found.");
        setLoading(false);
        return;
      }

      setRequest(result.data);
      setLoading(false);
    }

    loadRequestDetails();

    return () => {
      isMounted = false;
    };
  }, [requestId]);

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return (
      <section className="admin-request-details-page">
        <button
          type="button"
          className="admin-request-back-button"
          onClick={() => navigate(ADMIN_ROUTES.requests)}
        >
          <ArrowLeft size={16} />
          Back to requests
        </button>

        <AdminErrorState message={error} />
      </section>
    );
  }

  return (
    <section className="admin-request-details-page">
      <button
        type="button"
        className="admin-request-back-button"
        onClick={() => navigate(ADMIN_ROUTES.requests)}
      >
        <ArrowLeft size={16} />
        Back to requests
      </button>

      <div className="admin-request-details-hero">
        <div>
          <span className="admin-section-eyebrow">MENTORSHIP REQUEST</span>

          <h2>{request.mentoring_area || "Mentorship request"}</h2>

          <p>
            Submitted {formatDate(request.created_at)}
          </p>
        </div>

        <StatusBadge value={request.status} />
      </div>

      <div className="admin-request-participants">
        <RequestParticipant
          label="Mentee"
          name={request.mentee?.full_name || "Mentee"}
          email={request.mentee?.email || ""}
        />

        <RequestParticipant
          label="Mentor"
          name={request.mentor?.full_name || "Mentor"}
          email={request.mentor?.email || ""}
        />
      </div>

      <div className="admin-request-details-grid">
        <RequestInformation
          label="Mentoring area"
          value={request.mentoring_area}
        />

        <RequestInformation
          label="Current status"
          value={formatStatusLabel(request.status)}
        />

        <RequestInformation
          label="Submitted"
          value={formatDate(request.created_at)}
        />

        {request.updated_at && (
          <RequestInformation
            label="Last updated"
            value={formatDate(request.updated_at)}
          />
        )}
      </div>

      <div className="admin-request-copy-section">
        <span>GOAL</span>
        <p>{request.goal_statement || "No goal was provided."}</p>
      </div>

      <div className="admin-request-copy-section">
        <span>WHY THIS MENTOR WAS CHOSEN</span>
        <p>
          {request.reason_for_choosing_mentor ||
            "This information is not available on this request."}
        </p>
      </div>

      {request.preferred_times && (
        <div className="admin-request-copy-section">
          <span>PREFERRED TIMES</span>
          <p>{request.preferred_times}</p>
        </div>
      )}

      <RequestOutcomeHistory request={request} />
    </section>
  );
}

function RequestParticipant({ label, name, email }) {
  return (
    <article className="admin-request-participant-card">
      <span>{label}</span>
      <strong>{name}</strong>
      {email && <small>{email}</small>}
    </article>
  );
}

function RequestInformation({ label, value }) {
  return (
    <div className="admin-request-information">
      <span>{label}</span>
      <strong>{value || "Not available"}</strong>
    </div>
  );
}

function RequestOutcomeHistory({ request }) {
  const historyItems = [
    {
      key: "submitted",
      title: "Request submitted",
      description: "The mentee submitted this mentorship request.",
      date: request.created_at,
    },
  ];

  if (request.status === "clarification_requested") {
    historyItems.push({
      key: "clarification",
      title: "Clarification requested",
      description:
        "The mentor requested more information from the mentee.",
      date: request.updated_at,
    });
  }

  if (request.status === "accepted") {
    historyItems.push({
      key: "accepted",
      title: "Request accepted",
      description:
        "The mentor accepted the request and the mentorship became active.",
      date: request.updated_at,
    });
  }

  if (request.status === "declined") {
    historyItems.push({
      key: "declined",
      title: "Request declined",
      description:
        request.decline_reason ||
        "A decline reason is not available on this request.",
      date: request.declined_at || request.updated_at,
    });
  }

  if (request.status === "referred") {
    historyItems.push({
      key: "referred",
      title: "Mentee referred",
      description:
        request.referral_reason ||
        "A referral reason is not available on this request.",
      date: request.referred_at || request.updated_at,
    });
  }

  if (request.status === "withdrawn") {
    historyItems.push({
      key: "withdrawn",
      title: "Request withdrawn",
      description:
        request.withdrawal_reason ||
        "A withdrawal reason is not available on this request.",
      date: request.updated_at,
    });
  }

  return (
    <section className="admin-request-history">
      <div className="admin-request-history-heading">
        <span className="admin-section-eyebrow">REQUEST HISTORY</span>
        <h3>Request activity</h3>
      </div>

      <div className="admin-request-history-list">
        {historyItems.map((item) => (
          <article key={item.key} className="admin-request-history-item">
            <span className="admin-request-history-marker" aria-hidden="true" />

            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              {item.date && <small>{formatDate(item.date)}</small>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function requestMatchesAdminFilter(status, filter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "pending") {
    return ["pending", "clarification_requested"].includes(status);
  }

  if (filter === "active") {
    return status === "accepted";
  }

  if (filter === "closed") {
    return ["declined", "referred", "withdrawn"].includes(status);
  }

  return true;
}

function formatStatusLabel(status) {
  return String(status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}


function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      setLoading(true);
      setError("");

      const { data: sessionData, error: sessionError } = await supabase
        .from("mentorship_sessions")
        .select(
          `
            id,
            request_id,
            mentee_id,
            mentor_id,
            scheduled_start,
            scheduled_end,
            meeting_format,
            status,
            created_at
          `,
        )
        .order("scheduled_start", {
          ascending: false,
        });

      if (!isMounted) {
        return;
      }

      if (sessionError) {
        console.error(sessionError);
        setError("We could not load mentorship sessions.");
        setLoading(false);
        return;
      }

      const rawSessions = sessionData ?? [];

      const participantIds = [
        ...new Set(
          rawSessions.flatMap((session) =>
            [session.mentee_id, session.mentor_id].filter(Boolean),
          ),
        ),
      ];

      let profileMap = new Map();

      if (participantIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", participantIds);

        if (profileError) {
          console.warn(
            "Sessions loaded, but participant profiles could not be loaded.",
            profileError,
          );
        } else {
          profileMap = new Map(
            (profileData ?? []).map((profile) => [profile.id, profile]),
          );
        }
      }

      const enrichedSessions = rawSessions.map((session) => ({
        ...session,
        mentee: profileMap.get(session.mentee_id) ?? null,
        mentor: profileMap.get(session.mentor_id) ?? null,
      }));

      setSessions(enrichedSessions);
      setLoading(false);
    }

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const filteredSessions = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return sessions.filter((session) => {
      if (!sessionMatchesAdminFilter(session, statusFilter)) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      return [
        session.mentee?.full_name,
        session.mentee?.email,
        session.mentor?.full_name,
        session.mentor?.email,
        session.meeting_format,
        session.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue);
    });
  }, [sessions, searchTerm, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSessions.length / SESSION_PAGE_SIZE),
  );

  const safePage = Math.min(currentPage, totalPages);
  const firstIndex = (safePage - 1) * SESSION_PAGE_SIZE;

  const visibleSessions = filteredSessions.slice(
    firstIndex,
    firstIndex + SESSION_PAGE_SIZE,
  );

  const visibleStart =
    filteredSessions.length === 0 ? 0 : firstIndex + 1;

  const visibleEnd = Math.min(
    firstIndex + SESSION_PAGE_SIZE,
    filteredSessions.length,
  );

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return <AdminErrorState message={error} />;
  }

  return (
    <section className="admin-sessions-page">
      <div className="admin-session-toolbar">
        <div className="admin-search-field admin-session-search">
          <Search size={16} aria-hidden="true" />

          <input
            type="search"
            value={searchTerm}
            placeholder="Search mentor, mentee or meeting format"
            aria-label="Search mentorship sessions"
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div
          className="admin-session-filters"
          aria-label="Filter mentorship sessions"
        >
          {[
            { value: "all", label: "All" },
            { value: "upcoming", label: "Upcoming" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
            {
              value: "reschedule_requested",
              label: "Reschedule requested",
            },
          ].map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={statusFilter === filter.value ? "active" : ""}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-session-results-summary">
        <span>
          {filteredSessions.length}{" "}
          {filteredSessions.length === 1 ? "session" : "sessions"}
        </span>

        <small>
          Administrators can monitor session activity here without changing
          normal mentor and mentee arrangements.
        </small>
      </div>

      {sessions.length === 0 ? (
        <AdminEmptyState
          title="No mentorship sessions"
          description="Sessions created by mentors will appear here."
        />
      ) : filteredSessions.length === 0 ? (
        <AdminEmptyState
          title="No matching sessions"
          description="Try another search term or session filter."
        />
      ) : (
        <div className="admin-session-table-shell">
          <div className="admin-session-desktop-table">
            <table className="admin-data-table admin-session-table">
              <thead>
                <tr>
                  <th>Mentor</th>
                  <th>Mentee</th>
                  <th>Date & time</th>
                  <th>Format</th>
                  <th>Status</th>
                  <th aria-label="Action" />
                </tr>
              </thead>

              <tbody>
                {visibleSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <strong>
                        {session.mentor?.full_name || "Mentor"}
                      </strong>
                      {session.mentor?.email && (
                        <small>{session.mentor.email}</small>
                      )}
                    </td>

                    <td>
                      <strong>
                        {session.mentee?.full_name || "Mentee"}
                      </strong>
                      {session.mentee?.email && (
                        <small>{session.mentee.email}</small>
                      )}
                    </td>

                    <td>{formatDateTime(session.scheduled_start)}</td>

                    <td>{formatMeetingFormat(session.meeting_format)}</td>

                    <td>
                      <StatusBadge value={session.status} />
                    </td>

                    <td className="admin-table-action-cell">
                      <Link
                        to={`${ADMIN_ROUTES.sessions}/${session.id}`}
                        className="admin-review-button admin-session-view-button"
                      >
                        <Eye size={14} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-session-mobile-list">
            {visibleSessions.map((session) => (
              <article className="admin-session-mobile-card" key={session.id}>
                <div className="admin-session-mobile-card-header">
                  <div>
                    <span>MENTOR</span>
                    <strong>
                      {session.mentor?.full_name || "Mentor"}
                    </strong>
                    {session.mentor?.email && (
                      <small>{session.mentor.email}</small>
                    )}
                  </div>

                  <StatusBadge value={session.status} />
                </div>

                <dl>
                  <div>
                    <dt>Mentee</dt>
                    <dd>{session.mentee?.full_name || "Mentee"}</dd>
                  </div>

                  <div>
                    <dt>Date & time</dt>
                    <dd>{formatDateTime(session.scheduled_start)}</dd>
                  </div>

                  <div>
                    <dt>Format</dt>
                    <dd>{formatMeetingFormat(session.meeting_format)}</dd>
                  </div>
                </dl>

                <Link
                  to={`${ADMIN_ROUTES.sessions}/${session.id}`}
                  className="admin-session-mobile-view"
                >
                  <Eye size={14} />
                  View details
                </Link>
              </article>
            ))}
          </div>

          <div className="admin-table-pagination">
            <p>
              Showing {visibleStart}-{visibleEnd} of {filteredSessions.length}
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

              <span>
                Page {safePage} of {totalPages}
              </span>

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
  );
}

function SessionDetailsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const sessionId = location.pathname
    .replace(/\/+$/, "")
    .split("/")
    .pop();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSessionDetails() {
      setLoading(true);
      setError("");

      const detailedSelection = `
        id,
        request_id,
        mentee_id,
        mentor_id,
        scheduled_start,
        scheduled_end,
        meeting_format,
        meeting_link,
        location_guidance,
        status,
        attendance,
        created_at,
        updated_at
      `;

      let result = await supabase
        .from("mentorship_sessions")
        .select(detailedSelection)
        .eq("id", sessionId)
        .maybeSingle();

      /*
        Keep this page compatible with older session schemas that may not
        contain attendance, meeting_link, location_guidance or updated_at.
      */
      if (result.error) {
        console.warn(
          "Detailed session fields were unavailable. Falling back to core fields.",
          result.error,
        );

        result = await supabase
          .from("mentorship_sessions")
          .select(
            `
              id,
              request_id,
              mentee_id,
              mentor_id,
              scheduled_start,
              scheduled_end,
              meeting_format,
              status,
              created_at
            `,
          )
          .eq("id", sessionId)
          .maybeSingle();
      }

      if (!isMounted) {
        return;
      }

      if (result.error) {
        console.error(result.error);
        setError("We could not load this mentorship session.");
        setLoading(false);
        return;
      }

      if (!result.data) {
        setError("This mentorship session could not be found.");
        setLoading(false);
        return;
      }

      const participantIds = [
        result.data.mentee_id,
        result.data.mentor_id,
      ].filter(Boolean);

      let profileMap = new Map();

      if (participantIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", participantIds);

        if (profileError) {
          console.warn(
            "Session loaded, but participant profiles could not be loaded.",
            profileError,
          );
        } else {
          profileMap = new Map(
            (profileData ?? []).map((profile) => [profile.id, profile]),
          );
        }
      }

      setSession({
        ...result.data,
        mentee: profileMap.get(result.data.mentee_id) ?? null,
        mentor: profileMap.get(result.data.mentor_id) ?? null,
      });

      setLoading(false);
    }

    loadSessionDetails();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return (
      <section className="admin-session-details-page">
        <button
          type="button"
          className="admin-request-back-button"
          onClick={() => navigate(ADMIN_ROUTES.sessions)}
        >
          <ArrowLeft size={16} />
          Back to sessions
        </button>

        <AdminErrorState message={error} />
      </section>
    );
  }

  return (
    <section className="admin-session-details-page">
      <button
        type="button"
        className="admin-request-back-button"
        onClick={() => navigate(ADMIN_ROUTES.sessions)}
      >
        <ArrowLeft size={16} />
        Back to sessions
      </button>

      <div className="admin-session-details-hero">
        <div>
          <span className="admin-section-eyebrow">MENTORSHIP SESSION</span>

          <h2>{formatDateTime(session.scheduled_start)}</h2>

          <p>
            {session.mentor?.full_name || "Mentor"} with{" "}
            {session.mentee?.full_name || "Mentee"}
          </p>
        </div>

        <StatusBadge value={session.status} />
      </div>

      <div className="admin-session-participants">
        <RequestParticipant
          label="Mentor"
          name={session.mentor?.full_name || "Mentor"}
          email={session.mentor?.email || ""}
        />

        <RequestParticipant
          label="Mentee"
          name={session.mentee?.full_name || "Mentee"}
          email={session.mentee?.email || ""}
        />
      </div>

      <div className="admin-session-details-grid">
        <RequestInformation
          label="Starts"
          value={formatDateTime(session.scheduled_start)}
        />

        <RequestInformation
          label="Ends"
          value={formatDateTime(session.scheduled_end)}
        />

        <RequestInformation
          label="Meeting format"
          value={formatMeetingFormat(session.meeting_format)}
        />

        <RequestInformation
          label="Status"
          value={formatStatusLabel(session.status)}
        />

        {session.attendance && (
          <RequestInformation
            label="Attendance"
            value={formatStatusLabel(session.attendance)}
          />
        )}

        <RequestInformation
          label="Created"
          value={formatDate(session.created_at)}
        />
      </div>

      {session.meeting_link && (
        <div className="admin-session-copy-section">
          <span>MEETING LINK</span>
          <a
            href={session.meeting_link}
            target="_blank"
            rel="noreferrer"
          >
            {session.meeting_link}
          </a>
        </div>
      )}

      {session.location_guidance && (
        <div className="admin-session-copy-section">
          <span>LOCATION GUIDANCE</span>
          <p>{session.location_guidance}</p>
        </div>
      )}

      <div className="admin-session-note">
        <CalendarDays size={18} />

        <div>
          <strong>Oversight only</strong>
          <p>
            Session scheduling remains between the mentor and mentee. This
            admin page is for monitoring the relationship and session record.
          </p>
        </div>
      </div>
    </section>
  );
}

function sessionMatchesAdminFilter(session, filter) {
  if (filter === "all") {
    return true;
  }

  const normalizedStatus = String(session.status || "")
    .toLowerCase()
    .replaceAll("-", "_");

  if (filter === "completed") {
    return normalizedStatus === "completed";
  }

  if (filter === "cancelled") {
    return ["cancelled", "canceled"].includes(normalizedStatus);
  }

  if (filter === "reschedule_requested") {
    return normalizedStatus === "reschedule_requested";
  }

  if (filter === "upcoming") {
    const scheduledTime = session.scheduled_start
      ? new Date(session.scheduled_start).getTime()
      : 0;

    const closedStatuses = [
      "completed",
      "cancelled",
      "canceled",
    ];

    return (
      scheduledTime >= Date.now() &&
      !closedStatuses.includes(normalizedStatus)
    );
  }

  return true;
}

function formatMeetingFormat(value) {
  if (!value) {
    return "Not provided";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function SummaryCard({ icon, label, value, attention = false }) {
  return (
    <article
      className={`admin-summary-card ${
        attention ? "admin-summary-card-attention" : ""
      }`}
    >
      <div className="admin-summary-card-top">
        <span className="admin-summary-card-icon">{icon}</span>

        {attention && <span className="admin-summary-card-dot" />}
      </div>

      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ value, label }) {
  const normalizedValue = String(
    value || "unknown",
  ).replaceAll("_", "-");

  const text =
    label ||
    String(value || "unknown").replaceAll(
      "_",
      " ",
    );

  return (
    <span
      className={`admin-status-badge status-${normalizedValue}`}
    >
      <i
        className="admin-status-dot"
        aria-hidden="true"
      />

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

function AdminErrorState({ message }) {
  return (
    <section className="admin-state-card">
      <h2>Unable to load information</h2>
      <p>{message}</p>
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

export default AdminDashboard;
