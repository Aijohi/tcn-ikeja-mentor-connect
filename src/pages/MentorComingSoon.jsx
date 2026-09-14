import {
  Clock3,
} from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";

function MentorComingSoon({
  title,
  description,
  heading,
  message,
}) {
  return (
    <DashboardLayout
      title={title}
      description={description}
    >
      <section className="dashboard-empty-state">
        <span className="empty-state-icon">
          <Clock3 size={24} />
        </span>

        <h2>
          {heading}
        </h2>

        <p>
          {message}
        </p>
      </section>
    </DashboardLayout>
  );
}

export default MentorComingSoon;
