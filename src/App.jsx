import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import KineDashboard from "./pages/KineDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import PatientDetails from "./pages/PatientDetails";
import ProtectedRoute from "./components/ProtectedRoute";
import NewPatientFlow from "./pages/NewPatientFlow";
import InstellingenPage from "./pages/InstellingenPage";
import TeamUpgradeFlow from "./pages/TeamUpgradeFlow";
import ExercisesPage from "./pages/ExercisesPage";
import ExerciseDetailPage from "./pages/ExerciseDetailPage";
import CreateExerciseSchemePage from "./pages/CreateExerciseSchemePage";
import ParentActivationFlow from "./pages/ParentActivationFlow";
import ParentOefenplanning from "./pages/ParentOefenplanning";
import Parentinstellingen from "./pages/Parentinstellingen";
import ParentProfileSelection from "./pages/ParentProfileSelection";
import ChildScreen from "./pages/ChildScreen";  
import ExerciseScreen from "./pages/Oefening";

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
        path="/kinesist/instellingen"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <InstellingenPage />
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
        path="/kinesist/oefeningen/schema/nieuw"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <CreateExerciseSchemePage />
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
      <Route path="/kinesist/instellingen/team-upgrade" element={<TeamUpgradeFlow />} />

      <Route
        path="/patient/:id"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <PatientDetails />
          </ProtectedRoute>
        }
      />
      <Route path="/kinesist/patient/new"element={<ProtectedRoute allowedRole="kinesist">
        <NewPatientFlow />
      </ProtectedRoute>}
      />

      <Route
        path="/ouder/activatie"
        element={
            <ParentActivationFlow />
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
        path="/ouder/instellingen"
        element={
          <ProtectedRoute allowedRole="ouder">
            <Parentinstellingen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ouder/oefenplanning"
        element={
          <ProtectedRoute allowedRole="ouder">
            <ParentOefenplanning />
          </ProtectedRoute>
        }
      />

        <Route
          path="/ouder/profielselectie"
          element={
            <ProtectedRoute allowedRole="ouder">
              <ParentProfileSelection />
            </ProtectedRoute>
          }
        />

      <Route
        path="/kind/oefeningen"
        element={
          <ProtectedRoute allowedRole="ouder">
            <ChildScreen />
          </ProtectedRoute>
        }
      />
      <Route path="/kind/oefening" 
       element={
        <ProtectedRoute allowedRole="ouder">
          <ExerciseScreen />
        </ProtectedRoute>
      } />
    </Routes>
  );
}