import { ClipboardCheck, GitPullRequest, UserCheck, Users } from "lucide-react";

import { useEffect, useState } from "react";

import { useLocation } from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabase";

const pageInformation = {
  "/admin/dashboard": {
    title: "Community overview",
    description:
      "Monitor registration, mentor applications and mentorship requests.",
  },

  "/admin/dashboard/people": {
    title: "People",
    description: "View the people who have registered on Mentor Connect.",
  },

  "/admin/dashboard/applications": {
    title: "Mentor applications",
    description: "Review people who have applied to become mentors.",
  },

  "/admin/dashboard/requests": {
    title: "Mentorship requests",
    description: "Monitor the mentorship requests submitted by mentees.",
  },
};

function AdminDashboard() {
  const location = useLocation();

  const currentPage =
    pageInformation[location.pathname] ?? pageInformation["/admin/dashboard"];

  return (
    <DashboardLayout
      title={currentPage.title}
      description={currentPage.description}
    >
      {location.pathname === "/admin/dashboard/people" && <PeoplePage />}

      {location.pathname === "/admin/dashboard/applications" && (
        <ApplicationsPage />
      )}

      {location.pathname === "/admin/dashboard/requests" && <RequestsPage />}

      {location.pathname === "/admin/dashboard" && <OverviewPage />}
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadStatistics() {
      setLoading(true);
      setError("");

      const [
        peopleResult,
        approvedMentorsResult,
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
          .from("mentor_profiles")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("approval_status", "pending"),

        supabase
          .from("mentorship_requests")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),
      ]);

      if (!isMounted) {
        return;
      }

      const firstError =
        peopleResult.error ||
        approvedMentorsResult.error ||
        pendingApplicationsResult.error ||
        pendingRequestsResult.error;

      if (firstError) {
        console.error("Unable to load Admin statistics:", firstError);

        setError("We could not load the dashboard information.");

        setLoading(false);
        return;
      }

      setStatistics({
        registeredPeople: peopleResult.count ?? 0,
        approvedMentors: approvedMentorsResult.count ?? 0,
        pendingApplications: pendingApplicationsResult.count ?? 0,
        pendingRequests: pendingRequestsResult.count ?? 0,
      });

      setLoading(false);
    }

    loadStatistics();

    return () => {
      isMounted = false;
    };
  }, []);

  const attentionCount =
    statistics.pendingApplications + statistics.pendingRequests;

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return <AdminErrorState message={error} />;
  }

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">MODERATED COMMUNITY</span>

          <h2>A trusted mentoring community, growing with care.</h2>

          <p>
            {attentionCount === 0
              ? "There are no pending items requiring attention."
              : `${attentionCount} ${
                  attentionCount === 1 ? "item requires" : "items require"
                } administrator attention.`}
          </p>
        </div>
      </section>

      <section className="summary-grid four-columns">
        <SummaryCard
          icon={<Users />}
          label="Registered people"
          value={statistics.registeredPeople}
        />

        <SummaryCard
          icon={<UserCheck />}
          label="Approved mentors"
          value={statistics.approvedMentors}
        />

        <SummaryCard
          icon={<ClipboardCheck />}
          label="Pending applications"
          value={statistics.pendingApplications}
        />

        <SummaryCard
          icon={<GitPullRequest />}
          label="Pending requests"
          value={statistics.pendingRequests}
        />
      </section>
    </>
  );
}

function PeoplePage() {
  const [people, setPeople] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
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

    return [person.full_name, person.email, person.role, person.account_status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(searchValue);
  });

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
          onChange={(event) => setSearchTerm(event.target.value)}
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
        <div className="admin-table-wrapper">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email address</th>
                <th>Role</th>
                <th>Account status</th>
                <th>Membership</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredPeople.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{person.full_name || "Name not provided"}</strong>
                  </td>

                  <td>{person.email}</td>

                  <td>
                    <StatusBadge value={person.role} />
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
                    {person.membership_verified ? "Verified" : "Not verified"}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadApplications() {
      const { data, error: applicationError } = await supabase
        .from("mentor_profiles")
        .select(
          `
            mentor_id,
            job_title,
            organisation,
            years_of_experience,
            expertise,
            mentorship_categories,
            approval_status,
            created_at,
            profiles!mentor_profiles_mentor_id_fkey (
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

      if (applicationError) {
        console.error(applicationError);

        setError("We could not load mentor applications.");

        setLoading(false);
        return;
      }

      setApplications(data ?? []);
      setLoading(false);
    }

    loadApplications();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return <AdminErrorState message={error} />;
  }

  if (applications.length === 0) {
    return (
      <AdminEmptyState
        title="No mentor applications"
        description="Applications will appear here after mentors complete and submit their profiles."
      />
    );
  }

  return (
    <section className="admin-list-section">
      <div className="admin-table-wrapper">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Job title</th>
              <th>Experience</th>
              <th>Expertise</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>

          <tbody>
            {applications.map((application) => (
              <tr key={application.mentor_id}>
                <td>
                  <strong>
                    {application.profiles?.full_name || "Name not provided"}
                  </strong>

                  <small>{application.profiles?.email}</small>
                </td>

                <td>
                  {application.job_title || "Not provided"}

                  {application.organisation && (
                    <small>{application.organisation}</small>
                  )}
                </td>

                <td>{application.years_of_experience ?? 0} years</td>

                <td>
                  {(application.expertise ?? []).slice(0, 3).join(", ") ||
                    "Not provided"}
                </td>

                <td>
                  <StatusBadge value={application.approval_status} />
                </td>

                <td>{formatDate(application.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadRequests() {
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

  if (loading) {
    return <AdminLoadingState />;
  }

  if (error) {
    return <AdminErrorState message={error} />;
  }

  if (requests.length === 0) {
    return (
      <AdminEmptyState
        title="No mentorship requests"
        description="Requests submitted by mentees will appear here."
      />
    );
  }

  return (
    <section className="admin-list-section">
      <div className="admin-table-wrapper">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th>Mentee</th>
              <th>Requested mentor</th>
              <th>Mentoring area</th>
              <th>Goal</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.mentee?.full_name || "Mentee"}</td>

                <td>{request.mentor?.full_name || "Mentor"}</td>

                <td>{request.mentoring_area}</td>

                <td className="admin-goal-cell">{request.goal_statement}</td>

                <td>
                  <StatusBadge value={request.status} />
                </td>

                <td>{formatDate(request.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <article className="summary-card">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ value, label }) {
  const text = label || String(value || "unknown").replaceAll("_", " ");

  return (
    <span
      className={`admin-status-badge status-${String(
        value || "unknown",
      ).replaceAll("_", "-")}`}
    >
      {text}
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
