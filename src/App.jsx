import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import KineDashboard from "./pages/KineDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import PatientDetails from "./pages/PatientDetails";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/kinesist/dashboard" element={<KineDashboard />} />
      <Route path="/ouder/dashboard" element={<ParentDashboard />} />
      <Route path="/patient/:id" element={<PatientDetails />} />
    </Routes>
  );
}