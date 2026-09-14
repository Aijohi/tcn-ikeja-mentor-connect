import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MentorRegister from "./pages/MentorRegister";
import AdminLogin from "./pages/AdminLogin";
import AuthCallback from "./pages/AuthCallback";
import CompleteProfile from "./pages/CompleteProfile";
import MembershipPending from "./pages/MembershipPending";
import CheckEmail from "./pages/CheckEmail";
import VerifyEmail from "./pages/VerifyEmail";
import Unauthorized from "./pages/Unauthorized";
import AccountSuspended from "./pages/AccountSuspended";

import MenteeDashboard from "./pages/MenteeDashboard";
import MenteeProfile from "./pages/MenteeProfile";
import FindMentor from "./pages/FindMentor";
import MentorProfile from "./pages/MentorProfile";
import RequestMentorship from "./pages/RequestMentorship";
import MenteeRequests from "./pages/MenteeRequests";
import MenteeRequestDetails from "./pages/MenteeRequestDetails";
import MenteeSessions from "./pages/MenteeSessions";
import MenteeMessages from "./pages/MenteeMessages";
import BecomeAMentor from "./pages/BecomeAMentor";

import MentorApplicationStatus from "./pages/MentorApplicationStatus";
import MentorDashboard from "./pages/MentorDashboard";
import BecomeAMentee from "./pages/BecomeAMentee";

import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/mentor/register"
            element={<MentorRegister />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />

          <Route
            path="/auth/callback"
            element={<AuthCallback />}
          />

          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                  "mentor",
                ]}
                requireActiveAccount={
                  false
                }
              >
                <CompleteProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/membership-pending"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                  "mentor",
                ]}
                requireActiveAccount={
                  false
                }
              >
                <MembershipPending />
              </ProtectedRoute>
            }
          />

          <Route
            path="/check-email"
            element={<CheckEmail />}
          />

          <Route
            path="/verify-email"
            element={<VerifyEmail />}
          />

          <Route
            path="/unauthorized"
            element={<Unauthorized />}
          />

          <Route
            path="/account-suspended"
            element={
              <AccountSuspended />
            }
          />

          <Route
            path="/mentee/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <MenteeDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentee/profile"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <MenteeProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentee/find-mentor"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <FindMentor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentee/mentors/:mentorId"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <MentorProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentee/mentors/:mentorId/request"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <RequestMentorship />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentee/requests"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <MenteeRequests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentee/requests/:requestId"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <MenteeRequestDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentee/sessions"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <MenteeSessions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentee/messages"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <MenteeMessages />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentor/apply"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <BecomeAMentor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentee/become-a-mentor"
            element={
              <Navigate
                to="/mentor/apply"
                replace
              />
            }
          />

          <Route
            path="/mentor/application-status"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentee",
                ]}
              >
                <MentorApplicationStatus />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentor/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentor",
                ]}
              >
                <MentorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentor/become-a-mentee"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "mentor",
                ]}
              >
                <BecomeAMentee />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/dashboard/*"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin",
                  "safeguarding_lead",
                ]}
              >
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
