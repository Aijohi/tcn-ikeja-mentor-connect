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
          <Link to="/login" className="nav-sign-in">
            Sign in
          </Link>

          <Link to="/register" className="nav-create-account">
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
            Connect with trusted mentors who can help you gain
            clarity, build confidence and grow with purpose.
          </p>

          <div className="hero-actions">
            <Link
              to="/register?role=mentee"
              className="hero-primary-button"
            >
              Find a mentor
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/register?role=mentor"
              className="hero-secondary-button"
            >
              Become a mentor
            </Link>
          </div>
        </div>

        <aside className="trust-card">
          <span className="trust-card-icon">
            <ShieldCheck size={30} />
          </span>

          <span className="eyebrow">
            TRUSTED CONNECTIONS
          </span>

          <h2>A safe place to learn and grow.</h2>

          <p>
            Mentor Connect supports safe, accountable and meaningful
            relationships between mentors and mentees.
          </p>

          <ul>
            <li>
              <ShieldCheck size={16} />
              Verified user profiles
            </li>

            <li>
              <ShieldCheck size={16} />
              Reviewed and approved mentors
            </li>

            <li>
              <ShieldCheck size={16} />
              Structured mentorship sessions
            </li>
          </ul>
        </aside>
      </section>

      <footer className="public-footer">
        <p>
          © 2026 TCN Ikeja Mentor Connect. All rights reserved.
        </p>

        <div className="footer-links">
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