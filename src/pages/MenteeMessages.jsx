import { MessageCircle } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";

function MenteeMessages() {
  return (
    <DashboardLayout
      title="Messages"
      description="Keep your mentorship conversations in one place."
    >
      <section className="dashboard-empty-state">
        <span className="empty-state-icon">
          <MessageCircle size={30} />
        </span>

        <h2>No messages yet</h2>

        <p>
          Your conversations will appear here after you connect
          with a mentor.
        </p>
      </section>
    </DashboardLayout>
  );
}

export default MenteeMessages;