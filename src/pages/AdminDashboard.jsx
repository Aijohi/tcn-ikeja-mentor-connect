import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  GitPullRequest,
  History,
  MessageCircle,
  Search,
  Send,
  Star,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

import "./AdminDashboard.css";
import "./AdminRequests.css";
import "./AdminSessions.css";
import "./AdminReviews.css";
import "./AdminMessages.css";
import "./AdminActivity.css";

const ATTENTION_PAGE_SIZE = 5;
const PEOPLE_PAGE_SIZE = 10;
const APPLICATION_PAGE_SIZE = 10;
const REQUEST_PAGE_SIZE = 10;
const SESSION_PAGE_SIZE = 10;
const REVIEW_PAGE_SIZE = 10;
const ACTIVITY_PAGE_SIZE = 15;

const ADMIN_ROUTES = {
  overview: "/admin/dashboard",
  people: "/admin/dashboard/people",
  applications: "/admin/dashboard/mentor-applications",
  requests: "/admin/dashboard/mentorship-requests",
  sessions: "/admin/dashboard/sessions",
  messages: "/admin/dashboard/messages",
  reviews: "/admin/dashboard/reviews",
  activity: "/admin/dashboard/activity",
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

  messages: {
    title: "Messages",
    description:
      "Contact mentors and mentees through a private administrative messaging channel.",
  },

  reviews: {
    title: "Feedback & testimonials",
    description:
      "Review mentee feedback and manage which eligible reviews may appear on the public website.",
  },

  activity: {
    title: "Activity log",
    description:
      "Review important administrator actions recorded across Mentor Connect.",
  },

  sessionDetails: {
    title: "Session details",
    description:
      "Review the participants, schedule and session information.",
  },
};

const sectionPermissions = {
  overview: "overview.view",
  people: "people.view",
  applications: "applications.view",
  requests: "requests.view",
  requestDetails: "requests.view",
  sessions: "sessions.view",
  sessionDetails: "sessions.view",
  messages: "messages.view",
  reviews: "feedback.view",
  activity: "activity.view",
};

function hasAdminPermission(
  permissions,
  permission,
) {
  if (!permission) {
    return true;
  }

  return (
    Array.isArray(permissions) &&
    (
      permissions.includes("*") ||
      permissions.includes(
        permission,
      )
    )
  );
}

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

  if (cleanPath === ADMIN_ROUTES.messages) {
    return "messages";
  }

  if (cleanPath === ADMIN_ROUTES.reviews) {
    return "reviews";
  }

  if (cleanPath === ADMIN_ROUTES.activity) {
    return "activity";
  }

  return "overview";
}

