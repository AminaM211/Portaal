import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import KineDashboard from "./pages/KineDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import PatientDetails from "./pages/PatientDetails";
import ProtectedRoute from "./components/ProtectedRoute";
import NewPatientFlow from "./pages/NewPatientFlow";
import SettingsPage from "./pages/SettingsPage";
import TeamUpgradeFlow from "./pages/TeamUpgradeFlow";
import ExercisesPage from "./pages/ExercisesPage";
import ExerciseDetailPage from "./pages/ExerciseDetailPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      <Route
        path="/kinesist/dashboard"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <KineDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kinesist/settings"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kinesist/oefeningen"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <ExercisesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kinesist/oefeningen/:id"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <ExerciseDetailPage />
          </ProtectedRoute>
        }
      />

      <Route path="/kinesist/settings/team-upgrade" element={<TeamUpgradeFlow />} />

      <Route
        path="/ouder/dashboard"
        element={
          <ProtectedRoute allowedRole="ouder">
            <ParentDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patient/:id"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <PatientDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kinesist/patient/new"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <NewPatientFlow />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}