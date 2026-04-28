import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ParentSidebar from "../components/ParentSidebar";
import "../assets/css/parent-instellingen.css";

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Parentinstellingen() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [profile, setProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    initializePage();
  }, []);

  async function initializePage() {
    try {
      setLoading(true);
      setErrorMessage("");

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
        .select("id, full_name, email, phone, role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData || profileData.role !== "ouder") {
        navigate("/");
        return;
      }

      setProfile(profileData);
      setEditFullName(profileData.full_name || "");
      setEditEmail(profileData.email || user.email || "");
      setEditPhone(profileData.phone || "");
    } catch (error) {
      console.error(error);
      setErrorMessage("Instellingen konden niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function openEditProfile() {
    setEditingProfile(true);
  }

  function closeEditProfile() {
    setEditingProfile(false);
    setEditFullName(profile?.full_name || "");
    setEditEmail(profile?.email || "");
    setEditPhone(profile?.phone || "");
  }

  async function handleSaveProfile(e) {
    e.preventDefault();

    if (!editFullName.trim()) {
      setErrorMessage("Naam is verplicht.");
      return;
    }

    try {
      setSavingProfile(true);
      setErrorMessage("");
      setSuccessMessage("");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
      });

      setSuccessMessage("Profiel bijgewerkt.");
      setEditingProfile(false);

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error(error);
      setErrorMessage("Profiel bijwerken is mislukt.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleToggleNotifications() {
    try {
      setSavingNotifications(true);
      setErrorMessage("");

      setNotificationsEnabled(!notificationsEnabled);

      setTimeout(() => setSavingNotifications(false), 500);
    } catch (error) {
      console.error(error);
      setErrorMessage("Notificaties aanpassen is mislukt.");
      setSavingNotifications(false);
    }
  }

  async function handleToggleEmailNotifications() {
    try {
      setSavingNotifications(true);
      setErrorMessage("");

      setEmailNotifications(!emailNotifications);

      setTimeout(() => setSavingNotifications(false), 500);
    } catch (error) {
      console.error(error);
      setErrorMessage("E-mailnotificaties aanpassen is mislukt.");
      setSavingNotifications(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Vul alle velden in.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("De nieuwe wachtwoorden komen niet overeen.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Het nieuwe wachtwoord moet minstens 6 tekens lang zijn.");
      return;
    }

    try {
      setChangingPassword(true);
      setErrorMessage("");
      setSuccessMessage("");

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMessage("Wachtwoord succesvol gewijzigd.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Wachtwoord wijzigen is mislukt.");
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="parentDashLoading">
        <p>Instellingen laden...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="parentDashLoading">
        <p>{errorMessage || "Profiel niet gevonden."}</p>
      </div>
    );
  }

  return (
    <div className="parentDash">
      <ParentSidebar onLogout={handleLogout} />

      <main className="parentinstellingenMain">
        <div className="parentinstellingenContent">
          <section className="parentinstellingenSection">
            <div className="parentinstellingenSectionHeader">
              <h2>Profiel</h2>
              <p>Beheer je persoonlijke gegevens</p>
            </div>

            {errorMessage && <p className="parentError">{errorMessage}</p>}
            {successMessage && <p className="parentSuccess">{successMessage}</p>}

            <div className="parentinstellingenProfileCard">
              <div className="parentField">
                <label>Volledige naam</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>

              <div className="parentField">
                <label>E-mailadres</label>
                <input
                  type="email"
                  disabled
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div className="parentField">
                <label>Telefoonnummer</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="parentinstellingenSection">
            <div className="parentinstellingenSectionHeader">
              <h2>Meldingen</h2>
              <p>Beheer je meldingvoorkeuren</p>
            </div>

            <div className="parentinstellingenCardGroup">
              <div className="parentinstellingenCard">
                <div className="parentinstellingenCardTop">
                  <div>
                    <strong>Voortgangsupdates ontvangen</strong>
                    <p>Meldingen over voortgang van je kind</p>
                  </div>

                  <label className="toggleSwitch">
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={handleToggleNotifications}
                      disabled={savingNotifications}
                    />
                    <span className="toggleSlider"></span>
                  </label>
                </div>
              </div>

              <div className="parentinstellingenCard">
                <div className="parentinstellingenCardTop">
                  <div>
                    <strong>Oefenherinnering via e-mail</strong>
                    <p>Ontvang e-mailherinneringen over openstaande oefeningen</p>
                  </div>

                  <label className="toggleSwitch">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={handleToggleEmailNotifications}
                      disabled={savingNotifications}
                    />
                    <span className="toggleSlider"></span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div className="parentinstellingenSection">
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate("/ouder/profielselectie")}
          >
            Verander van profiel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleLogout}
          >
            Log uit
          </button>
        </div>
      </main>

      {editingProfile && (
        <div className="parentModalOverlay" onClick={closeEditProfile}>
          <div
            className="parentModal parentModal--profile"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="parentModalHeader">
              <h3>Profiel bewerken</h3>
              <button
                type="button"
                className="parentModalClose"
                onClick={closeEditProfile}
              >
                ×
              </button>
            </div>

            <div className="parentModalBody">
              <form className="parentEditForm" onSubmit={handleSaveProfile}>
                <div className="parentField">
                  <label>Volledige naam</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                  />
                </div>

                <div className="parentField">
                  <label>E-mailadres</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>

                <div className="parentField">
                  <label>Telefoonnummer</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="parentModalFooter">
                  <button
                    type="button"
                    className="parentTextAction"
                    onClick={closeEditProfile}
                  >
                    Annuleren
                  </button>

                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Opslaan..." : "Opslaan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div
          className="parentModalOverlay"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="parentModal parentModal--password"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="parentModalHeader">
              <h3>Wachtwoord wijzigen</h3>
              <button
                type="button"
                className="parentModalClose"
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>

            <div className="parentModalBody">
              <form className="parentEditForm" onSubmit={handleChangePassword}>
                <div className="parentField">
                  <label>Huidig wachtwoord</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="parentField">
                  <label>Nieuw wachtwoord</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="parentField">
                  <label>Bevestig nieuw wachtwoord</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div className="parentModalFooter">
                  <button
                    type="button"
                    className="parentTextAction"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    Annuleren
                  </button>

                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={changingPassword}
                  >
                    {changingPassword ? "Wijzigen..." : "Wijzigen"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
