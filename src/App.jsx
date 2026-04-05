import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import KineDashboard from "./pages/KineDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import PatientDetails from "./pages/PatientDetails";
import ProtectedRoute from "./components/ProtectedRoute";

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
    </Routes>
  );
}