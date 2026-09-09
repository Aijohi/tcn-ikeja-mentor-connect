import {
  ArrowRight,
  HeartHandshake,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="home-page">
      <nav className="public-nav">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <HeartHandshake size={22} />
          </span>

          <span className="brand-text">
            <strong>Mentor Connect</strong>
            <small>TCN IKEJA</small>
          </span>
        </Link>

        <div className="nav-actions">
          <Link to="/login" className="text-link">
            Sign in
          </Link>

          <Link to="/register" className="primary-button">
            Create account
          </Link>
        </div>
      </nav>

      <section className="home-hero">
        <div className="hero-content">
          <span className="eyebrow">
            PURPOSEFUL MENTORSHIP
          </span>

          <h1>
            Guidance can change the direction of a life.
          </h1>

          <p>
            Connect with verified mentors from the TCN Ikeja community
            and build a safe, accountable and purposeful mentoring
            relationship.
          </p>

          <div className="hero-actions">
            <Link to="/register" className="primary-button">
              Find a mentor
              <ArrowRight size={18} />
            </Link>

            <Link to="/register" className="secondary-link">
              Become a mentor
            </Link>
          </div>
        </div>

        <aside className="trust-card">
          <span className="trust-card-icon">
            <ShieldCheck size={30} />
          </span>

          <span className="eyebrow">
            TRUSTED COMMUNITY
          </span>

          <h2>A safe place to learn and grow.</h2>

          <p>
            Members are verified, mentors are approved, and safety
            support is available throughout every mentorship journey.
          </p>

          <ul>
            <li>
              <ShieldCheck size={16} />
              Verified TCN Ikeja members
            </li>

            <li>
              <ShieldCheck size={16} />
              Approved mentor profiles
            </li>

            <li>
              <ShieldCheck size={16} />
              Structured sessions and accountability
            </li>
          </ul>
        </aside>
      </section>

      <footer className="public-footer">
        <p>
          © 2026 TCN Ikeja Mentor Connect. All rights reserved.
        </p>

        <div>
          <Link to="/admin/login">
            TCN Administrator
          </Link>

          <Link to="/login">
            Member sign in
          </Link>
        </div>
      </footer>
    </main>
  );
}

export default Home;