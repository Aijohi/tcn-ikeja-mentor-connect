import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabase";

import "./SafetyReports.css";

const REPORTS_PER_PAGE = 4;

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

function SafetyCategoryDropdown({
  value,
  onChange,
  disabled,
}) {
  const [open, setOpen] =
    useState(false);

  const dropdownRef =
    useRef(null);

  const selectedItem =
    REPORT_CATEGORIES.find(
      (item) =>
        item.value ===
        value,
    );

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target,
        )
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  function chooseCategory(
    categoryValue,
  ) {
    onChange(categoryValue);
    setOpen(false);
  }

  return (
    <div
      ref={dropdownRef}
      className={`safety-category-dropdown${
        open
          ? " is-open"
          : ""
      }${
        disabled
          ? " is-disabled"
          : ""
      }`}
    >
      <button
        type="button"
        className="safety-category-trigger"
        aria-label="Select report category"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
      >
        <span
          className={
            selectedItem
              ? ""
              : "is-placeholder"
          }
        >
          {selectedItem
            ? selectedItem.label
            : "Select a category"}
        </span>

        <ChevronDown
          size={17}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="safety-category-menu"
          role="listbox"
          aria-label="Report categories"
        >
          {REPORT_CATEGORIES.map(
            (item) => {
              const isSelected =
                item.value === value;

              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`safety-category-option${
                    isSelected
                      ? " is-selected"
                      : ""
                  }`}
                  key={item.value}
                  onClick={() =>
                    chooseCategory(
                      item.value,
                    )
                  }
                >
                  <span>
                    {item.label}
                  </span>

                  {isSelected && (
                    <Check
                      size={16}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

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

  const [reportPage, setReportPage] =
    useState(1);

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

  async function submitReport(
    event,
  ) {
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
        p_summary:
          summary.trim(),
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
    setReportPage(1);

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

  const totalReportPages =
    Math.max(
      1,
      Math.ceil(
        reports.length /
          REPORTS_PER_PAGE,
      ),
    );

  const safeReportPage =
    Math.min(
      reportPage,
      totalReportPages,
    );

  useEffect(() => {
    if (
      reportPage >
      totalReportPages
    ) {
      setReportPage(
        totalReportPages,
      );
    }
  }, [
    reportPage,
    totalReportPages,
  ]);

  const visibleReports =
    useMemo(() => {
      const start =
        (safeReportPage - 1) *
        REPORTS_PER_PAGE;

      return reports.slice(
        start,
        start +
          REPORTS_PER_PAGE,
      );
    }, [
      reports,
      safeReportPage,
    ]);

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

                <SafetyCategoryDropdown
                  value={category}
                  onChange={
                    setCategory
                  }
                  disabled={submitting}
                />
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

            <div className="safety-report-history-content">
              {loading ? (
                <div className="safety-report-state">
                  <div className="loader" />

                  <p>
                    Loading reports...
                  </p>
                </div>
              ) : (
                <div className="safety-report-history-list">
                  {Array.from(
                    {
                      length:
                        REPORTS_PER_PAGE,
                    },
                    (_, slotIndex) => {
                      const report =
                        visibleReports[
                          slotIndex
                        ];

                      const reportNumber =
                        (safeReportPage -
                          1) *
                          REPORTS_PER_PAGE +
                        slotIndex +
                        1;

                      if (!report) {
                        return (
                          <article
                            key={`empty-${reportNumber}`}
                            className="safety-report-history-item safety-report-placeholder"
                          >
                            <span className="safety-report-placeholder-icon">
                              <ShieldAlert
                                size={20}
                                aria-hidden="true"
                              />
                            </span>

                            <div className="safety-report-placeholder-copy">
                              <strong>
                                Report{" "}
                                {reportNumber}
                              </strong>

                              <p>
                                No report submitted yet.
                              </p>

                              <small>
                                —
                              </small>
                            </div>

                            <span className="safety-report-placeholder-status">
                              No reports yet
                            </span>
                          </article>
                        );
                      }

                      return (
                        <article
                          key={
                            report.id
                          }
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
                      );
                    },
                  )}
                </div>
              )}
            </div>

            <div className="safety-report-pagination">
              <button
                type="button"
                aria-label="Previous reports page"
                disabled={
                  safeReportPage === 1
                }
                onClick={() =>
                  setReportPage(
                    (page) =>
                      Math.max(
                        1,
                        page - 1,
                      ),
                  )
                }
              >
                <ChevronLeft
                  size={16}
                  aria-hidden="true"
                />
              </button>

              <span>
                Page {safeReportPage} of{" "}
                {totalReportPages}
              </span>

              <button
                type="button"
                aria-label="Next reports page"
                disabled={
                  safeReportPage ===
                  totalReportPages
                }
                onClick={() =>
                  setReportPage(
                    (page) =>
                      Math.min(
                        totalReportPages,
                        page + 1,
                      ),
                  )
                }
              >
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                />
              </button>
            </div>
          </section>
        </div>

        <section className="safety-emergency-note">
          <span className="safety-emergency-icon">
            <AlertTriangle
              size={19}
              aria-hidden="true"
            />
          </span>

          <div>
            <span className="safety-emergency-eyebrow">
              URGENT SUPPORT
            </span>

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
    value ||
      "Not available",
  )
    .replaceAll(
      "_",
      " ",
    )
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
