import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../lib/supabase";

import "./AdminSafety.css";

const CASE_PAGE_SIZE = 10;
const SAFETY_BASE =
  "/admin/dashboard/safety-cases";

const CATEGORY_OPTIONS = [
  ["fraud", "Suspected fraud"],
  ["harassment", "Harassment"],
  [
    "inappropriate_communication",
    "Inappropriate communication",
  ],
  ["misconduct", "Misconduct"],
  ["impersonation", "Impersonation"],
  ["discrimination", "Discrimination"],
  ["threats", "Threats or intimidation"],
  [
    "financial_pressure",
    "Financial pressure or coercion",
  ],
  ["safeguarding", "Safeguarding concern"],
  [
    "rating_dispute",
    "Serious rating or feedback dispute",
  ],
  ["repeated_no_show", "Repeated no-show"],
  [
    "misleading_profile",
    "Misleading profile information",
  ],
  ["booking_dispute", "Booking or scheduling dispute"],
  ["other", "Other concern"],
];

const PRIORITY_OPTIONS = [
  ["urgent", "Urgent"],
  ["high", "High"],
  ["standard", "Standard"],
];

const STATUS_OPTIONS = [
  ["new", "New"],
  ["acknowledged", "Acknowledged"],
  ["investigating", "Investigating"],
  [
    "waiting_for_information",
    "Waiting for information",
  ],
  ["escalated", "Escalated"],
  ["resolved", "Resolved"],
  ["closed", "Closed"],
];

const OUTCOME_OPTIONS = [
  ["", "No outcome yet"],
  ["no_action", "No action"],
  ["guidance", "Guidance"],
  ["warning", "Warning"],
  [
    "temporary_restriction",
    "Temporary restriction",
  ],
  ["suspension", "Suspension"],
  ["removal", "Removal"],
  ["external_referral", "External referral"],
  ["reinstatement", "Reinstatement"],
];

const EVIDENCE_TYPE_OPTIONS = [
  ["reference", "Reference"],
  ["link", "Link"],
  ["message_reference", "Message reference"],
  ["session_reference", "Session reference"],
  ["request_reference", "Request reference"],
];

const STATUS_FILTER_OPTIONS = [
  ["open", "Open cases"],
  ["all", "All statuses"],
  ...STATUS_OPTIONS,
];

const PRIORITY_FILTER_OPTIONS = [
  ["all", "All priorities"],
  ...PRIORITY_OPTIONS,
];

function AdminSafetyCases({
  canManage = false,
}) {
  const location = useLocation();

  const cleanPath =
    location.pathname.replace(
      /\/+$/,
      "",
    );

  const caseId =
    cleanPath.startsWith(
      `${SAFETY_BASE}/`,
    )
      ? cleanPath
          .slice(
            `${SAFETY_BASE}/`.length,
          )
          .trim()
      : "";

  if (caseId) {
    return (
      <SafetyCaseDetails
        caseId={caseId}
        canManage={canManage}
      />
    );
  }

  return (
    <SafetyCaseList
      canManage={canManage}
    />
  );
}

