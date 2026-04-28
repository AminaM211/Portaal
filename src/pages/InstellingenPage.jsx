import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/instellingen.css";

function splitName(fullName = "") {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export default function InstellingenPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [profile, setProfile] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [roleLabel, setRoleLabel] = useState("");

  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    loadinstellingen();
  }, []);

  async function loadinstellingen() {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        navigate("/");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData || profileData.role !== "kinesist") {
        navigate("/");
        return;
      }

      setProfile(profileData);

      const nameParts = splitName(profileData.full_name || "");

      setFirstName(nameParts.firstName);
      setLastName(nameParts.lastName);
      setEmail(user.email || "");
      setRoleLabel(profileData.role === "kinesist" ? "Kinesist" : profileData.role);
    } catch (error) {
      console.error(error);
      setErrorMessage("Instellingen laden is mislukt.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const trimmedEmail = email.trim();

      if (!trimmedFirstName || !trimmedLastName) {
        setErrorMessage("Voornaam en achternaam zijn verplicht.");
        return;
      }

      if (!trimmedEmail) {
        setErrorMessage("E-mailadres is verplicht.");
        return;
      }

      if (!profile?.id) {
        setErrorMessage("Profiel niet gevonden.");
        return;
      }

      const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (trimmedEmail !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: trimmedEmail,
        });

        if (emailError) throw emailError;
      }

      setSuccessMessage("Profiel succesvol opgeslagen.");
      await loadinstellingen();
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Opslaan is mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword() {
    try {
      setPasswordSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const trimmedPassword = newPassword.trim();

      if (!trimmedPassword) {
        setErrorMessage("Geef een nieuw wachtwoord in.");
        return;
      }

      if (trimmedPassword.length < 8) {
        setErrorMessage("Je wachtwoord moet minstens 8 tekens bevatten.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });

      if (error) throw error;

      setNewPassword("");
      setShowPasswordEdit(false);
      setSuccessMessage("Wachtwoord succesvol aangepast.");
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Wachtwoord aanpassen is mislukt.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  const maskedPassword = useMemo(() => "••••••••••••••••", []);

  if (loading) {
    return (
      <div className="kineDashLoading">
        <p>Instellingen laden...</p>
      </div>
    );
  }

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="InstellingenPage">
        <section className="instellingenMainBlock">
          <h1>Mijn profiel</h1>

          <form className="instellingenForm" onSubmit={handleSaveProfile}>
            <div className="instellingenField">
              <label>Naam</label>
              <input
                type="text"
                value={firstName}
                placeholder="Voornaam"
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="instellingenField">
              <label>Achternaam</label>
              <input
                type="text"
                value={lastName}
                placeholder="Achternaam"
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <div className="instellingenField">
              <label>E-mail</label>
              <input
                type="email"
                value={email} disabled
                placeholder="E-mailadres"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="instellingenField">
              <label>Wachtwoord</label>

              {!showPasswordEdit ? (
                <div className="instellingenPasswordInline">
                  <input type="text" value={maskedPassword} disabled />
                  <button
                    type="button"
                    className="instellingenGhostBtn"
                    onClick={() => setShowPasswordEdit(true)}
                  >
                    Wijzigen
                  </button>
                </div>
              ) : (
                <div className="instellingenPasswordEditor">
                  <input
                    type="password"
                    value={newPassword}
                    placeholder="Nieuw wachtwoord"
                    onChange={(e) => setNewPassword(e.target.value)}
                  />

                  <div className="instellingenPasswordActions">
                    <button
                      type="button"
                      className="kineTextAction"
                      onClick={() => {
                        setShowPasswordEdit(false);
                        setNewPassword("");
                      }}
                    >
                      Annuleren
                    </button>

                    <button
                      type="button"
                      className="btn-primary-small"
                      onClick={handleUpdatePassword}
                      disabled={passwordSaving}
                    >
                      {passwordSaving ? "Opslaan..." : "Bewaren"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="instellingenField">
              <label>Rol</label>
              <input type="text" value={roleLabel} disabled />
            </div>

            {errorMessage && <p className="kineError">{errorMessage}</p>}
            {successMessage && <p className="kineSuccess">{successMessage}</p>}

            <button
              type="submit"
              className="btn-primary-large instellingenSaveBtn"
              disabled={saving}
            >
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
          </form>
        </section>

        <aside className="instellingenSideBlock">
          <h2>Support</h2>

          <button
            type="button"
            className="btn-help"
            onClick={() => alert("Helpcenter link later koppelen")}
          >
            Helpcenter
          </button>

          <button
            type="button"
            className="btn-primary-large"
            onClick={() => navigate("/kinesist/instellingen/team-upgrade")}
          >
            Upgrade naar Team
          </button>

          <button
            type="button"
            className="btn-outline-large"
            onClick={handleLogout}
          >
            Log uit
          </button>
        </aside>
      </main>
    </div>
  );
}