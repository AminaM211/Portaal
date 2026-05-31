import { Navigate, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ScrollToTop from './components/ScrollToTop';
import KineDashboard from "./pages/KineDashboard";
import ParentDashboard from "./pages/ParentDashboard";
import PatientDetails from "./pages/PatientDetails";
import PatientExerciseAssignmentPage from "./pages/PatientExerciseAssignmentPage";
import ProtectedRoute from "./components/ProtectedRoute";
import NewPatientFlow from "./pages/NewPatientFlow";
import InstellingenPage from "./pages/InstellingenPage";
import TeamUpgradeFlow from "./pages/TeamUpgradeFlow";
import ExercisesPage from "./pages/ExercisesPage";
import ExerciseDetailPage from "./pages/ExerciseDetailPage";
import ExerciseSchemeDetailPage from "./pages/ExerciseSchemeDetailPage";
import CreateExerciseSchemePage from "./pages/CreateExerciseSchemePage";
import CreateExercisePage from "./pages/CreateExercisePage";
import ParentActivationFlow from "./pages/ParentActivationFlow";
import ParentOefenplanning from "./pages/ParentOefenplanning";
import Parentinstellingen from "./pages/Parentinstellingen";
import ParentProfileSelection from "./pages/ParentProfileSelection";
import ChildScreen from "./pages/ChildScreen";  
import ChildMissionsPage from "./pages/ChildMissionsPage";
import ChildProfilePage from "./pages/ChildProfilePage";
import ExerciseScreen from "./pages/Oefening";

export default function App() {
  return (
    <>
      <ScrollToTop />
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
        path="/kinesist/oefeningen/nieuw"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <CreateExercisePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kinesist/oefeningen/:id"
        element={<ExerciseDetailPage />}
      />
      <Route
        path="/kinesist/oefeningen/schema/:id"
        element={<ExerciseSchemeDetailPage />}
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
      <Route
        path="/patient/:id/oefening-toevoegen"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <PatientExerciseAssignmentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/:id/oefenschema-toevoegen"
        element={
          <ProtectedRoute allowedRole="kinesist">
            <PatientExerciseAssignmentPage />
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
      <Route
        path="/kind/profiel"
        element={
          <ProtectedRoute allowedRole="ouder">
            <ChildProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kind/missies"
        element={
          <ProtectedRoute allowedRole="ouder">
            <ChildMissionsPage />
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
    </>
  );
}