function SafetyCaseList({
  canManage,
}) {
  const navigate = useNavigate();

  const [cases, setCases] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("open");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("all");

  const [page, setPage] =
    useState(1);

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [newCase, setNewCase] =
    useState({
      category: "",
      priority: "standard",
      summary: "",
      description: "",
    });

  async function loadCases() {
    setLoading(true);
    setError("");

    const {
      data,
      error: caseError,
    } = await supabase
      .from("safety_cases")
      .select(
        `
          id,
          case_reference,
          category,
          priority,
          status,
          summary,
          reporter_id,
          reported_user_id,
          assigned_to,
          created_at,
          updated_at,
          reporter:profiles!safety_cases_reporter_id_fkey (
            full_name,
            email
          ),
          reported_user:profiles!safety_cases_reported_user_id_fkey (
            full_name,
            email
          ),
          assignee:profiles!safety_cases_assigned_to_fkey (
            full_name,
            email
          )
        `,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

    if (caseError) {
      console.error(
        "Unable to load safety cases:",
        caseError,
      );

      setError(
        caseError.message ||
          "We could not load safety cases.",
      );
      setCases([]);
      setLoading(false);
      return;
    }

    setCases(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    statusFilter,
    priorityFilter,
  ]);

  const filteredCases =
    useMemo(() => {
      const searchValue =
        searchTerm
          .trim()
          .toLowerCase();

      return cases.filter(
        (item) => {
          const matchesStatus =
            statusFilter === "all"
              ? true
              : statusFilter ===
                  "open"
                ? ![
                    "resolved",
                    "closed",
                  ].includes(
                    item.status,
                  )
                : item.status ===
                  statusFilter;

          if (!matchesStatus) {
            return false;
          }

          if (
            priorityFilter !==
              "all" &&
            item.priority !==
              priorityFilter
          ) {
            return false;
          }

          if (!searchValue) {
            return true;
          }

          return [
            item.case_reference,
            item.summary,
            item.category,
            item.priority,
            item.status,
            item.reporter?.full_name,
            item.reporter?.email,
            item.reported_user
              ?.full_name,
            item.reported_user?.email,
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
      cases,
      searchTerm,
      statusFilter,
      priorityFilter,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCases.length /
          CASE_PAGE_SIZE,
      ),
    );

  const safePage =
    Math.min(
      page,
      totalPages,
    );

  const startIndex =
    (safePage - 1) *
    CASE_PAGE_SIZE;

  const visibleCases =
    filteredCases.slice(
      startIndex,
      startIndex +
        CASE_PAGE_SIZE,
    );

  async function createCase(
    event,
  ) {
    event.preventDefault();

    if (!canManage) {
      return;
    }

    if (
      !newCase.category ||
      !newCase.summary.trim() ||
      newCase.description
        .trim().length < 10
    ) {
      setError(
        "Complete the category, summary and case details.",
      );
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    const {
      data,
      error: createError,
    } = await supabase.rpc(
      "admin_create_safety_case",
      {
        p_category:
          newCase.category,
        p_priority:
          newCase.priority,
        p_summary:
          newCase.summary.trim(),
        p_description:
          newCase.description.trim(),
        p_reporter_id: null,
        p_reported_user_id: null,
        p_related_request_id: null,
        p_related_session_id: null,
      },
    );

    if (createError) {
      console.error(
        "Unable to create safety case:",
        createError,
      );

      setError(
        createError.message ||
          "We could not create the safety case.",
      );
      setCreating(false);
      return;
    }

    const created =
      Array.isArray(data)
        ? data[0]
        : data;

    setNewCase({
      category: "",
      priority: "standard",
      summary: "",
      description: "",
    });

    setCreateOpen(false);
    setSuccess(
      created?.case_reference
        ? `${created.case_reference} was created.`
        : "The safety case was created.",
    );

    await loadCases();
    setCreating(false);
  }

  if (loading) {
    return (
      <SafetyState
        loading
        message="Loading safety cases..."
      />
    );
  }

  return (
    <section className="admin-safety-page">
      <div className="admin-safety-intro">
        <span>
          <ShieldAlert
            size={21}
            aria-hidden="true"
          />
        </span>

        <div>
          <strong>
            Restricted case management
          </strong>

          <p>
            Safety cases contain sensitive information. Access is limited
            to authorised Trust & Safety and Full Access administrators.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() =>
              setCreateOpen(
                (current) =>
                  !current,
              )
            }
          >
            <Plus
              size={16}
              aria-hidden="true"
            />
            New case
          </button>
        )}
      </div>

      {createOpen &&
        canManage && (
          <form
            className="admin-safety-create-form"
            onSubmit={
              createCase
            }
          >
            <div className="admin-safety-form-heading">
              <div>
                <span>
                  INTERNAL CASE
                </span>

                <h2>
                  Create safety case
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setCreateOpen(
                    false,
                  )
                }
                disabled={
                  creating
                }
              >
                Cancel
              </button>
            </div>

            <div className="admin-safety-form-grid">
              <label>
                <span>
                  Category
                </span>

                <SafetySelect
                  value={newCase.category}
                  options={[
                    ["", "Select category"],
                    ...CATEGORY_OPTIONS,
                  ]}
                  ariaLabel="Category"
                  disabled={creating}
                  onChange={(value) =>
                    setNewCase((current) => ({
                      ...current,
                      category: value,
                    }))
                  }
                />
              </label>

              <label>
                <span>
                  Priority
                </span>

                <SafetySelect
                  value={newCase.priority}
                  options={PRIORITY_OPTIONS}
                  ariaLabel="Priority"
                  disabled={creating}
                  onChange={(value) =>
                    setNewCase((current) => ({
                      ...current,
                      priority: value,
                    }))
                  }
                />
              </label>
            </div>

            <label>
              <span>
                Summary
              </span>

              <input
                type="text"
                maxLength="160"
                value={
                  newCase.summary
                }
                disabled={creating}
                placeholder="Short case summary"
                required
                onChange={(event) =>
                  setNewCase(
                    (current) => ({
                      ...current,
                      summary:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label>
              <span>
                Case details
              </span>

              <textarea
                rows="5"
                maxLength="5000"
                value={
                  newCase.description
                }
                disabled={creating}
                placeholder="Document the initial case information."
                required
                onChange={(event) =>
                  setNewCase(
                    (current) => ({
                      ...current,
                      description:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <button
              type="submit"
              className="admin-safety-primary-button"
              disabled={creating}
            >
              {creating
                ? "Creating..."
                : "Create case"}
            </button>
          </form>
        )}

      {error && (
        <p
          className="admin-safety-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          className="admin-safety-success"
          role="status"
        >
          {success}
        </p>
      )}

      <div className="admin-safety-toolbar">
        <label className="admin-safety-search">
          <Search
            size={16}
            aria-hidden="true"
          />

          <input
            type="search"
            value={searchTerm}
            placeholder="Search case, member or summary"
            aria-label="Search safety cases"
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
          />
        </label>

        <SafetySelect
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          ariaLabel="Filter by case status"
          onChange={setStatusFilter}
        />

        <SafetySelect
          value={priorityFilter}
          options={PRIORITY_FILTER_OPTIONS}
          ariaLabel="Filter by case priority"
          onChange={setPriorityFilter}
        />
      </div>

      <div className="admin-safety-results">
        <strong>
          {filteredCases.length}{" "}
          {filteredCases.length === 1
            ? "case"
            : "cases"}
        </strong>

        <small>
          Urgent and high-priority cases should be reviewed first.
        </small>
      </div>

      {cases.length === 0 ? (
        <SafetyState
          icon
          title="No safety cases"
          message="Reports and internally created cases will appear here."
        />
      ) : filteredCases.length ===
        0 ? (
        <SafetyState
          icon
          title="No matching cases"
          message="Try another search term or filter."
        />
      ) : (
        <>
          <div className="admin-safety-desktop-table">
            <table className="admin-safety-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Reporter</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th aria-label="Action" />
                </tr>
              </thead>

              <tbody>
                {visibleCases.map(
                  (item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {
                            item.case_reference
                          }
                        </strong>
                        <small>
                          {item.summary}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {item.reporter
                            ?.full_name ||
                            "Internal case"}
                        </strong>

                        {item.reporter
                          ?.email && (
                          <small>
                            {
                              item.reporter
                                .email
                            }
                          </small>
                        )}
                      </td>

                      <td>
                        {formatLabel(
                          item.category,
                        )}
                      </td>

                      <td>
                        <PriorityBadge
                          value={
                            item.priority
                          }
                        />
                      </td>

                      <td>
                        <CaseStatusBadge
                          value={
                            item.status
                          }
                        />
                      </td>

                      <td>
                        {formatDate(
                          item.created_at,
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="admin-safety-view-button"
                          onClick={() =>
                            navigate(
                              `${SAFETY_BASE}/${item.id}`,
                            )
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="admin-safety-mobile-list">
            {visibleCases.map(
              (item) => (
                <article
                  key={item.id}
                  className="admin-safety-mobile-card"
                >
                  <div className="admin-safety-mobile-head">
                    <div>
                      <span>
                        {
                          item.case_reference
                        }
                      </span>
                      <strong>
                        {item.summary}
                      </strong>
                    </div>

                    <PriorityBadge
                      value={
                        item.priority
                      }
                    />
                  </div>

                  <dl>
                    <div>
                      <dt>
                        Category
                      </dt>
                      <dd>
                        {formatLabel(
                          item.category,
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Status
                      </dt>
                      <dd>
                        <CaseStatusBadge
                          value={
                            item.status
                          }
                        />
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Reporter
                      </dt>
                      <dd>
                        {item.reporter
                          ?.full_name ||
                          "Internal case"}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Created
                      </dt>
                      <dd>
                        {formatDate(
                          item.created_at,
                        )}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    className="admin-safety-view-button"
                    onClick={() =>
                      navigate(
                        `${SAFETY_BASE}/${item.id}`,
                      )
                    }
                  >
                    View case
                  </button>
                </article>
              ),
            )}
          </div>

          <div className="admin-safety-pagination">
            <span>
              Page {safePage} of{" "}
              {totalPages}
            </span>

            <div>
              <button
                type="button"
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current - 1,
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

              <button
                type="button"
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        totalPages,
                        current + 1,
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
        </>
      )}
    </section>
  );
}

function SafetyCaseDetails({
  caseId,
  canManage,
}) {
  const navigate = useNavigate();

  const [caseItem, setCaseItem] =
    useState(null);

  const [notes, setNotes] =
    useState([]);

  const [evidence, setEvidence] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [noteBody, setNoteBody] =
    useState("");

  const [evidenceForm, setEvidenceForm] =
    useState({
      evidenceType: "reference",
      label: "",
      referenceValue: "",
    });

  const [form, setForm] =
    useState({
      priority: "standard",
      status: "new",
      escalationReference: "",
      outcome: "",
      outcomeSummary: "",
    });

  async function loadCase() {
    setLoading(true);
    setError("");

    const [
      caseResult,
      noteResult,
      evidenceResult,
    ] = await Promise.all([
      supabase
        .from("safety_cases")
        .select(
          `
            *,
            reporter:profiles!safety_cases_reporter_id_fkey (
              id,
              full_name,
              email
            ),
            reported_user:profiles!safety_cases_reported_user_id_fkey (
              id,
              full_name,
              email
            ),
            assignee:profiles!safety_cases_assigned_to_fkey (
              id,
              full_name,
              email
            )
          `,
        )
        .eq("id", caseId)
        .maybeSingle(),

      supabase
        .from("safety_case_notes")
        .select(
          `
            id,
            note_body,
            created_at,
            author_id,
            author:profiles!safety_case_notes_author_id_fkey (
              full_name,
              email
            )
          `,
        )
        .eq("case_id", caseId)
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),

      supabase
        .from("safety_case_evidence")
        .select(
          `
            id,
            evidence_type,
            label,
            reference_value,
            created_at,
            added_by,
            admin:profiles!safety_case_evidence_added_by_fkey (
              full_name,
              email
            )
          `,
        )
        .eq("case_id", caseId)
        .order(
          "created_at",
          {
            ascending: false,
          },
        ),
    ]);

    const firstError =
      caseResult.error ||
      noteResult.error ||
      evidenceResult.error;

    if (firstError) {
      console.error(
        "Unable to load safety case:",
        firstError,
      );

      setError(
        firstError.message ||
          "We could not load this safety case.",
      );
      setLoading(false);
      return;
    }

    if (!caseResult.data) {
      setError(
        "This safety case could not be found.",
      );
      setLoading(false);
      return;
    }

    const nextCase =
      caseResult.data;

    setCaseItem(nextCase);
    setNotes(
      noteResult.data ?? [],
    );
    setEvidence(
      evidenceResult.data ??
        [],
    );

    setForm({
      priority:
        nextCase.priority ||
        "standard",
      status:
        nextCase.status ||
        "new",
      escalationReference:
        nextCase.escalation_reference ||
        "",
      outcome:
        nextCase.outcome ||
        "",
      outcomeSummary:
        nextCase.outcome_summary ||
        "",
    });

    setLoading(false);
  }

  useEffect(() => {
    loadCase();
  }, [caseId]);

  async function saveCase(
    event,
  ) {
    event.preventDefault();

    if (!canManage) {
      return;
    }

    if (
      [
        "resolved",
        "closed",
      ].includes(
        form.status,
      ) &&
      !form.outcome
    ) {
      setError(
        "Choose an outcome before resolving or closing the case.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const {
      error: updateError,
    } = await supabase.rpc(
      "admin_update_safety_case",
      {
        p_case_id: caseId,
        p_priority:
          form.priority,
        p_status:
          form.status,
        p_assigned_to: null,
        p_escalation_reference:
          form.escalationReference
            .trim() ||
          null,
        p_outcome:
          form.outcome || null,
        p_outcome_summary:
          form.outcomeSummary
            .trim() ||
          null,
      },
    );

    if (updateError) {
      console.error(
        "Unable to update safety case:",
        updateError,
      );

      setError(
        updateError.message ||
          "We could not update the case.",
      );
      setSaving(false);
      return;
    }

    setSuccess(
      "The safety case has been updated.",
    );

    await loadCase();
    setSaving(false);
  }

  async function addNote(
    event,
  ) {
    event.preventDefault();

    if (
      !canManage ||
      !noteBody.trim()
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const {
      error: noteError,
    } = await supabase.rpc(
      "admin_add_safety_case_note",
      {
        p_case_id: caseId,
        p_note_body:
          noteBody.trim(),
      },
    );

    if (noteError) {
      console.error(
        "Unable to add case note:",
        noteError,
      );

      setError(
        noteError.message ||
          "We could not add the case note.",
      );
      setSaving(false);
      return;
    }

    setNoteBody("");
    setSuccess(
      "Internal note added.",
    );

    await loadCase();
    setSaving(false);
  }

  async function addEvidence(
    event,
  ) {
    event.preventDefault();

    if (
      !canManage ||
      !evidenceForm.label.trim() ||
      !evidenceForm.referenceValue.trim()
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const {
      error: evidenceError,
    } = await supabase.rpc(
      "admin_add_safety_case_evidence",
      {
        p_case_id: caseId,
        p_evidence_type:
          evidenceForm.evidenceType,
        p_label:
          evidenceForm.label.trim(),
        p_reference_value:
          evidenceForm.referenceValue.trim(),
      },
    );

    if (evidenceError) {
      console.error(
        "Unable to add evidence reference:",
        evidenceError,
      );

      setError(
        evidenceError.message ||
          "We could not add the evidence reference.",
      );
      setSaving(false);
      return;
    }

    setEvidenceForm({
      evidenceType: "reference",
      label: "",
      referenceValue: "",
    });

    setSuccess(
      "Evidence reference added.",
    );

    await loadCase();
    setSaving(false);
  }

  if (loading) {
    return (
      <SafetyState
        loading
        message="Loading case..."
      />
    );
  }

  if (
    error &&
    !caseItem
  ) {
    return (
      <section className="admin-safety-page">
        <button
          type="button"
          className="admin-safety-back"
          onClick={() =>
            navigate(
              SAFETY_BASE,
            )
          }
        >
          <ArrowLeft
            size={16}
          />
          Back to safety cases
        </button>

        <SafetyState
          title="Unable to load case"
          message={error}
        />
      </section>
    );
  }

  return (
    <section className="admin-safety-page">
      <button
        type="button"
        className="admin-safety-back"
        onClick={() =>
          navigate(
            SAFETY_BASE,
          )
        }
      >
        <ArrowLeft
          size={16}
        />
        Back to safety cases
      </button>

      <div className="admin-safety-case-hero">
        <div>
          <span>
            {
              caseItem.case_reference
            }
          </span>

          <h2>
            {caseItem.summary}
          </h2>

          <p>
            Created{" "}
            {formatDateTime(
              caseItem.created_at,
            )}
          </p>
        </div>

        <div className="admin-safety-case-hero-badges">
          <PriorityBadge
            value={
              caseItem.priority
            }
          />

          <CaseStatusBadge
            value={
              caseItem.status
            }
          />
        </div>
      </div>

      {error && (
        <p
          className="admin-safety-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          className="admin-safety-success"
          role="status"
        >
          {success}
        </p>
      )}

      <div className="admin-safety-case-grid">
        <div className="admin-safety-case-main">
          <section className="admin-safety-case-section">
            <div className="admin-safety-case-section-heading">
              <span>
                CASE DETAILS
              </span>

              <h3>
                Report information
              </h3>
            </div>

            <div className="admin-safety-information-grid">
              <CaseInformation
                label="Category"
                value={formatLabel(
                  caseItem.category,
                )}
              />

              <CaseInformation
                label="Priority"
                value={formatLabel(
                  caseItem.priority,
                )}
              />

              <CaseInformation
                label="Reporter"
                value={
                  caseItem.reporter
                    ?.full_name ||
                  "Internal case"
                }
                subvalue={
                  caseItem.reporter
                    ?.email
                }
              />

              <CaseInformation
                label="Person reported"
                value={
                  caseItem.reported_user
                    ?.full_name ||
                  "Not linked"
                }
                subvalue={
                  caseItem.reported_user
                    ?.email
                }
              />

              <CaseInformation
                label="Assigned to"
                value={
                  caseItem.assignee
                    ?.full_name ||
                  "Not assigned"
                }
                subvalue={
                  caseItem.assignee
                    ?.email
                }
              />

              <CaseInformation
                label="Last updated"
                value={formatDateTime(
                  caseItem.updated_at,
                )}
              />
            </div>

            <div className="admin-safety-case-description">
              <span>
                DESCRIPTION
              </span>

              <p>
                {
                  caseItem.description
                }
              </p>
            </div>
          </section>

          <section className="admin-safety-case-section">
            <div className="admin-safety-case-section-heading">
              <span>
                INTERNAL NOTES
              </span>

              <h3>
                Investigation notes
              </h3>
            </div>

            {canManage && (
              <form
                className="admin-safety-note-form"
                onSubmit={
                  addNote
                }
              >
                <textarea
                  rows="4"
                  value={noteBody}
                  disabled={saving}
                  placeholder="Add an internal investigation note. This is not shown to the reporter."
                  onChange={(event) =>
                    setNoteBody(
                      event.target
                        .value,
                    )
                  }
                />

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !noteBody.trim()
                  }
                >
                  Add note
                </button>
              </form>
            )}

            {notes.length === 0 ? (
              <p className="admin-safety-muted">
                No internal notes yet.
              </p>
            ) : (
              <div className="admin-safety-note-list">
                {notes.map(
                  (note) => (
                    <article
                      key={note.id}
                    >
                      <div>
                        <strong>
                          {note.author
                            ?.full_name ||
                            "Administrator"}
                        </strong>

                        <time>
                          {formatDateTime(
                            note.created_at,
                          )}
                        </time>
                      </div>

                      <p>
                        {
                          note.note_body
                        }
                      </p>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>

          <section className="admin-safety-case-section">
            <div className="admin-safety-case-section-heading">
              <span>
                EVIDENCE
              </span>

              <h3>
                References
              </h3>
            </div>

            {canManage && (
              <form
                className="admin-safety-evidence-form"
                onSubmit={
                  addEvidence
                }
              >
                <SafetySelect
                  value={evidenceForm.evidenceType}
                  options={EVIDENCE_TYPE_OPTIONS}
                  ariaLabel="Evidence type"
                  disabled={saving}
                  onChange={(value) =>
                    setEvidenceForm((current) => ({
                      ...current,
                      evidenceType: value,
                    }))
                  }
                />

                <input
                  type="text"
                  placeholder="Label"
                  value={
                    evidenceForm.label
                  }
                  disabled={saving}
                  onChange={(event) =>
                    setEvidenceForm(
                      (current) => ({
                        ...current,
                        label:
                          event.target
                            .value,
                      }),
                    )
                  }
                />

                <input
                  type="text"
                  placeholder="Link, ID or reference"
                  value={
                    evidenceForm.referenceValue
                  }
                  disabled={saving}
                  onChange={(event) =>
                    setEvidenceForm(
                      (current) => ({
                        ...current,
                        referenceValue:
                          event.target
                            .value,
                      }),
                    )
                  }
                />

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !evidenceForm.label.trim() ||
                    !evidenceForm.referenceValue.trim()
                  }
                >
                  Add reference
                </button>
              </form>
            )}

            {evidence.length === 0 ? (
              <p className="admin-safety-muted">
                No evidence references added.
              </p>
            ) : (
              <div className="admin-safety-evidence-list">
                {evidence.map(
                  (item) => (
                    <article
                      key={item.id}
                    >
                      <FileText
                        size={17}
                        aria-hidden="true"
                      />

                      <div>
                        <strong>
                          {item.label}
                        </strong>

                        <p>
                          {
                            item.reference_value
                          }
                        </p>

                        <small>
                          {formatLabel(
                            item.evidence_type,
                          )}{" "}
                          ·{" "}
                          {formatDateTime(
                            item.created_at,
                          )}
                        </small>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="admin-safety-case-sidebar">
          <form
            className="admin-safety-case-controls"
            onSubmit={
              saveCase
            }
          >
            <div className="admin-safety-case-section-heading">
              <span>
                CASE CONTROL
              </span>

              <h3>
                Status & outcome
              </h3>
            </div>

            <label>
              <span>
                Priority
              </span>

              <SafetySelect
                value={form.priority}
                options={PRIORITY_OPTIONS}
                ariaLabel="Case priority"
                disabled={!canManage || saving}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    priority: value,
                  }))
                }
              />
            </label>

            <label>
              <span>
                Status
              </span>

              <SafetySelect
                value={form.status}
                options={STATUS_OPTIONS}
                ariaLabel="Case status"
                disabled={!canManage || saving}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value,
                  }))
                }
              />
            </label>

            <label>
              <span>
                Escalation reference
              </span>

              <input
                type="text"
                value={
                  form.escalationReference
                }
                disabled={
                  !canManage ||
                  saving
                }
                placeholder="Optional external or leadership reference"
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      escalationReference:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            <label>
              <span>
                Outcome
              </span>

              <SafetySelect
                value={form.outcome}
                options={OUTCOME_OPTIONS}
                ariaLabel="Case outcome"
                disabled={!canManage || saving}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    outcome: value,
                  }))
                }
              />
            </label>

            <label>
              <span>
                Outcome summary
              </span>

              <textarea
                rows="5"
                value={
                  form.outcomeSummary
                }
                disabled={
                  !canManage ||
                  saving
                }
                placeholder="Document the final decision or current outcome."
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      outcomeSummary:
                        event.target
                          .value,
                    }),
                  )
                }
              />
            </label>

            {canManage ? (
              <button
                type="submit"
                className="admin-safety-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : "Save case"}
              </button>
            ) : (
              <p className="admin-safety-muted">
                Your role has view-only access to this case.
              </p>
            )}
          </form>

          <div className="admin-safety-confidential-note">
            <AlertTriangle
              size={18}
              aria-hidden="true"
            />

            <div>
              <strong>
                Confidential
              </strong>

              <p>
                Internal notes and evidence are restricted and should
                contain only information necessary to resolve the case.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}


function SafetySelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
}) {
  const containerRef = useRef(null);
  const [open, setOpen] = useState(false);

  const selectedOption =
    options.find(([optionValue]) => optionValue === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className={`admin-safety-select${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="admin-safety-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedOption?.[1] || "Select option"}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="admin-safety-select-menu"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map(([optionValue, label]) => {
            const selected = optionValue === value;

            return (
              <button
                key={optionValue || "empty"}
                type="button"
                role="option"
                aria-selected={selected}
                className={selected ? "selected" : ""}
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
              >
                <span>{label}</span>
                {selected && <Check size={15} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CaseInformation({
  label,
  value,
  subvalue,
}) {
  return (
    <div className="admin-safety-information">
      <span>
        {label}
      </span>

      <strong>
        {value ||
          "Not available"}
      </strong>

      {subvalue && (
        <small>
          {subvalue}
        </small>
      )}
    </div>
  );
}

function SafetyState({
  loading = false,
  icon = false,
  title,
  message,
}) {
  return (
    <div className="admin-safety-state">
      {loading ? (
        <div className="loader" />
      ) : icon ? (
        <ShieldAlert
          size={28}
          aria-hidden="true"
        />
      ) : null}

      {title && (
        <strong>
          {title}
        </strong>
      )}

      <p>
        {message}
      </p>
    </div>
  );
}

function PriorityBadge({
  value,
}) {
  return (
    <span
      className={`admin-safety-priority priority-${value}`}
    >
      {formatLabel(value)}
    </span>
  );
}

function CaseStatusBadge({
  value,
}) {
  return (
    <span
      className={`admin-safety-status status-${String(
        value || "new",
      ).replaceAll(
        "_",
        "-",
      )}`}
    >
      {formatLabel(value)}
    </span>
  );
}

function formatLabel(value) {
  return String(
    value || "Not available",
  )
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatDate(value) {
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
    new Date(value),
  );
}

function formatDateTime(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}

export default AdminSafetyCases;
