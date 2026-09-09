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
import AdminLogin from "./pages/AdminLogin";
import CheckEmail from "./pages/CheckEmail";
import VerifyEmail from "./pages/VerifyEmail";
import MentorApplicationStatus from "./pages/MentorApplicationStatus";
import Unauthorized from "./pages/Unauthorized";
import AccountSuspended from "./pages/AccountSuspended";
import MenteeDashboard from "./pages/MenteeDashboard";
import MentorDashboard from "./pages/MentorDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Account status routes */}
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            path="/account-suspended"
            element={<AccountSuspended />}
          />

          {/* Mentee dashboard */}
          <Route
            path="/mentee/dashboard"
            element={
              <ProtectedRoute allowedRoles={["mentee"]}>
                <MenteeDashboard />
              </ProtectedRoute>
            }
          />

          {/* Mentor application status */}
          <Route
            path="/mentor/application-status"
            element={
              <ProtectedRoute
                allowedRoles={["mentor"]}
                requireActiveAccount={false}
              >
                <MentorApplicationStatus />
              </ProtectedRoute>
            }
          />

          {/* Mentor dashboard */}
          <Route
            path="/mentor/dashboard"
            element={
              <ProtectedRoute allowedRoles={["mentor"]}>
                <MentorDashboard />
              </ProtectedRoute>
            }
          />

          {/* Administrator dashboard */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin",
                  "super_admin",
                  "safeguarding_lead",
                ]}
              >
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Unknown URLs return to the website */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;