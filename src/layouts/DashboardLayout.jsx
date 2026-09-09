import {
  CalendarDays,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const menus = {
  mentee: [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Find a mentor", icon: Users },
    { label: "My sessions", icon: CalendarDays },
    { label: "Messages", icon: MessageCircle },
  ],
  mentor: [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Mentorship requests", icon: HeartHandshake },
    { label: "My sessions", icon: CalendarDays },
    { label: "Messages", icon: MessageCircle },
  ],
  admin: [
    { label: "Overview", icon: LayoutDashboard },
    { label: "People and approvals", icon: Users },
    { label: "Mentorship activity", icon: HeartHandshake },
    { label: "Safety centre", icon: ShieldCheck },
  ],
};

function DashboardLayout({ title, description, children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("mentorConnectUser"));
  const navigationItems = menus[user.role];

  function signOut() {
    localStorage.removeItem("mentorConnectUser");

    navigate(user.role === "admin" ? "/admin/login" : "/login");
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <HeartHandshake size={24} />

          <span>
            <strong>Mentor Connect</strong>
            <small>TCN IKEJA</small>
          </span>
        </div>

        <nav>
          {navigationItems.map(({ label, icon: Icon }, index) => (
            <button key={label} className={index === 0 ? "active" : ""}>
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>

        <button className="sign-out-button" onClick={signOut}>
          <LogOut size={18} />
          Sign out
        </button>
      </aside>

      <main className="dashboard-content">
        <header>
          <span>
            <small>TCN IKEJA MENTOR CONNECT</small>
            <h1>{title}</h1>
            <p>{description}</p>
          </span>

          <div className="dashboard-user">
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;