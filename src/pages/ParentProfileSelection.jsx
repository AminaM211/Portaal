import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../assets/css/parent-activation.css"; // Reuse existing CSS for the visual style

export default function ParentProfileSelection() {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="parentAuthPage">
      <header className="parentAuthHeader">
        <img src="/images/logo.png" alt="nimbli" className="parentAuthLogo" />
        <button type="button" className="parentAuthTopBtn outline" onClick={handleLogout}>
          Uitloggen
        </button>
      </header>

      <main className="parentProfilePick">
        <h1>Tik jouw profiel aan!</h1>

        <div className="profileCards">
          <button
            type="button"
            className="profileCard"
            onClick={() => navigate("/kind/oefeningen")}
          >
            <img src="/images/avatar.svg" alt="" />
            <span>Kind</span>
          </button>

          <button
            type="button"
            className="profileCard"
            onClick={() => navigate("/ouder/dashboard")}
          >
            <img src="/images/avatar.svg" alt="" />
            <span>Ouderdashboard</span>
          </button>
        </div>
      </main>

      <footer className="parentAuthFooter">
        <button type="button">Privacy</button>
        <button type="button">Gebruiksvoorwaarden</button>
      </footer>
    </div>
  );
}
