import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabase";

import "./SafetyReports.css";

const REPORT_CATEGORIES = [
  {
    value: "harassment",
    label: "Harassment",
  },
  {
    value: "inappropriate_communication",
    label: "Inappropriate communication",
  },
  {
    value: "misconduct",
    label: "Misconduct",
  },
  {
    value: "fraud",
    label: "Suspected fraud",
  },
  {
    value: "financial_pressure",
    label: "Financial pressure or coercion",
  },
  {
    value: "threats",
    label: "Threats or intimidation",
  },
  {
    value: "safeguarding",
    label: "Safeguarding concern",
  },
  {
    value: "impersonation",
    label: "Impersonation",
  },
  {
    value: "discrimination",
    label: "Discrimination",
  },
  {
    value: "rating_dispute",
    label: "Serious rating or feedback dispute",
  },
  {
    value: "repeated_no_show",
    label: "Repeated no-show",
  },
  {
    value: "misleading_profile",
    label: "Misleading profile information",
  },
  {
    value: "booking_dispute",
    label: "Booking or scheduling dispute",
  },
  {
    value: "other",
    label: "Other concern",
  },
];

function SafetyReports() {
  const [reports, setReports] =
    useState([]);

  const [category, setCategory] =
    useState("");

  const [summary, setSummary] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function loadReports() {
    setLoading(true);
    setError("");

    const {
      data,
      error: reportError,
    } = await supabase.rpc(
      "get_my_safety_reports",
    );

    if (reportError) {
      console.error(
        "Unable to load safety reports:",
        reportError,
      );

      setError(
        reportError.message ||
          "We could not load your reports.",
      );

      setReports([]);
      setLoading(false);
      return;
    }

    setReports(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function submitReport(event) {
    event.preventDefault();

    if (
      !category ||
      !summary.trim() ||
      description.trim().length < 10
    ) {
      setError(
        "Please choose a category and provide enough information about the concern.",
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    const {
      data,
      error: submitError,
    } = await supabase.rpc(
      "submit_safety_report",
      {
        p_category: category,
        p_summary: summary.trim(),
        p_description:
          description.trim(),
        p_reported_user_id: null,
        p_related_request_id: null,
        p_related_session_id: null,
      },
    );

    if (submitError) {
      console.error(
        "Unable to submit safety report:",
        submitError,
      );

      setError(
        submitError.message ||
          "We could not submit your report.",
      );
      setSubmitting(false);
      return;
    }

    const created =
      Array.isArray(data)
        ? data[0]
        : data;

    setCategory("");
    setSummary("");
    setDescription("");

    setSuccess(
      created?.case_reference
        ? `Your report has been submitted. Reference: ${created.case_reference}.`
        : "Your report has been submitted.",
    );

    await loadReports();
    setSubmitting(false);
  }

  const openReports =
    useMemo(
      () =>
        reports.filter(
          (report) =>
            ![
              "resolved",
              "closed",
            ].includes(
              report.status,
            ),
        ).length,
      [reports],
    );

  return (
    <DashboardLayout
      title="Safety & support"
      description="Report a concern privately and track the status of reports you have submitted."
    >
      <div className="safety-reports-page">
        <section className="safety-reports-intro">
          <span className="safety-reports-intro-icon">
            <ShieldAlert
              size={22}
              aria-hidden="true"
            />
          </span>

          <div>
            <h2>
              Report a concern
            </h2>

            <p>
              Use this form for safety, conduct, fraud, harassment,
              safeguarding or serious mentorship concerns. The Trust,
              Safety & Case Resolution team will review the report.
            </p>

            <small>
              If the concern is about a specific person, include their
              name or email address in the details below.
            </small>
          </div>
        </section>

        <div className="safety-reports-grid">
          <section className="safety-report-form-card">
            <div className="safety-section-heading">
              <div>
                <span>
                  NEW REPORT
                </span>

                <h2>
                  Tell us what happened
                </h2>
              </div>
            </div>

            {error && (
              <p
                className="safety-form-error"
                role="alert"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                className="safety-form-success"
                role="status"
              >
                {success}
              </p>
            )}

            <form
              className="safety-report-form"
              onSubmit={
                submitReport
              }
            >
              <label>
                <span>
                  What type of concern is this?
                </span>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value,
                    )
                  }
                  disabled={submitting}
                  required
                >
                  <option value="">
                    Select a category
                  </option>

                  {REPORT_CATEGORIES.map(
                    (item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span>
                  Short summary
                </span>

                <input
                  type="text"
                  maxLength="160"
                  value={summary}
                  placeholder="Briefly describe the concern"
                  onChange={(event) =>
                    setSummary(
                      event.target.value,
                    )
                  }
                  disabled={submitting}
                  required
                />
              </label>

              <label>
                <span>
                  Details
                </span>

                <textarea
                  rows="7"
                  maxLength="5000"
                  value={description}
                  placeholder="Explain what happened, who was involved and any useful context."
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  disabled={submitting}
                  required
                />

                <small>
                  Include enough information for the team to understand
                  what happened. Do not share passwords or financial
                  credentials.
                </small>
              </label>

              <button
                type="submit"
                disabled={submitting}
              >
                <ShieldAlert
                  size={17}
                  aria-hidden="true"
                />

                {submitting
                  ? "Submitting..."
                  : "Submit report"}
              </button>
            </form>
          </section>

          <section className="safety-report-history-card">
            <div className="safety-section-heading safety-history-heading">
              <div>
                <span>
                  MY REPORTS
                </span>

                <h2>
                  Report status
                </h2>
              </div>

              <small>
                {openReports} open
              </small>
            </div>

            {loading ? (
              <div className="safety-report-state">
                <div className="loader" />
                <p>
                  Loading reports...
                </p>
              </div>
            ) : reports.length === 0 ? (
              <div className="safety-report-state">
                <ShieldAlert
                  size={28}
                  aria-hidden="true"
                />

                <strong>
                  No reports submitted
                </strong>

                <p>
                  Reports you submit will appear here with a case
                  reference and status.
                </p>
              </div>
            ) : (
              <div className="safety-report-history-list">
                {reports.map(
                  (report) => (
                    <article
                      key={report.id}
                      className="safety-report-history-item"
                    >
                      <div className="safety-report-history-top">
                        <div>
                          <strong>
                            {
                              report.case_reference
                            }
                          </strong>

                          <small>
                            {formatLabel(
                              report.category,
                            )}
                          </small>
                        </div>

                        <SafetyStatus
                          status={
                            report.status
                          }
                        />
                      </div>

                      <dl>
                        <div>
                          <dt>
                            Priority
                          </dt>
                          <dd>
                            {formatLabel(
                              report.priority,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt>
                            Submitted
                          </dt>
                          <dd>
                            {formatDate(
                              report.created_at,
                            )}
                          </dd>
                        </div>
                      </dl>

                      {report.acknowledged_at && (
                        <p className="safety-report-history-note">
                          <CheckCircle2
                            size={15}
                            aria-hidden="true"
                          />
                          Acknowledged by the safety team
                        </p>
                      )}

                      {!report.acknowledged_at &&
                        ![
                          "resolved",
                          "closed",
                        ].includes(
                          report.status,
                        ) && (
                          <p className="safety-report-history-note">
                            <Clock3
                              size={15}
                              aria-hidden="true"
                            />
                            Waiting for acknowledgement
                          </p>
                        )}
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <section className="safety-emergency-note">
          <AlertTriangle
            size={19}
            aria-hidden="true"
          />

          <div>
            <strong>
              Immediate danger
            </strong>

            <p>
              Mentor Connect is not an emergency service. If someone is
              in immediate danger, contact the appropriate local emergency
              or safeguarding service first.
            </p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function SafetyStatus({
  status,
}) {
  return (
    <span
      className={`safety-status safety-status-${String(
        status || "new",
      ).replaceAll(
        "_",
        "-",
      )}`}
    >
      {formatLabel(
        status || "new",
      )}
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

export default SafetyReports;
