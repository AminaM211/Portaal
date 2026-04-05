import { useEffect, useMemo, useState } from "react";
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
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [goal, setGoal] = useState("");

  useEffect(() => {
    loadDashboard();
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
        .select("id, name, age, goal, created_at")
        .eq("kinesist_id", user.id)
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

  async function handleAddPatient(e) {
    e.preventDefault();

    try {
      setErrorMessage("");

      const trimmedName = name.trim();
      const trimmedGoal = goal.trim();

      if (!trimmedName) {
        setErrorMessage("Vul een naam in.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { error } = await supabase.from("patients").insert({
        kinesist_id: user.id,
        name: trimmedName,
        age: age ? Number(age) : null,
        goal: trimmedGoal || null,
      });

      if (error) throw error;

      setName("");
      setAge("");
      setGoal("");
      setShowForm(false);

      await loadDashboard();
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt toevoegen is mislukt.");
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
              <img
                src="/images/profile-avatar.png"
                alt=""
              />
            </div>

            <div className="kineDashProfileInfo">
              <h2>{profile?.full_name || "Willem de Vries"}</h2>
              <p>Kinderkinesist</p>
            </div>
          </div>
        </header>

        <section className="kineDashStats">
          <div className="kineStat">
            <img src="/images/icon-patients.svg" alt="" />
            <div>
              <strong>{patientCount}</strong>
              <span>Patiënten</span>
            </div>
          </div>

          <div className="kineStat">
            <img src="/images/icon-therapy.svg" alt="" />
            <div>
              <strong>{averageTherapy}</strong>
              <span>Therapietrouw</span>
            </div>
          </div>

          <div className="kineStat">
            <img src="/images/icon-compliance.svg" alt="" />
            <div>
              <strong>{complianceRate}</strong>
              <span>Nalevingspercentage</span>
            </div>
          </div>
        </section>

        <section className="kinePatientsSection">
          <div className="kinePatientsHeader">
            <h3>Mijn Patiënten ({patientCount})</h3>

            <div className="kinePatientsActions">
              <div className="kineSearch">
                <img src="/images/search-icon.svg" alt="" />
                <input
                  type="text"
                  placeholder="Zoek patiënt..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <button type="button" className="btn-outline-small">
                <img src="/images/check-square.svg" alt="" />
                <span>Selecteer</span>
              </button>

              <button
                type="button"
                className="btn-primary-small"
                onClick={() => setShowForm((prev) => !prev)}
              >
                Patiënt toevoegen
              </button>
            </div>
          </div>

          {showForm && (
            <form className="kineAddPatientForm" onSubmit={handleAddPatient}>
              <input
                type="text"
                placeholder="Naam patiënt"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="number"
                placeholder="Leeftijd"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />

              <input
                type="text"
                placeholder="Behandeldoel"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />

              <button type="submit" className="btn-primary-small">
                Opslaan
              </button>
            </form>
          )}

          {errorMessage && <p className="kineError">{errorMessage}</p>}

          <div className="kinePatientsTable">
            <div className="kinePatientsHead">
              <div>Naam</div>
              <div>Leeftijd</div>
              <div>Behandeldoel</div>
              <div></div>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="kinePatientsEmpty">
                Je hebt nog geen patiënten.
              </div>
            ) : (
              filteredPatients.map((patient, index) => (
                <button
                  key={patient.id}
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
                    {patient.age ? `${patient.age} jaar` : "-"}
                  </div>

                  <div className="kinePatientGoal">
                    {patient.goal || "-"}
                  </div>

                  <div className="kinePatientMore">•••</div>
                </button>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}