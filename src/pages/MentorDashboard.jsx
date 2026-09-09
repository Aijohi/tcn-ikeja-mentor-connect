import { CalendarDays, Star, Users } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";

function MentorDashboard() {
  return (
    <DashboardLayout
      title="Good morning, Olumide"
      description="Your guidance is helping people move forward with clarity."
    >
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">YOUR IMPACT</span>
          <h2>You have helped 18 people take meaningful next steps.</h2>
          <p>Three mentorship requests are waiting for your review.</p>
        </div>

        <button className="primary-button">Review requests</button>
      </section>

      <section className="summary-grid three-columns">
        <SummaryCard
          icon={<Users />}
          label="Active mentees"
          value="4 of 6"
        />

        <SummaryCard
          icon={<CalendarDays />}
          label="Sessions this month"
          value="12 completed"
        />

        <SummaryCard
          icon={<Star />}
          label="Mentor rating"
          value="4.9 out of 5"
        />
      </section>
    </DashboardLayout>
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

export default MentorDashboard;