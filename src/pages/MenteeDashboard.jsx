import { CalendarDays, Search, Target } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";

function MenteeDashboard() {
  return (
    <DashboardLayout
      title="Good morning, Amara"
      description="Continue building the future you are praying and working towards."
    >
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">PURPOSEFUL GROWTH</span>
          <h2>Guidance can change the direction of a life.</h2>
          <p>Find a verified mentor who can help you take your next step.</p>
        </div>

        <button className="primary-button">
          <Search size={17} />
          Find a mentor
        </button>
      </section>

      <section className="summary-grid">
        <SummaryCard
          icon={<CalendarDays />}
          label="Next session"
          value="Tomorrow, 4:00 PM"
        />

        <SummaryCard
          icon={<Target />}
          label="Active goals"
          value="3 goals in progress"
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

export default MenteeDashboard;