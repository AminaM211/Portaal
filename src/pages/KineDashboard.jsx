import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/kine-dashboard.css";

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function calculateAge(birthDate) {
  if (!birthDate) return "-";

  const today = new Date();
  const birth = new Date(birthDate);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function getAvatarColor(index) {
  const colors = [
    "#8BB8E8",
    "#A98BE8",
    "#E4AE87",
    "#DB85DA",
    "#86D4E0",
    "#E58C8C",
    "#8EA2EA",
  ];
  return colors[index % colors.length];
}

export default function KineDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");

  const [openMenuId, setOpenMenuId] = useState(null);

  const [editingPatient, setEditingPatient] = useState(null);
  const [editName, setEditName] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [archivePatient, setArchivePatient] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const menuRef = useRef(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function loadDashboard() {
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
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData || profileData.role !== "kinesist") {
        navigate("/");
        return;
      }

      setProfile(profileData);

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select(
          "id, name, birth_date, goal, created_at, parent_name, parent_email, parent_phone, is_archived"
        )
        .eq("kinesist_id", user.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: true });

      if (patientError) throw patientError;

      setPatients(patientData || []);
    } catch (error) {
      console.error(error);
      setErrorMessage("Er ging iets mis bij het laden van het dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function openEditModal(patient) {
    setEditingPatient(patient);
    setEditName(patient.name || "");
    setEditParentName(patient.parent_name || "");
    setEditGoal(patient.goal || "");
    setEditBirthDate(patient.birth_date || "");
    setEditEmail(patient.parent_email || "");
    setEditPhone(patient.parent_phone || "");
    setOpenMenuId(null);
  }

  function closeEditModal() {
    setEditingPatient(null);
    setEditName("");
    setEditParentName("");
    setEditGoal("");
    setEditBirthDate("");
    setEditEmail("");
    setEditPhone("");
  }

  async function handleUpdatePatient(e) {
    e.preventDefault();

    if (!editingPatient) return;

    try {
      setSavingEdit(true);
      setErrorMessage("");

      const trimmedName = editName.trim();
      const trimmedGoal = editGoal.trim();
      const trimmedParentName = editParentName.trim();
      const trimmedEmail = editEmail.trim();
      const trimmedPhone = editPhone.trim();

      if (!trimmedName) {
        setErrorMessage("Naam is verplicht.");
        setSavingEdit(false);
        return;
      }

      const { error } = await supabase
        .from("patients")
        .update({
          name: trimmedName,
          goal: trimmedGoal || null,
          birth_date: editBirthDate || null,
          parent_name: trimmedParentName || null,
          parent_email: trimmedEmail || null,
          parent_phone: trimmedPhone || null,
        })
        .eq("id", editingPatient.id);

      if (error) throw error;

      await loadDashboard();
      closeEditModal();
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt bewerken is mislukt.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleArchivePatient() {
    if (!archivePatient) return;

    try {
      setArchiving(true);
      setErrorMessage("");

      const { error } = await supabase
        .from("patients")
        .update({ is_archived: true })
        .eq("id", archivePatient.id);

      if (error) throw error;

      setArchivePatient(null);
      await loadDashboard();
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt archiveren is mislukt.");
    } finally {
      setArchiving(false);
    }
  }

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return patients;

    return patients.filter((patient) => {
      const nameMatch = patient.name?.toLowerCase().includes(term);
      const goalMatch = patient.goal?.toLowerCase().includes(term);
      return nameMatch || goalMatch;
    });
  }, [patients, search]);

  const patientCount = patients.length;
  const averageTherapy = patientCount > 0 ? "25%" : "0%";
  const complianceRate = patientCount > 0 ? "87%" : "0%";

  if (loading) {
    return (
      <div className="kineDashLoading">
        <p>Dashboard laden...</p>
      </div>
    );
  }

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="kineDashMain">
        <header className="kineDashTop">
          <div className="kineDashHeading">
            <h1>Dashboard</h1>
            <p>Praktijk Lenaarts</p>
          </div>

          <div className="kineDashProfile">
            <div className="kineDashProfileAvatar">
              <img src="/images/profile-avatar.png" alt="Profielfoto" />
            </div>

            <div className="kineDashProfileInfo">
              <h2>{profile?.full_name || "Willem de Vries"}</h2>
              <p>Kinderkinesist</p>
            </div>
          </div>
        </header>

        <section className="kineDashStats">
          <div className="kineStat">
            <div>
              <img src="/images/icon-patients.svg" alt="Patiënten icoon" />
              <strong>{patientCount}</strong>
            </div>
            <span>Patiënten</span>
          </div>

          <div className="kineStat">
            <div>
              <img src="/images/icon-therapy.svg" alt="Therapietrouw icoon" />
              <strong>{averageTherapy}</strong>
            </div>
            <span>Therapietrouw</span>
          </div>

          <div className="kineStat">
            <div>
              <img src="/images/icon-compliance.svg" alt="Nalevingspercentage icoon" />
              <strong>{complianceRate}</strong>
            </div>
            <span>Nalevingspercentage</span>
          </div>
        </section>

        <section className="kinePatientsSection">
          <div className="kinePatientsHeader">
            <h3>Mijn Patiënten ({patientCount})</h3>

            <div className="kinePatientsActions">
              <div className="kineSearch">
                <img src="/images/search-icon.svg" alt="Zoek icoon" />
                <input
                  type="text"
                  placeholder="Zoek patiënt..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <button type="button" className="btn-outline-small">
                <img src="/images/check-square.png" alt="Selecteer icoon" />
                <span>Selecteer</span>
              </button>

              <button
                type="button"
                className="btn-primary-small"
                onClick={() => navigate("/kinesist/patient/new")}
              >
                Patiënt toevoegen
              </button>
            </div>
          </div>

          {errorMessage && <p className="kineError">{errorMessage}</p>}

        
          <div className="kinePatientsTable">
          <div className="kinePatientsHead">
              <div>Naam</div>
              <div>Leeftijd</div>
              <div>Behandeldoel</div>
              <div></div>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="kinePatientsEmpty EmptyState">
                <img src="/images/monkey-empty.png" alt="Geen patiënten gevonden" />
                <p>Je hebt nog geen patiënten.</p>
                <button
                type="button"
                className="btn-outline-small btn-smaller"
                onClick={() => navigate("/kinesist/patient/new")}
              >
                Patiënt toevoegen
              </button>
              </div>
            ) : (
              
              filteredPatients.map((patient, index) => (
                
                <div key={patient.id} className="kinePatientRowWrap">
                  <button
                    type="button"
                    className="kinePatientRow"
                    onClick={() => navigate(`/patient/${patient.id}`)}
                  >
                    <div className="kinePatientNameCell">
                      <div
                        className="kinePatientAvatar"
                        style={{ backgroundColor: getAvatarColor(index) }}
                      >
                        {getInitials(patient.name)}
                      </div>

                      <span className="kinePatientName">{patient.name}</span>
                    </div>

                    <div className="kinePatientAge">
                      {patient.birth_date
                        ? `${calculateAge(patient.birth_date)} jaar`
                        : "-"}
                    </div>

                    <div className="kinePatientGoal">
                      {patient.goal || "-"}
                    </div>

                    <div></div>
                  </button>

                  <div
                    className="kinePatientMenuWrap"
                    ref={openMenuId === patient.id ? menuRef : null}
                  >
                    <button
                      type="button"
                      className="kinePatientMoreBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId((prev) =>
                          prev === patient.id ? null : patient.id
                        );
                      }}
                    >
                      •••
                    </button>

                    {openMenuId === patient.id && (
                      <div className="kinePatientMenu">
                        <button
                          type="button"
                          onClick={() => openEditModal(patient)}
                        >
                          Bewerken
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setArchivePatient(patient);
                            setOpenMenuId(null);
                          }}
                        >
                          Archiveren
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {editingPatient && (
        <div className="kineModalOverlay" onClick={closeEditModal}>
          <div
            className="kineModal kineModal--large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kineModalHeader">
              <h3>Patiënt bewerken</h3>
              <button
                type="button"
                className="kineModalClose"
                onClick={closeEditModal}
              >
                ×
              </button>
            </div>

            <div className="kineModalBody">
              <div className="kineEditIntro">
                <div className="kineEditAvatar">
                  {getInitials(editName)}
                </div>
                <span>{editName || "Naam patiënt"}</span>
              </div>

              <form className="kineEditForm" onSubmit={handleUpdatePatient}>
                <div className="kineField">
                  <label>Naam van het kind</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="kineField">
                  <label>Naam van de ouder</label>
                  <input
                    type="text"
                    value={editParentName}
                    onChange={(e) => setEditParentName(e.target.value)}
                  />
                </div>

                <div className="kineField kineField--small">
                  <label>Geboortedatum</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                  />
                </div>

                <div className="kineField">
                  <label>Behandeldoel</label>
                  <input
                    type="text"
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                  />
                </div>

                <div className="kineField">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>

                <div className="kineField">
                  <label>Telefoonnummer</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="kineModalFooter">
                  <button
                    type="button"
                    className="kineTextAction"
                    onClick={closeEditModal}
                  >
                    Annuleren
                  </button>

                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={savingEdit}
                  >
                    {savingEdit ? "Opslaan..." : "Opslaan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {archivePatient && (
        <div
          className="kineModalOverlay"
          onClick={() => setArchivePatient(null)}
        >
          <div
            className="kineModal kineModal--archive"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kineModalHeader">
              <h3>Patiënt archiveren</h3>
              <button
                type="button"
                className="kineModalClose"
                onClick={() => setArchivePatient(null)}
              >
                ×
              </button>
            </div>

            <div className="kineModalBody">
              <p className="kineArchiveText">
                De patiënt wordt gearchiveerd en blijft bewaard in het systeem.
                Je kan deze later altijd terug bekijken of herstellen.
              </p>

              <div className="kineArchiveActions">
                <button
                  type="button"
                  className="kineTextAction"
                  onClick={() => setArchivePatient(null)}
                >
                  Annuleren
                </button>

                <button
                  type="button"
                  className="btn-archive"
                  onClick={handleArchivePatient}
                  disabled={archiving}
                >
                  {archiving ? "Archiveren..." : "Archiveren"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}