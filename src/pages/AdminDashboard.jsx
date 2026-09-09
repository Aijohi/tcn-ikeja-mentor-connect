import { HeartHandshake, ShieldCheck, UserCheck, Users } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";

function AdminDashboard() {
  return (
    <DashboardLayout
      title="Community overview"
      description="Monitor growth, matching quality and community safety."
    >
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">MODERATED PILOT</span>
          <h2>A trusted mentoring community, growing with care.</h2>
          <p>Six items currently require administrator attention.</p>
        </div>

        <button className="primary-button">Review pending items</button>
      </section>

      <section className="summary-grid four-columns">
        <SummaryCard
          icon={<Users />}
          label="Verified members"
          value="428"
        />

        <SummaryCard
          icon={<UserCheck />}
          label="Approved mentors"
          value="48"
        />

        <SummaryCard
          icon={<HeartHandshake />}
          label="Active relationships"
          value="126"
        />

        <SummaryCard
          icon={<ShieldCheck />}
          label="Open safety cases"
          value="3"
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

export default AdminDashboard;