function AdminDashboard() {
  const location = useLocation();
  const { user } = useAuth();

  const [
    adminPermissions,
    setAdminPermissions,
  ] = useState([]);

  const [
    adminOperationalRole,
    setAdminOperationalRole,
  ] = useState("");

  const [
    adminAccessLevel,
    setAdminAccessLevel,
  ] = useState("");

  const [
    adminAccessLoading,
    setAdminAccessLoading,
  ] = useState(true);

  const [
    adminAccessError,
    setAdminAccessError,
  ] = useState("");

  const section =
    getAdminSection(
      location.pathname,
    );

  const currentPage =
    pageInformation[section];

  useEffect(() => {
    let isMounted = true;

    async function loadAdminAccess() {
      if (!user?.id) {
        return;
      }

      setAdminAccessLoading(
        true,
      );

      setAdminAccessError("");

      const {
        data,
        error,
      } = await supabase.rpc(
        "get_my_admin_access",
      );

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load admin permissions:",
          error,
        );

        setAdminPermissions(
          [],
        );

        setAdminAccessError(
          "We could not load your administrator permissions.",
        );

        setAdminAccessLoading(
          false,
        );

        return;
      }

      const access =
        Array.isArray(data)
          ? data[0]
          : data;

      setAdminPermissions(
        Array.isArray(
          access?.permissions,
        )
          ? access.permissions
          : [],
      );

      setAdminOperationalRole(
        access?.operational_role ?? "",
      );

      setAdminAccessLevel(
        access?.access_level ?? "",
      );

      setAdminAccessLoading(
        false,
      );
    }

    loadAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const requiredPermission =
    sectionPermissions[section];

  const canOpenSection =
    hasAdminPermission(
      adminPermissions,
      requiredPermission,
    );

  const canManageAccounts =
    hasAdminPermission(
      adminPermissions,
      "people.restrict",
    );

  const canRecommendApplications =
    hasAdminPermission(
      adminPermissions,
      "applications.recommend",
    );

  const canSecondSignoffApplications =
    hasAdminPermission(
      adminPermissions,
      "applications.second_signoff",
    );

  const isFullAccessAdmin =
    adminAccessLevel === "full" ||
    adminPermissions.includes("*");

  const canSendAdminMessages =
    hasAdminPermission(
      adminPermissions,
      "messages.send",
    );

  const canPublishTestimonials =
    hasAdminPermission(
      adminPermissions,
      "testimonials.publish",
    );

  if (adminAccessLoading) {
    return (
      <DashboardLayout
        title={currentPage.title}
        description={
          currentPage.description
        }
        adminPermissions={[]}
      >
        <AdminLoadingState />
      </DashboardLayout>
    );
  }

  if (adminAccessError) {
    return (
      <DashboardLayout
        title={currentPage.title}
        description={
          currentPage.description
        }
        adminPermissions={[]}
      >
        <AdminErrorState
          message={
            adminAccessError
          }
        />
      </DashboardLayout>
    );
  }

  if (!canOpenSection) {
    return (
      <DashboardLayout
        title="Access restricted"
        description="This section is not included in your administrator role."
        adminPermissions={
          adminPermissions
        }
      >
        <AdminAccessDenied />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={currentPage.title}
      description={
        currentPage.description
      }
      adminPermissions={
        adminPermissions
      }
    >
      {section === "people" && (
        <PeoplePage
          canManageAccounts={
            canManageAccounts
          }
        />
      )}

      {section ===
        "applications" && (
        <ApplicationsPage
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
      )}

      {section === "requests" && (
        <RequestsPage />
      )}

      {section ===
        "requestDetails" && (
        <RequestDetailsPage />
      )}

      {section === "sessions" && (
        <SessionsPage />
      )}

      {section === "messages" && (
        <MessagesPage
          canSendMessages={
            canSendAdminMessages
          }
        />
      )}

      {section === "reviews" && (
        <ReviewsPage
          canPublishTestimonials={
            canPublishTestimonials
          }
        />
      )}

      {section === "activity" && (
        <ActivityLogPage />
      )}

      {section ===
        "sessionDetails" && (
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

function PeoplePage({ canManageAccounts = false }) {
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
                    {canManageAccounts ? (
                      <MemberActions
                        person={person}
                        onAction={openConfirmation}
                      />
                    ) : (
                      <span className="admin-protected-account">
                        View only
                      </span>
                    )}
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
                  {canManageAccounts ? (
                    <MemberActions
                      person={person}
                      onAction={openConfirmation}
                    />
                  ) : (
                    <span className="admin-protected-account">
                      View only
                    </span>
                  )}
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

function ApplicationsPage({
  canRecommendApplications = false,
  canSecondSignoffApplications = false,
  isFullAccessAdmin = false,
  adminOperationalRole = "",
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
      const {
        data: reviewerData,
        error: reviewerError,
      } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", reviewerIds);

      if (reviewerError) {
        console.warn(
          "Applications loaded, but reviewer details could not be loaded.",
          reviewerError,
        );
      } else {
        reviewerMap = new Map(
          (reviewerData ?? []).map((profile) => [
            profile.id,
            profile,
          ]),
        );
      }
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
    setFeedback("");
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

  function canTakeAction(application) {
    if (application.status !== "pending") {
      return false;
    }

    if (!application.onboarding_recommendation) {
      return (
        canRecommendApplications ||
        (isFullAccessAdmin && canSecondSignoffApplications)
      );
    }

    if (!application.operations_decision) {
      return canSecondSignoffApplications;
    }

    return false;
  }

  async function submitReview(action) {
    if (
      !selectedApplication ||
      selectedApplication.status !== "pending"
    ) {
      return;
    }

    const isRecommendation = [
      "recommend_approve",
      "recommend_reject",
    ].includes(action);

    const isFinalDecision = [
      "approve",
      "reject",
    ].includes(action);

    if (
      isRecommendation &&
      !canRecommendApplications
    ) {
      setError(
        "Your administrator role cannot make the Mentor Onboarding recommendation.",
      );
      return;
    }

    if (
      isFinalDecision &&
      !canSecondSignoffApplications
    ) {
      setError(
        "Your administrator role cannot give the final Operations and Governance decision.",
      );
      return;
    }

    if (
      isFinalDecision &&
      !selectedApplication.onboarding_recommendation &&
      !isFullAccessAdmin
    ) {
      setError(
        "The Mentor Onboarding team must record a recommendation before the final decision.",
      );
      return;
    }

    if (
      ["recommend_reject", "reject"].includes(action) &&
      !feedback.trim()
    ) {
      setError(
        action === "recommend_reject"
          ? "Please provide a reason before recommending rejection."
          : "Please provide feedback before rejecting this application.",
      );
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
        p_feedback: [
          "recommend_reject",
          "reject",
        ].includes(action)
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

    const successMessages = {
      recommend_approve:
        "Approval has been recommended. The application is now ready for Operations and Governance sign-off.",
      recommend_reject:
        "Rejection has been recommended. The application is now ready for Operations and Governance sign-off.",
      approve:
        "The mentor application has received final approval.",
      reject:
        "The mentor application has been rejected.",
    };

    setSuccess(successMessages[action] || "The application was updated.");
    setReviewMode("");
    setFeedback("");

    await loadApplications({
      keepModalOpen: true,
    });

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
        getApplicationReviewStageLabel(application),
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

        <div className="admin-request-results-summary">
          <span>
            {filteredApplications.length}{" "}
            {filteredApplications.length === 1
              ? "application"
              : "applications"}
          </span>

          <small>
            Mentor Onboarding records the first recommendation. Operations and
            Governance records the final decision. Full Access Admins can
            perform either action.
          </small>
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

                      <td>
                        <span className="admin-attention-type">
                          {getApplicationReviewStageLabel(application)}
                        </span>
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
                          {canTakeAction(application) ? "Review" : "View"}
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
                      <dt>Review stage</dt>
                      <dd>
                        {getApplicationReviewStageLabel(application)}
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
                      {canTakeAction(application) ? "Review" : "View"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="admin-table-pagination">
              <p>
                Showing {visibleStart}-{visibleEnd} of{" "}
                {filteredApplications.length}
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
          canRecommendApplications={canRecommendApplications}
          canSecondSignoffApplications={canSecondSignoffApplications}
          isFullAccessAdmin={isFullAccessAdmin}
          adminOperationalRole={adminOperationalRole}
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
  canRecommendApplications,
  canSecondSignoffApplications,
  isFullAccessAdmin,
  adminOperationalRole,
  onSubmitReview,
  onClose,
}) {
  const isPending = application.status === "pending";

  const onboardingComplete =
    Boolean(application.onboarding_recommendation);

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

  const isRecommendationRejectMode =
    reviewMode === "recommend_reject";

  const isFinalRejectMode =
    reviewMode === "reject";

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
            {getApplicationReviewStageLabel(application)} · Submitted{" "}
            {formatDate(application.created_at)}
          </span>
        </div>

        {isFullAccessAdmin && (
          <div className="admin-review-existing-feedback">
            <strong>Full Access Admin</strong>
            <p>
              You can perform either review stage. Your operational role does
              not restrict your access.
            </p>
          </div>
        )}

        {!isFullAccessAdmin && adminOperationalRole && (
          <div className="admin-review-existing-feedback">
            <strong>Your administrator role</strong>
            <p>{formatAdminOperationalRole(adminOperationalRole)}</p>
          </div>
        )}

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

        <div className="admin-review-existing-feedback">
          <strong>Stage 1 · Mentor Onboarding recommendation</strong>

          {onboardingComplete ? (
            <>
              <p>
                Recommendation:{" "}
                <strong>
                  {application.onboarding_recommendation === "approve"
                    ? "Recommend approval"
                    : "Recommend rejection"}
                </strong>
              </p>

              <p>
                Reviewed by{" "}
                {application.onboarding_reviewer?.full_name ||
                  application.onboarding_reviewer?.email ||
                  "Administrator"}
                {application.onboarding_reviewed_at
                  ? ` on ${formatDate(application.onboarding_reviewed_at)}`
                  : ""}
                .
              </p>

              {application.onboarding_feedback && (
                <p>{application.onboarding_feedback}</p>
              )}
            </>
          ) : (
            <p>
              No recommendation has been recorded yet.
            </p>
          )}
        </div>

        {canMakeOnboardingRecommendation && (
          <div className="admin-review-existing-feedback">
            <strong>Record the Mentor Onboarding recommendation</strong>

            <p>
              Either administrator assigned to this role can complete this
              stage. The other person does not need to log in first.
            </p>

            {isRecommendationRejectMode && (
              <label className="admin-rejection-field">
                <span>Reason for recommending rejection</span>
                <textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows="4"
                  placeholder="Explain why this application should not proceed."
                  disabled={processing}
                />
              </label>
            )}

            <div className="admin-review-modal-actions">
              {isRecommendationRejectMode ? (
                <>
                  <button
                    type="button"
                    className="admin-modal-cancel-button"
                    onClick={() => {
                      setReviewMode("");
                      setFeedback("");
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="admin-modal-confirm-button danger"
                    onClick={() =>
                      onSubmitReview("recommend_reject")
                    }
                    disabled={processing}
                  >
                    {processing
                      ? "Saving..."
                      : "Recommend rejection"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="admin-modal-cancel-button admin-reject-application-button"
                    onClick={() => {
                      setReviewMode("recommend_reject");
                      setFeedback("");
                    }}
                    disabled={processing}
                  >
                    Recommend rejection
                  </button>

                  <button
                    type="button"
                    className="admin-modal-confirm-button admin-approve-application-button"
                    onClick={() =>
                      onSubmitReview("recommend_approve")
                    }
                    disabled={processing}
                  >
                    {processing
                      ? "Saving..."
                      : "Recommend approval"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <div className="admin-review-existing-feedback">
          <strong>Stage 2 · Operations and Governance decision</strong>

          {finalDecisionComplete ? (
            <>
              <p>
                Final decision:{" "}
                <strong>
                  {application.status === "approved"
                    ? "Approved"
                    : "Rejected"}
                </strong>
              </p>

              <p>
                Reviewed by{" "}
                {application.operations_reviewer?.full_name ||
                  application.operations_reviewer?.email ||
                  "Administrator"}
                {application.operations_reviewed_at
                  ? ` on ${formatDate(application.operations_reviewed_at)}`
                  : ""}
                .
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
              The application is ready for Operations and Governance
              sign-off.
            </p>
          ) : isFullAccessAdmin ? (
            <p>
              No onboarding recommendation has been recorded. As a Full Access
              Admin, you may still make the final decision.
            </p>
          ) : (
            <p>
              Waiting for the Mentor Onboarding recommendation.
            </p>
          )}
        </div>

        {canMakeFinalDecision && (
          <div className="admin-review-existing-feedback">
            <strong>Record the final decision</strong>

            <p>
              Either administrator assigned to Operations and Governance can
              complete this stage. A Full Access Admin can also complete it.
            </p>

            {isFinalRejectMode && (
              <label className="admin-rejection-field">
                <span>Feedback for the applicant</span>
                <textarea
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  rows="4"
                  placeholder="Explain the final reason for rejection."
                  disabled={processing}
                />
              </label>
            )}

            <div className="admin-review-modal-actions">
              {isFinalRejectMode ? (
                <>
                  <button
                    type="button"
                    className="admin-modal-cancel-button"
                    onClick={() => {
                      setReviewMode("");
                      setFeedback("");
                    }}
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
                    onClick={() => {
                      setReviewMode("reject");
                      setFeedback("");
                    }}
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
                    {processing ? "Approving..." : "Final approval"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {application.admin_feedback &&
          !application.operations_feedback &&
          !isPending && (
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
      </section>
    </div>
  );
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

  return labels[role] || formatStatusLabel(role);
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




function MessagesPage({ canSendMessages = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const messageEndRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [startingConversation, setStartingConversation] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const requestedMemberId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("member") || "";
  }, [location.search]);

  async function loadConversationList({
    preferredConversationId = "",
  } = {}) {
    setError("");

    const [
      conversationResult,
      memberResult,
    ] = await Promise.all([
      supabase
        .from("admin_conversations")
        .select(
          `
            id,
            member_id,
            created_by_admin_id,
            assigned_admin_id,
            subject,
            status,
            created_at,
            updated_at
          `,
        )
        .order("updated_at", {
          ascending: false,
        }),

      supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            email,
            role,
            signup_intent,
            account_status
          `,
        )
        .order("full_name", {
          ascending: true,
        }),
    ]);

    if (conversationResult.error) {
      console.error(
        "Unable to load admin conversations:",
        conversationResult.error,
      );

      setError(
        "We could not load administrative conversations.",
      );

      return [];
    }

    if (memberResult.error) {
      console.error(
        "Unable to load people for admin messaging:",
        memberResult.error,
      );

      setError(
        "Conversations loaded, but the people list could not be loaded.",
      );
    }

    const rawConversations =
      conversationResult.data ?? [];

    const allMembers =
      (memberResult.data ?? []).filter(
        (member) =>
          ![
            "admin",
            "safeguarding_lead",
          ].includes(member.role),
      );

    setMembers(allMembers);

    const memberMap = new Map(
      allMembers.map((member) => [
        member.id,
        member,
      ]),
    );

    let messageResult = {
      data: [],
      error: null,
    };

    const conversationIds =
      rawConversations.map(
        (conversation) =>
          conversation.id,
      );

    if (
      conversationIds.length > 0
    ) {
      messageResult = await supabase
        .from("admin_messages")
        .select(
          `
            id,
            conversation_id,
            sender_id,
            recipient_id,
            body,
            read_at,
            created_at
          `,
        )
        .in(
          "conversation_id",
          conversationIds,
        )
        .order("created_at", {
          ascending: false,
        });
    }

    if (messageResult.error) {
      console.warn(
        "Conversations loaded, but message previews could not be loaded:",
        messageResult.error,
      );
    }

    const latestMessageMap =
      new Map();

    const unreadCountMap =
      new Map();

    (
      messageResult.data ?? []
    ).forEach((message) => {
      if (
        !latestMessageMap.has(
          message.conversation_id,
        )
      ) {
        latestMessageMap.set(
          message.conversation_id,
          message,
        );
      }

      if (
        message.recipient_id ===
          user?.id &&
        !message.read_at
      ) {
        unreadCountMap.set(
          message.conversation_id,
          (
            unreadCountMap.get(
              message.conversation_id,
            ) ?? 0
          ) + 1,
        );
      }
    });

    const enrichedConversations =
      rawConversations.map(
        (conversation) => ({
          ...conversation,
          member:
            memberMap.get(
              conversation.member_id,
            ) ?? null,
          latestMessage:
            latestMessageMap.get(
              conversation.id,
            ) ?? null,
          unreadCount:
            unreadCountMap.get(
              conversation.id,
            ) ?? 0,
        }),
      );

    setConversations(
      enrichedConversations,
    );

    const preferredId =
      preferredConversationId ||
      selectedConversationId;

    const requestedConversation =
      requestedMemberId
        ? enrichedConversations.find(
            (conversation) =>
              conversation.member_id ===
              requestedMemberId,
          )
        : null;

    const preferredConversation =
      preferredId
        ? enrichedConversations.find(
            (conversation) =>
              conversation.id ===
              preferredId,
          )
        : null;

    const nextConversation =
      requestedConversation ||
      preferredConversation;

    if (nextConversation) {
      setSelectedConversationId(
        nextConversation.id,
      );
    }

    return enrichedConversations;
  }

  async function loadMessages(
    conversationId,
  ) {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    setError("");

    const {
      data,
      error: messageError,
    } = await supabase
      .from("admin_messages")
      .select(
        `
          id,
          conversation_id,
          sender_id,
          recipient_id,
          body,
          read_at,
          created_at
        `,
      )
      .eq(
        "conversation_id",
        conversationId,
      )
      .order("created_at", {
        ascending: true,
      });

    if (messageError) {
      console.error(
        "Unable to load admin messages:",
        messageError,
      );

      setError(
        "We could not load this conversation.",
      );
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessages(data ?? []);
    setMessagesLoading(false);

    const {
      error: readError,
    } = await supabase.rpc(
      "mark_admin_messages_read",
      {
        p_conversation_id:
          conversationId,
      },
    );

    if (readError) {
      console.warn(
        "Unable to mark admin messages as read:",
        readError,
      );
    }

    setConversations(
      (currentConversations) =>
        currentConversations.map(
          (conversation) =>
            conversation.id ===
            conversationId
              ? {
                  ...conversation,
                  unreadCount: 0,
                }
              : conversation,
        ),
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function initialiseMessages() {
      setLoading(true);

      await loadConversationList();

      if (isMounted) {
        setLoading(false);
      }
    }

    initialiseMessages();

    return () => {
      isMounted = false;
    };
  }, [
    user?.id,
    requestedMemberId,
  ]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return undefined;
    }

    loadMessages(
      selectedConversationId,
    );

    const channel =
      supabase
        .channel(
          `admin-messages-${selectedConversationId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "admin_messages",
            filter:
              `conversation_id=eq.${selectedConversationId}`,
          },
          async (payload) => {
            const incomingMessage =
              payload.new;

            setMessages(
              (currentMessages) => {
                if (
                  currentMessages.some(
                    (message) =>
                      message.id ===
                      incomingMessage.id,
                  )
                ) {
                  return currentMessages;
                }

                return [
                  ...currentMessages,
                  incomingMessage,
                ];
              },
            );

            if (
              incomingMessage
                .recipient_id ===
              user?.id
            ) {
              await supabase.rpc(
                "mark_admin_messages_read",
                {
                  p_conversation_id:
                    selectedConversationId,
                },
              );
            }

            loadConversationList({
              preferredConversationId:
                selectedConversationId,
            });
          },
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel,
      );
    };
  }, [
    selectedConversationId,
    user?.id,
  ]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
        block: "end",
      },
    );
  }, [
    messages,
    messagesLoading,
  ]);

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        selectedConversationId,
    ) ?? null;

  const filteredConversations =
    useMemo(() => {
      const value =
        searchTerm
          .trim()
          .toLowerCase();

      if (!value) {
        return conversations;
      }

      return conversations.filter(
        (conversation) =>
          [
            conversation.member
              ?.full_name,
            conversation.member
              ?.email,
            getPersonAccountType(
              conversation.member ??
                {},
            ),
            conversation.subject,
            conversation
              .latestMessage?.body,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(value),
      );
    }, [
      conversations,
      searchTerm,
    ]);

  const filteredMembers =
    useMemo(() => {
      const value =
        memberSearch
          .trim()
          .toLowerCase();

      return members.filter(
        (member) => {
          if (!value) {
            return true;
          }

          return [
            member.full_name,
            member.email,
            member.role,
            member.signup_intent,
            getPersonAccountType(
              member,
            ),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(value);
        },
      );
    }, [
      memberSearch,
      members,
    ]);

  function selectConversation(
    conversation,
  ) {
    setSelectedConversationId(
      conversation.id,
    );

    navigate(
      `${ADMIN_ROUTES.messages}?member=${conversation.member_id}`,
      {
        replace: true,
      },
    );
  }

  function closeConversationOnMobile() {
    setSelectedConversationId("");
    navigate(
      ADMIN_ROUTES.messages,
      {
        replace: true,
      },
    );
  }

  async function startConversation(
    member,
  ) {
    if (
      !member?.id ||
      startingConversation
    ) {
      return;
    }

    setStartingConversation(
      member.id,
    );
    setError("");

    const {
      data,
      error:
        conversationError,
    } = await supabase.rpc(
      "ensure_admin_conversation",
      {
        p_member_id:
          member.id,
        p_subject:
          "Platform support",
      },
    );

    if (conversationError) {
      console.error(
        "Unable to start admin conversation:",
        conversationError,
      );

      setError(
        conversationError.message ||
          "We could not start this conversation.",
      );
      setStartingConversation("");
      return;
    }

    const createdConversation =
      Array.isArray(data)
        ? data[0]
        : data;

    const conversationId =
      createdConversation?.id;

    if (!conversationId) {
      setError(
        "The conversation was created, but it could not be opened.",
      );
      setStartingConversation("");
      return;
    }

    await loadConversationList({
      preferredConversationId:
        conversationId,
    });

    setSelectedConversationId(
      conversationId,
    );

    setNewMessageOpen(false);
    setMemberSearch("");
    setStartingConversation("");

    navigate(
      `${ADMIN_ROUTES.messages}?member=${member.id}`,
      {
        replace: true,
      },
    );
  }

  async function sendMessage(
    event,
  ) {
    event.preventDefault();

    const body =
      draft.trim();

    if (
      !selectedConversationId ||
      !body ||
      sending
    ) {
      return;
    }

    setSending(true);
    setError("");

    const {
      data,
      error: sendError,
    } = await supabase.rpc(
      "send_admin_message",
      {
        p_conversation_id:
          selectedConversationId,
        p_body: body,
      },
    );

    if (sendError) {
      console.error(
        "Unable to send admin message:",
        sendError,
      );

      setError(
        sendError.message ||
          "We could not send your message.",
      );
      setSending(false);
      return;
    }

    const sentMessage =
      Array.isArray(data)
        ? data[0]
        : data;

    if (sentMessage?.id) {
      setMessages(
        (currentMessages) =>
          currentMessages.some(
            (message) =>
              message.id ===
              sentMessage.id,
          )
            ? currentMessages
            : [
                ...currentMessages,
                sentMessage,
              ],
      );
    } else {
      await loadMessages(
        selectedConversationId,
      );
    }

    setDraft("");
    setSending(false);

    await loadConversationList({
      preferredConversationId:
        selectedConversationId,
    });
  }

  if (loading) {
    return <AdminLoadingState />;
  }

  return (
    <>
      <section className="admin-messages-page">
        <div className="admin-messages-toolbar">
          <div>
            <span className="admin-section-eyebrow">
              ADMINISTRATIVE MESSAGING
            </span>

            <p>
              Contact a mentor or mentee without entering their private mentorship conversation.
            </p>
          </div>

          {canSendMessages && (
            <button
              type="button"
              className="admin-message-new-button"
              onClick={() => {
                setNewMessageOpen(
                  true,
                );
                setMemberSearch("");
                setError("");
              }}
            >
              <MessageCircle
                size={17}
              />
              New message
            </button>
          )}
        </div>

        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <div
          className={`admin-message-shell${
            selectedConversationId
              ? " has-selection"
              : ""
          }`}
        >
          <aside className="admin-message-conversation-panel">
            <div className="admin-message-conversation-heading">
              <div>
                <strong>
                  Conversations
                </strong>

                <small>
                  {
                    conversations.length
                  }{" "}
                  {conversations.length ===
                  1
                    ? "conversation"
                    : "conversations"}
                </small>
              </div>
            </div>

            <label className="admin-message-search">
              <Search
                size={16}
                aria-hidden="true"
              />

              <input
                type="search"
                value={
                  searchTerm
                }
                placeholder="Search conversations"
                aria-label="Search administrative conversations"
                onChange={(event) =>
                  setSearchTerm(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div className="admin-message-conversation-list">
              {filteredConversations.length ===
              0 ? (
                <div className="admin-message-list-empty">
                  <MessageCircle
                    size={22}
                  />

                  <strong>
                    {conversations.length ===
                    0
                      ? "No conversations yet"
                      : "No matching conversations"}
                  </strong>

                  <p>
                    {conversations.length ===
                    0
                      ? "Start a message with a mentor or mentee."
                      : "Try another name or email address."}
                  </p>
                </div>
              ) : (
                filteredConversations.map(
                  (conversation) => (
                    <button
                      type="button"
                      key={
                        conversation.id
                      }
                      className={`admin-message-conversation-item${
                        selectedConversationId ===
                        conversation.id
                          ? " active"
                          : ""
                      }`}
                      onClick={() =>
                        selectConversation(
                          conversation,
                        )
                      }
                    >
                      <span className="admin-message-avatar">
                        {getInitials(
                          conversation
                            .member
                            ?.full_name,
                        )}
                      </span>

                      <span className="admin-message-conversation-copy">
                        <span className="admin-message-conversation-name-row">
                          <strong>
                            {conversation
                              .member
                              ?.full_name ||
                              "Member"}
                          </strong>

                          {conversation.unreadCount >
                            0 && (
                            <i>
                              {
                                conversation.unreadCount
                              }
                            </i>
                          )}
                        </span>

                        <small>
                          {getPersonAccountType(
                            conversation.member ??
                              {},
                          )}
                          {conversation.member
                            ?.email
                            ? ` · ${conversation.member.email}`
                            : ""}
                        </small>

                        <p>
                          {conversation
                            .latestMessage
                            ?.body ||
                            "No messages yet"}
                        </p>

                        <time>
                          {formatMessageListDate(
                            conversation
                              .latestMessage
                              ?.created_at ||
                              conversation.updated_at,
                          )}
                        </time>
                      </span>
                    </button>
                  ),
                )
              )}
            </div>
          </aside>

          <section className="admin-message-thread-panel">
            {selectedConversation ? (
              <>
                <header className="admin-message-thread-header">
                  <button
                    type="button"
                    className="admin-message-mobile-back"
                    onClick={
                      closeConversationOnMobile
                    }
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft
                      size={18}
                    />
                  </button>

                  <span className="admin-message-avatar large">
                    {getInitials(
                      selectedConversation
                        .member
                        ?.full_name,
                    )}
                  </span>

                  <div>
                    <strong>
                      {selectedConversation
                        .member
                        ?.full_name ||
                        "Member"}
                    </strong>

                    <small>
                      {getPersonAccountType(
                        selectedConversation.member ??
                          {},
                      )}
                      {selectedConversation
                        .member?.email
                        ? ` · ${selectedConversation.member.email}`
                        : ""}
                    </small>
                  </div>
                </header>

                <div className="admin-message-thread">
                  {messagesLoading ? (
                    <div className="admin-message-thread-state">
                      <div className="loader" />
                      <p>
                        Loading conversation...
                      </p>
                    </div>
                  ) : messages.length ===
                    0 ? (
                    <div className="admin-message-thread-state">
                      <MessageCircle
                        size={28}
                      />

                      <strong>
                        Start the conversation
                      </strong>

                      <p>
                        Messages sent here are separate from private mentor and mentee chats.
                      </p>
                    </div>
                  ) : (
                    messages.map(
                      (message) => {
                        const isMine =
                          message.sender_id ===
                          user?.id;

                        return (
                          <article
                            key={
                              message.id
                            }
                            className={`admin-message-bubble-row${
                              isMine
                                ? " mine"
                                : ""
                            }`}
                          >
                            <div className="admin-message-bubble">
                              <p>
                                {
                                  message.body
                                }
                              </p>

                              <time>
                                {formatMessageTime(
                                  message.created_at,
                                )}
                              </time>
                            </div>
                          </article>
                        );
                      },
                    )
                  )}

                  <div
                    ref={
                      messageEndRef
                    }
                  />
                </div>

                {canSendMessages ? (
                  <form
                    className="admin-message-composer"
                    onSubmit={
                      sendMessage
                    }
                  >
                    <label>
                      <span className="sr-only">
                        Write a message
                      </span>

                      <textarea
                        value={draft}
                        rows="2"
                        maxLength="4000"
                        placeholder="Write a message"
                        disabled={
                          sending
                        }
                        onChange={(event) =>
                          setDraft(
                            event.target
                              .value,
                          )
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key ===
                              "Enter" &&
                            !event.shiftKey
                          ) {
                            event.preventDefault();

                            if (
                              draft.trim() &&
                              !sending
                            ) {
                              event.currentTarget
                                .form
                                ?.requestSubmit();
                            }
                          }
                        }}
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={
                        !draft.trim() ||
                        sending
                      }
                    >
                      <Send
                        size={17}
                      />

                      <span>
                        {sending
                          ? "Sending..."
                          : "Send"}
                      </span>
                    </button>
                  </form>
                ) : (
                  <div className="admin-message-composer">
                    <p>
                      Your administrator role can view this conversation but cannot send messages.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="admin-message-thread-empty">
                <MessageCircle
                  size={32}
                />

                <h2>
                  Select a conversation
                </h2>

                <p>
                  Choose an existing conversation or start a new administrative message.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>

      {canSendMessages &&
        newMessageOpen && (
        <div
          className="admin-message-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget &&
              !startingConversation
            ) {
              setNewMessageOpen(
                false,
              );
            }
          }}
        >
          <section
            className="admin-message-new-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-new-message-title"
          >
            <header>
              <div>
                <span className="admin-section-eyebrow">
                  NEW MESSAGE
                </span>

                <h2 id="admin-new-message-title">
                  Choose a member
                </h2>

                <p>
                  Select the mentor or mentee you want to contact.
                </p>
              </div>

              <button
                type="button"
                className="admin-message-modal-close"
                aria-label="Close new message window"
                disabled={
                  Boolean(
                    startingConversation,
                  )
                }
                onClick={() =>
                  setNewMessageOpen(
                    false,
                  )
                }
              >
                <X size={18} />
              </button>
            </header>

            <label className="admin-message-member-search">
              <Search
                size={16}
                aria-hidden="true"
              />

              <input
                type="search"
                autoFocus
                value={
                  memberSearch
                }
                placeholder="Search name or email"
                aria-label="Search mentors and mentees"
                onChange={(event) =>
                  setMemberSearch(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div className="admin-message-member-list">
              {filteredMembers.length ===
              0 ? (
                <div className="admin-message-list-empty">
                  <Users
                    size={22}
                  />

                  <strong>
                    No matching members
                  </strong>

                  <p>
                    Try another name or email address.
                  </p>
                </div>
              ) : (
                filteredMembers.map(
                  (member) => {
                    const existingConversation =
                      conversations.find(
                        (conversation) =>
                          conversation.member_id ===
                          member.id &&
                          conversation.status ===
                          "open",
                      );

                    return (
                      <button
                        type="button"
                        key={
                          member.id
                        }
                        disabled={
                          Boolean(
                            startingConversation,
                          )
                        }
                        onClick={() =>
                          startConversation(
                            member,
                          )
                        }
                      >
                        <span className="admin-message-avatar">
                          {getInitials(
                            member.full_name,
                          )}
                        </span>

                        <span>
                          <strong>
                            {member.full_name ||
                              "Name not provided"}
                          </strong>

                          <small>
                            {getPersonAccountType(
                              member,
                            )}
                            {member.email
                              ? ` · ${member.email}`
                              : ""}
                          </small>
                        </span>

                        <i>
                          {startingConversation ===
                          member.id
                            ? "Opening..."
                            : existingConversation
                              ? "Open"
                              : "Message"}
                        </i>
                      </button>
                    );
                  },
                )
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function getInitials(
  value,
) {
  const name =
    String(value || "")
      .trim();

  if (!name) {
    return "MC";
  }

  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase(),
    )
    .join("");
}

function formatMessageListDate(
  value,
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  const now =
    new Date();

  const sameDay =
    date.toDateString() ===
    now.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat(
      "en-NG",
      {
        hour: "numeric",
        minute: "2-digit",
      },
    ).format(date);
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
    },
  ).format(date);
}

function formatMessageTime(
  value,
) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}





function ActivityLogPage() {
  const [activity, setActivity] = useState([]);
  const [targetProfiles, setTargetProfiles] = useState(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      setLoading(true);
      setError("");

      const {
        data,
        error: activityError,
      } = await supabase.rpc(
        "get_admin_activity_log",
        {
          p_limit: 200,
          p_offset: 0,
        },
      );

      if (!isMounted) {
        return;
      }

      if (activityError) {
        console.error(
          "Unable to load admin activity log:",
          activityError,
        );

        setError(
          activityError.message ||
            "We could not load the administrator activity log.",
        );

        setActivity([]);
        setLoading(false);
        return;
      }

      const rows =
        data ?? [];

      setActivity(rows);

      const targetIds = [
        ...new Set(
          rows
            .map(
              (item) =>
                item.target_user_id,
            )
            .filter(Boolean),
        ),
      ];

      if (targetIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email",
          )
          .in(
            "id",
            targetIds,
          );

        if (!isMounted) {
          return;
        }

        if (profileError) {
          console.warn(
            "Activity log loaded, but target member names could not be loaded:",
            profileError,
          );
        } else {
          setTargetProfiles(
            new Map(
              (profileData ?? []).map(
                (profile) => [
                  profile.id,
                  profile,
                ],
              ),
            ),
          );
        }
      }

      setLoading(false);
    }

    loadActivity();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    categoryFilter,
  ]);

  const filteredActivity =
    useMemo(() => {
      const searchValue =
        searchTerm
          .trim()
          .toLowerCase();

      return activity.filter(
        (item) => {
          if (
            categoryFilter !==
              "all" &&
            getActivityCategory(
              item,
            ) !== categoryFilter
          ) {
            return false;
          }

          if (!searchValue) {
            return true;
          }

          const target =
            targetProfiles.get(
              item.target_user_id,
            );

          return [
            item.actor_name,
            item.actor_email,
            item.summary,
            item.action,
            item.entity_type,
            item.entity_id,
            target?.full_name,
            target?.email,
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
      activity,
      targetProfiles,
      searchTerm,
      categoryFilter,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredActivity.length /
          ACTIVITY_PAGE_SIZE,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const firstIndex =
    (safePage - 1) *
    ACTIVITY_PAGE_SIZE;

  const visibleActivity =
    filteredActivity.slice(
      firstIndex,
      firstIndex +
        ACTIVITY_PAGE_SIZE,
    );

  const visibleStart =
    filteredActivity.length === 0
      ? 0
      : firstIndex + 1;

  const visibleEnd =
    Math.min(
      firstIndex +
        ACTIVITY_PAGE_SIZE,
      filteredActivity.length,
    );

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return (
      <AdminErrorState
        message={error}
      />
    );
  }

  return (
    <section className="admin-activity-page">
      <div className="admin-activity-intro">
        <div className="admin-activity-intro-icon">
          <History
            size={20}
            aria-hidden="true"
          />
        </div>

        <div>
          <strong>
            Administrator audit trail
          </strong>

          <p>
            Important administrator actions are recorded automatically. Private message content is not stored in this log.
          </p>
        </div>
      </div>

      <div className="admin-activity-toolbar">
        <div className="admin-search-field admin-activity-search">
          <Search
            size={16}
            aria-hidden="true"
          />

          <input
            type="search"
            value={searchTerm}
            placeholder="Search admin, member or activity"
            aria-label="Search administrator activity"
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
          />
        </div>

        <div
          className="admin-activity-filters"
          aria-label="Filter administrator activity"
        >
          {[
            {
              value: "all",
              label: "All",
            },
            {
              value: "accounts",
              label: "Accounts",
            },
            {
              value: "applications",
              label: "Applications",
            },
            {
              value: "messages",
              label: "Messages",
            },
            {
              value: "testimonials",
              label: "Testimonials",
            },
          ].map(
            (filter) => (
              <button
                key={
                  filter.value
                }
                type="button"
                className={
                  categoryFilter ===
                  filter.value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setCategoryFilter(
                    filter.value,
                  )
                }
              >
                {filter.label}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="admin-activity-results-summary">
        <span>
          {filteredActivity.length}{" "}
          {filteredActivity.length === 1
            ? "activity"
            : "activities"}
        </span>

        <small>
          Latest administrator actions are shown first.
        </small>
      </div>

      {activity.length === 0 ? (
        <AdminEmptyState
          title="No administrator activity yet"
          description="Important administrator actions will appear here as they happen."
        />
      ) : filteredActivity.length ===
        0 ? (
        <AdminEmptyState
          title="No matching activity"
          description="Try another search term or filter."
        />
      ) : (
        <div className="admin-activity-table-shell">
          <div className="admin-activity-desktop-table">
            <table className="admin-data-table admin-activity-table">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Administrator</th>
                  <th>Activity</th>
                  <th>Member / record</th>
                  <th>Area</th>
                </tr>
              </thead>

              <tbody>
                {visibleActivity.map(
                  (item) => {
                    const target =
                      targetProfiles.get(
                        item.target_user_id,
                      );

                    return (
                      <tr
                        key={item.id}
                      >
                        <td>
                          {formatDateTime(
                            item.created_at,
                          )}
                        </td>

                        <td>
                          <strong>
                            {item.actor_name ||
                              "Administrator"}
                          </strong>

                          {item.actor_email && (
                            <small>
                              {item.actor_email}
                            </small>
                          )}
                        </td>

                        <td className="admin-activity-summary-cell">
                          <strong>
                            {getActivityLabel(
                              item.action,
                            )}
                          </strong>

                          <small>
                            {item.summary}
                          </small>
                        </td>

                        <td>
                          {target ? (
                            <>
                              <strong>
                                {target.full_name ||
                                  "Member"}
                              </strong>

                              {target.email && (
                                <small>
                                  {target.email}
                                </small>
                              )}
                            </>
                          ) : item.entity_id ? (
                            <span className="admin-activity-record-reference">
                              {getEntityLabel(
                                item.entity_type,
                              )}{" "}
                              record
                            </span>
                          ) : (
                            <span className="admin-activity-record-reference">
                              Not applicable
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="admin-activity-area">
                            {getActivityAreaLabel(
                              item,
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-activity-mobile-list">
            {visibleActivity.map(
              (item) => {
                const target =
                  targetProfiles.get(
                    item.target_user_id,
                  );

                return (
                  <article
                    className="admin-activity-mobile-card"
                    key={item.id}
                  >
                    <div className="admin-activity-mobile-head">
                      <div>
                        <span>
                          {getActivityAreaLabel(
                            item,
                          ).toUpperCase()}
                        </span>

                        <strong>
                          {getActivityLabel(
                            item.action,
                          )}
                        </strong>
                      </div>

                      <time>
                        {formatDateTime(
                          item.created_at,
                        )}
                      </time>
                    </div>

                    <p>
                      {item.summary}
                    </p>

                    <dl>
                      <div>
                        <dt>
                          Administrator
                        </dt>
                        <dd>
                          {item.actor_name ||
                            "Administrator"}
                        </dd>
                      </div>

                      <div>
                        <dt>
                          Member / record
                        </dt>
                        <dd>
                          {target?.full_name ||
                            (item.entity_id
                              ? `${getEntityLabel(
                                  item.entity_type,
                                )} record`
                              : "Not applicable")}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              },
            )}
          </div>

          <div className="admin-table-pagination">
            <p>
              Showing{" "}
              {visibleStart}-
              {visibleEnd} of{" "}
              {
                filteredActivity.length
              }
            </p>

            <div className="admin-pagination-controls">
              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.max(
                        1,
                        page - 1,
                      ),
                  )
                }
                disabled={
                  safePage === 1
                }
              >
                <ChevronLeft
                  size={16}
                />
                Previous
              </button>

              <span>
                Page {safePage} of{" "}
                {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage(
                    (page) =>
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
  );
}

function getActivityCategory(
  item,
) {
  const action =
    String(
      item?.action || "",
    );

  if (
    action.startsWith(
      "member_",
    )
  ) {
    return "accounts";
  }

  if (
    action.startsWith(
      "mentor_application_",
    )
  ) {
    return "applications";
  }

  if (
    action.startsWith(
      "admin_message",
    ) ||
    action.startsWith(
      "admin_conversation",
    )
  ) {
    return "messages";
  }

  if (
    action.startsWith(
      "testimonial_",
    )
  ) {
    return "testimonials";
  }

  return "other";
}

function getActivityAreaLabel(
  item,
) {
  const category =
    getActivityCategory(
      item,
    );

  const labels = {
    accounts: "Accounts",
    applications:
      "Mentor applications",
    messages: "Messages",
    testimonials:
      "Testimonials",
    other: "Administration",
  };

  return (
    labels[category] ||
    "Administration"
  );
}

function getActivityLabel(
  action,
) {
  const labels = {
    member_account_status_changed:
      "Account status changed",
    member_membership_verified:
      "Membership verified",
    member_membership_unverified:
      "Membership verification removed",
    mentor_application_approved:
      "Mentor application approved",
    mentor_application_rejected:
      "Mentor application rejected",
    mentor_application_status_changed:
      "Mentor application updated",
    testimonial_published:
      "Testimonial published",
    testimonial_unpublished:
      "Testimonial removed",
    admin_conversation_started:
      "Admin conversation started",
    admin_conversation_status_changed:
      "Admin conversation updated",
    admin_message_sent:
      "Admin message sent",
  };

  return (
    labels[action] ||
    formatStatusLabel(
      action,
    )
  );
}

function getEntityLabel(
  entityType,
) {
  const labels = {
    profiles: "Member",
    mentor_applications:
      "Mentor application",
    mentorship_reviews:
      "Review",
    admin_conversations:
      "Conversation",
    admin_messages:
      "Message",
  };

  return (
    labels[entityType] ||
    "Activity"
  );
}


function ReviewsPage({ canPublishTestimonials = false }) {
  const [reviews, setReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState(null);
  const [publicationAction, setPublicationAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadReviews() {
    setLoading(true);
    setError("");

    const {
      data,
      error: reviewLoadError,
    } = await supabase
      .from("mentorship_reviews")
      .select(`
        id,
        session_id,
        mentee_id,
        mentor_id,
        rating,
        review_text,
        public_consent,
        public_approved,
        public_approved_at,
        created_at,
        mentee:profiles!mentorship_reviews_mentee_id_fkey (
          full_name,
          email
        ),
        mentor:profiles!mentorship_reviews_mentor_id_fkey (
          full_name,
          email
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (reviewLoadError) {
      console.error(
        "Unable to load mentorship reviews:",
        reviewLoadError,
      );

      setReviews([]);
      setError(
        "We could not load mentorship feedback.",
      );
      setLoading(false);
      return;
    }

    setReviews(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
  ]);

  useEffect(() => {
    if (!selectedReview) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(event) {
      if (
        event.key === "Escape" &&
        !processing
      ) {
        closePublicationModal();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    selectedReview,
    processing,
  ]);

  function isEligibleForPublic(
    review,
  ) {
    return (
      Number(review.rating) >= 4 &&
      review.public_consent === true
    );
  }

  function matchesFilter(
    review,
  ) {
    if (statusFilter === "all") {
      return true;
    }

    if (statusFilter === "eligible") {
      return (
        isEligibleForPublic(review) &&
        review.public_approved !== true
      );
    }

    if (statusFilter === "published") {
      return (
        review.public_approved === true
      );
    }

    if (statusFilter === "private") {
      return (
        !isEligibleForPublic(review) &&
        review.public_approved !== true
      );
    }

    return true;
  }

  const filteredReviews =
    useMemo(() => {
      const searchValue =
        searchTerm
          .trim()
          .toLowerCase();

      return reviews.filter(
        (review) => {
          if (
            !matchesFilter(
              review,
            )
          ) {
            return false;
          }

          if (!searchValue) {
            return true;
          }

          return [
            review.mentee
              ?.full_name,
            review.mentee?.email,
            review.mentor
              ?.full_name,
            review.mentor?.email,
            review.review_text,
            review.rating,
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
      reviews,
      searchTerm,
      statusFilter,
    ]);

  const publishedCount =
    reviews.filter(
      (review) =>
        review.public_approved ===
        true,
    ).length;

  const eligibleCount =
    reviews.filter(
      (review) =>
        isEligibleForPublic(
          review,
        ) &&
        review.public_approved !==
          true,
    ).length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredReviews.length /
          REVIEW_PAGE_SIZE,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const firstIndex =
    (safePage - 1) *
    REVIEW_PAGE_SIZE;

  const visibleReviews =
    filteredReviews.slice(
      firstIndex,
      firstIndex +
        REVIEW_PAGE_SIZE,
    );

  const visibleStart =
    filteredReviews.length === 0
      ? 0
      : firstIndex + 1;

  const visibleEnd =
    Math.min(
      firstIndex +
        REVIEW_PAGE_SIZE,
      filteredReviews.length,
    );

  function openPublicationModal(
    review,
    action,
  ) {
    setSelectedReview(review);
    setPublicationAction(action);
    setError("");
    setSuccess("");
  }

  function closePublicationModal() {
    if (processing) {
      return;
    }

    setSelectedReview(null);
    setPublicationAction("");
  }

  async function confirmPublicationAction() {
    if (
      !canPublishTestimonials ||
      !selectedReview ||
      !publicationAction ||
      processing
    ) {
      return;
    }

    const shouldPublish =
      publicationAction ===
      "publish";

    if (
      shouldPublish &&
      !isEligibleForPublic(
        selectedReview,
      )
    ) {
      setError(
        "Only reviews rated 4 or 5 stars with the mentee's public consent can be published.",
      );
      return;
    }

    setProcessing(true);
    setError("");
    setSuccess("");

    const {
      data,
      error:
        publicationError,
    } = await supabase.rpc(
      "set_review_publication",
      {
        p_review_id:
          selectedReview.id,
        p_approved:
          shouldPublish,
      },
    );

    if (publicationError) {
      console.error(
        "Unable to update testimonial publication:",
        publicationError,
      );

      setError(
        publicationError.message ||
          "We could not update this testimonial.",
      );
      setProcessing(false);
      return;
    }

    const updatedReview =
      Array.isArray(data)
        ? data[0]
        : data;

    setReviews(
      (currentReviews) =>
        currentReviews.map(
          (review) =>
            review.id ===
            selectedReview.id
              ? {
                  ...review,
                  ...(updatedReview ??
                    {}),
                  public_approved:
                    shouldPublish,
                  public_approved_at:
                    shouldPublish
                      ? updatedReview
                          ?.public_approved_at ??
                        new Date().toISOString()
                      : null,
                }
              : review,
        ),
    );

    setSuccess(
      shouldPublish
        ? "The review is now approved for the public testimonials section."
        : "The review has been removed from the public testimonials section.",
    );

    setProcessing(false);
    setSelectedReview(null);
    setPublicationAction("");
  }

  if (loading) {
    return <AdminLoadingState />;
  }

  return (
    <>
      <section className="admin-reviews-page">
        <div className="admin-review-summary-grid">
          <article>
            <small>
              ALL FEEDBACK
            </small>

            <strong>
              {reviews.length}
            </strong>

            <span>
              Reviews submitted by mentees
            </span>
          </article>

          <article>
            <small>
              ELIGIBLE FOR REVIEW
            </small>

            <strong>
              {eligibleCount}
            </strong>

            <span>
              Positive reviews with public consent
            </span>
          </article>

          <article>
            <small>
              ON WEBSITE
            </small>

            <strong>
              {publishedCount}
            </strong>

            <span>
              Testimonials currently approved
            </span>
          </article>
        </div>

        <div className="admin-review-toolbar">
          <div className="admin-search-field">
            <Search
              size={16}
              aria-hidden="true"
            />

            <input
              type="search"
              value={searchTerm}
              placeholder="Search mentee, mentor or feedback"
              aria-label="Search mentorship feedback"
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
            />
          </div>

          <div
            className="admin-review-filters"
            aria-label="Filter mentorship feedback"
          >
            {[
              {
                value: "all",
                label: "All",
              },
              {
                value: "eligible",
                label: "Eligible",
              },
              {
                value: "published",
                label: "On website",
              },
              {
                value: "private",
                label: "Private",
              },
            ].map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={
                  statusFilter ===
                  filter.value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setStatusFilter(
                    filter.value,
                  )
                }
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {success && (
          <p className="admin-success-message">
            {success}
          </p>
        )}

        {error &&
          !selectedReview && (
            <p
              className="form-error"
              role="alert"
            >
              {error}
            </p>
          )}

        {reviews.length === 0 ? (
          <AdminEmptyState
            title="No feedback yet"
            description="Mentee reviews will appear here after completed mentoring sessions."
          />
        ) : filteredReviews.length ===
          0 ? (
          <AdminEmptyState
            title="No matching feedback"
            description="Try another search term or feedback filter."
          />
        ) : (
          <div className="admin-review-table-shell">
            <div className="admin-review-desktop-table">
              <table className="admin-data-table admin-feedback-table">
                <thead>
                  <tr>
                    <th>Mentee</th>
                    <th>Mentor</th>
                    <th>Rating</th>
                    <th>Feedback</th>
                    <th>Public consent</th>
                    <th>Website</th>
                    <th>Submitted</th>
                    <th aria-label="Action" />
                  </tr>
                </thead>

                <tbody>
                  {visibleReviews.map(
                    (review) => {
                      const eligible =
                        isEligibleForPublic(
                          review,
                        );

                      return (
                        <tr key={review.id}>
                          <td>
                            <strong>
                              {review.mentee
                                ?.full_name ||
                                "Mentee"}
                            </strong>

                            {review.mentee
                              ?.email && (
                              <small>
                                {
                                  review
                                    .mentee
                                    .email
                                }
                              </small>
                            )}
                          </td>

                          <td>
                            <strong>
                              {review.mentor
                                ?.full_name ||
                                "Mentor"}
                            </strong>

                            {review.mentor
                              ?.email && (
                              <small>
                                {
                                  review
                                    .mentor
                                    .email
                                }
                              </small>
                            )}
                          </td>

                          <td>
                            <ReviewStars
                              rating={
                                review.rating
                              }
                            />
                          </td>

                          <td className="admin-feedback-copy-cell">
                            {
                              review.review_text
                            }
                          </td>

                          <td>
                            <StatusBadge
                              value={
                                review.public_consent
                                  ? "approved"
                                  : "not_verified"
                              }
                              label={
                                review.public_consent
                                  ? "Yes"
                                  : "No"
                              }
                            />
                          </td>

                          <td>
                            <StatusBadge
                              value={
                                review.public_approved
                                  ? "approved"
                                  : eligible
                                    ? "pending"
                                    : "not_verified"
                              }
                              label={
                                review.public_approved
                                  ? "Published"
                                  : eligible
                                    ? "Eligible"
                                    : "Private"
                              }
                            />
                          </td>

                          <td>
                            {formatDate(
                              review.created_at,
                            )}
                          </td>

                          <td className="admin-table-action-cell">
                            {canPublishTestimonials ? (
                              review.public_approved ? (
                                <button
                                  type="button"
                                  className="admin-review-unpublish-button"
                                  onClick={() =>
                                    openPublicationModal(
                                      review,
                                      "unpublish",
                                    )
                                  }
                                >
                                  Remove
                                </button>
                              ) : eligible ? (
                                <button
                                  type="button"
                                  className="admin-review-button"
                                  onClick={() =>
                                    openPublicationModal(
                                      review,
                                      "publish",
                                    )
                                  }
                                >
                                  Approve
                                </button>
                              ) : (
                                <span className="admin-review-private-label">
                                  Not eligible
                                </span>
                              )
                            ) : (
                              <span className="admin-review-private-label">
                                View only
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-review-mobile-list">
              {visibleReviews.map(
                (review) => {
                  const eligible =
                    isEligibleForPublic(
                      review,
                    );

                  return (
                    <article
                      className="admin-review-mobile-card"
                      key={review.id}
                    >
                      <div className="admin-review-mobile-card-head">
                        <div>
                          <span>
                            MENTEE
                          </span>

                          <strong>
                            {review.mentee
                              ?.full_name ||
                              "Mentee"}
                          </strong>

                          <small>
                            To{" "}
                            {review.mentor
                              ?.full_name ||
                              "Mentor"}
                          </small>
                        </div>

                        <ReviewStars
                          rating={
                            review.rating
                          }
                        />
                      </div>

                      <p className="admin-review-mobile-copy">
                        {
                          review.review_text
                        }
                      </p>

                      <dl className="admin-review-mobile-details">
                        <div>
                          <dt>
                            Public consent
                          </dt>
                          <dd>
                            {review.public_consent
                              ? "Yes"
                              : "No"}
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Website status
                          </dt>
                          <dd>
                            {review.public_approved
                              ? "Published"
                              : eligible
                                ? "Eligible"
                                : "Private"}
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Submitted
                          </dt>
                          <dd>
                            {formatDate(
                              review.created_at,
                            )}
                          </dd>
                        </div>
                      </dl>

                      <div className="admin-review-mobile-actions">
                        {canPublishTestimonials ? (
                          review.public_approved ? (
                            <button
                              type="button"
                              className="admin-review-unpublish-button"
                              onClick={() =>
                                openPublicationModal(
                                  review,
                                  "unpublish",
                                )
                              }
                            >
                              Remove from website
                            </button>
                          ) : eligible ? (
                            <button
                              type="button"
                              className="admin-review-button"
                              onClick={() =>
                                openPublicationModal(
                                  review,
                                  "publish",
                                )
                              }
                            >
                              Approve for website
                            </button>
                          ) : (
                            <span className="admin-review-private-label">
                              This review cannot be published.
                            </span>
                          )
                        ) : (
                          <span className="admin-review-private-label">
                            View only
                          </span>
                        )}
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            <div className="admin-table-pagination">
              <p>
                Showing{" "}
                {visibleStart}-
                {visibleEnd} of{" "}
                {
                  filteredReviews.length
                }
              </p>

              <div className="admin-pagination-controls">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
                        Math.max(
                          1,
                          page - 1,
                        ),
                    )
                  }
                  disabled={
                    safePage === 1
                  }
                >
                  <ChevronLeft
                    size={16}
                  />
                  Previous
                </button>

                <span>
                  Page {safePage} of{" "}
                  {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      (page) =>
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

      {canPublishTestimonials &&
        selectedReview && (
        <ReviewPublicationModal
          review={selectedReview}
          action={publicationAction}
          processing={processing}
          error={error}
          onConfirm={
            confirmPublicationAction
          }
          onClose={
            closePublicationModal
          }
        />
      )}
    </>
  );
}

function ReviewStars({
  rating,
}) {
  const safeRating =
    Math.max(
      1,
      Math.min(
        5,
        Number(
          rating ?? 1,
        ),
      ),
    );

  return (
    <div
      className="admin-review-stars"
      aria-label={`${safeRating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map(
        (star) => (
          <Star
            key={star}
            size={13}
            fill={
              star <= safeRating
                ? "currentColor"
                : "none"
            }
            aria-hidden="true"
          />
        ),
      )}
    </div>
  );
}

function ReviewPublicationModal({
  review,
  action,
  processing,
  error,
  onConfirm,
  onClose,
}) {
  const publishing =
    action === "publish";

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
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
        className="admin-confirmation-modal admin-review-publication-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-publication-title"
      >
        <h2
          id="review-publication-title"
        >
          {publishing
            ? "Publish this testimonial?"
            : "Remove this testimonial from the website?"}
        </h2>

        <p>
          {publishing
            ? "This positive review has the mentee's public consent. Approving it will make it eligible to appear in the public testimonials section."
            : "The review will remain visible to the administrator and mentor, but it will no longer appear on the public website."}
        </p>

        <div className="admin-review-publication-preview">
          <ReviewStars
            rating={review.rating}
          />

          <p>
            “{review.review_text}”
          </p>

          <small>
            {review.mentee?.full_name ||
              "Mentee"}{" "}
            →{" "}
            {review.mentor?.full_name ||
              "Mentor"}
          </small>
        </div>

        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

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
              publishing
                ? "admin-modal-confirm-button"
                : "admin-modal-confirm-button danger"
            }
            onClick={onConfirm}
            disabled={processing}
          >
            {processing
              ? "Please wait..."
              : publishing
                ? "Approve for website"
                : "Remove from website"}
          </button>
        </div>
      </section>
    </div>
  );
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
        mentor_attendance,
        mentee_attendance,
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
        contain the newer attendance, meeting_link, location_guidance or
        updated_at fields yet.
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

        <RequestInformation
          label="Mentor attendance"
          value={
            session.mentor_attendance
              ? formatStatusLabel(session.mentor_attendance)
              : "Not recorded"
          }
        />

        <RequestInformation
          label="Mentee attendance"
          value={
            session.mentee_attendance
              ? formatStatusLabel(session.mentee_attendance)
              : "Not recorded"
          }
        />

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

function AdminAccessDenied() {
  return (
    <section className="admin-state-card">
      <span className="empty-state-icon">
        <X size={26} />
      </span>

      <h2>
        Access restricted
      </h2>

      <p>
        Your administrator role does not include access to this section.
      </p>

      <Link
        to={ADMIN_ROUTES.overview}
        className="admin-review-button"
      >
        Return to overview
      </Link>
    </section>
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
