import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/patient-details.css";
import "../assets/css/kine-dashboard.css";

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthLabel(date) {
  return date.toLocaleDateString("nl-BE", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7; // maandag = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];

  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  return days;
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

export default function PatientDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [activeTab, setActiveTab] = useState("overzicht");

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

  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [savingExercise, setSavingExercise] = useState(false);

  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));
  const [scheduledExercises, setScheduledExercises] = useState([]);

  const calendarDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  const exerciseSchedule = useMemo(() => {
    const grouped = {};

    for (const item of scheduledExercises) {
      const dateKey = item.scheduled_date;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push({
        id: item.id,
        title: item.exercise?.title || "",
        category: item.exercise?.category || "",
        duration: item.exercise?.duration_minutes
          ? `${item.exercise.duration_minutes} min`
          : "-",
        reps: item.exercise?.repetitions
          ? `${item.exercise.repetitions} herhalingen`
          : "-",
        image: item.exercise?.image_url || "/images/exercise-1.png",
        tagClass:
          item.exercise?.category === "Mobiliteit"
            ? "exerciseTag--yellow"
            : item.exercise?.category === "Flexibiliteit"
            ? "exerciseTag--pink"
            : "exerciseTag--blue",
      });
    }

    return grouped;
  }, [scheduledExercises]);

  const selectedExercises = useMemo(() => {
    return exerciseSchedule[selectedDate] || [];
  }, [exerciseSchedule, selectedDate]);

  const visibleMonthLabel = useMemo(() => getMonthLabel(currentMonth), [currentMonth]);

  useEffect(() => {
    loadPatient();
    loadPatientExercises();
    loadExerciseLibrary();
  }, [id]);

  async function loadPatient() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .eq("kinesist_id", user.id)
        .single();

      if (error) throw error;

      if (!data) {
        setErrorMessage("Patiënt niet gevonden.");
        setLoading(false);
        return;
      }

      setPatient(data);
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt kon niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPatientExercises() {
    try {
      const { data, error } = await supabase
        .from("patient_exercises")
        .select(`
          id,
          scheduled_date,
          is_completed,
          exercise:exercises (
            id,
            title,
            category,
            duration_minutes,
            repetitions,
            image_url
          )
        `)
        .eq("patient_id", id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      setScheduledExercises(data || []);
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefeningen konden niet geladen worden.");
    }
  }

  async function loadExerciseLibrary() {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("title", { ascending: true });

      if (error) throw error;

      setExerciseLibrary(data || []);
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefenbibliotheek kon niet geladen worden.");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function openEditModal() {
    if (!patient) return;

    setEditingPatient(patient);
    setEditName(patient.name || "");
    setEditParentName(patient.parent_name || "");
    setEditGoal(patient.goal || "");
    setEditBirthDate(patient.birth_date || "");
    setEditEmail(patient.parent_email || "");
    setEditPhone(patient.parent_phone || "");
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

  function openAddExerciseModal() {
    setSelectedExerciseId("");
    setScheduledDate("");
    setShowAddExerciseModal(true);
  }

  function closeAddExerciseModal() {
    setShowAddExerciseModal(false);
    setSelectedExerciseId("");
    setScheduledDate("");
  }

  async function handleAddExercise(e) {
    e.preventDefault();

    if (!selectedExerciseId || !scheduledDate) {
      setErrorMessage("Kies een oefening en een datum.");
      return;
    }

    try {
      setSavingExercise(true);
      setErrorMessage("");

      const { error } = await supabase.from("patient_exercises").insert({
        patient_id: id,
        exercise_id: selectedExerciseId,
        scheduled_date: scheduledDate,
        is_completed: false,
      });

      if (error) throw error;

      await loadPatientExercises();
      setSelectedDate(scheduledDate);
      closeAddExerciseModal();
      setActiveTab("programma");
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefening toevoegen is mislukt.");
    } finally {
      setSavingExercise(false);
    }
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

      await loadPatient();
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

      navigate("/kinesist/dashboard");
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt archiveren is mislukt.");
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="kineDashLoading">
        <p>Patiënt laden...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="kineDashLoading">
        <p>{errorMessage || "Patiënt niet gevonden."}</p>
      </div>
    );
  }

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="patientDetailsMain">
        <div className="patientDetailsTopbar">
          <button
            type="button"
            className="patientBack"
            onClick={() => navigate("/kinesist/dashboard")}
          >
            <img src="/images/back-icon.svg" alt="back" />
            <span>Terug naar overzicht</span>
          </button>

          <div className="patientTopActions">
            <button type="button" className="btn-primary-small" onClick={openEditModal}>
              <img src="/images/edit.svg" alt="" />
              <span>Bewerken</span>
            </button>

            <button
              type="button"
              className="patientArchiveBtn"
              onClick={() => setArchivePatient(patient)}
            >
              <img src="/images/archive.svg" alt="" />
              <span>Archiveren</span>
            </button>
          </div>
        </div>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        <section className="patientHeroCard">
          <div className="patientHeroTop">
            <div className="patientHeroLeft">
              <div className="patientAvatarBig">{getInitials(patient.name)}</div>

              <div className="patientHeroInfo">
                <div className="patientHeroNameRow">
                  <h1>{patient.name}</h1>
                  <span>{calculateAge(patient.birth_date)} jaar</span>
                </div>

                <p>Startdatum: {patient.created_at?.slice(0, 10) || "-"}</p>
                <p>{patient.goal || "-"}</p>
              </div>
            </div>

            <div className="patientHeroQr">
              <div className="patientQrBox">⌘</div>
            </div>
          </div>

          <div className="patientHeroBottom">
            <div>
              <strong>{patient.parent_name || "Geen ouder ingevuld"}</strong>
              <span>Ouder/verzorger</span>
            </div>

            <div className="patientContactInfo">
              <span>{patient.parent_phone || "-"}</span>
              <span>{patient.parent_email || "-"}</span>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="patientAddExerciseBtn"
          onClick={openAddExerciseModal}
        >
          Oefening toevoegen
          <img src="/images/plus.svg" alt="" />
        </button>

        <section className="patientStatsSection">
          <div className="patientStatsHeader">
            <h2>Weekstatus</h2>
          </div>

          <div className="patientStatsGrid">
            <div className="patientStatItem">
              <div className="statFlex">
                <img src="/images/streak.svg" alt="" />
                <strong>2</strong>
              </div>
              <span>Streak</span>
            </div>

            <div className="patientStatItem">
              <div className="statFlex">
                <img src="/images/task.svg" alt="" />
                <strong>1/3</strong>
              </div>
              <span>Vandaag voltooid</span>
            </div>

            <div className="patientStatItem">
              <div className="statFlex">
                <img src="/images/progress.svg" alt="" />
                <strong>12/35</strong>
              </div>
              <span>Totaal voltooid</span>
            </div>
          </div>
        </section>

        <section className="patientTabs">
          <button
            className={activeTab === "overzicht" ? "is-active" : ""}
            onClick={() => setActiveTab("overzicht")}
          >
            Overzicht
          </button>
          <button
            className={activeTab === "programma" ? "is-active" : ""}
            onClick={() => setActiveTab("programma")}
          >
            Programma
          </button>
          <button
            className={activeTab === "logboek" ? "is-active" : ""}
            onClick={() => setActiveTab("logboek")}
          >
            Logboek
          </button>
        </section>

        {activeTab === "overzicht" && (
          <>
            <section className="patientProgressSection">
              <div className="patientSectionHeader">
                <h3>Voortgang per categorie</h3>
                <button type="button" className="patientFilterBtn">
                  deze maand ˅
                </button>
              </div>

              <div className="patientProgressList">
                <div className="patientProgressItem">
                  <div className="patientProgressTop">
                    <span>Balans</span>
                    <div className="patientProgressMeta">
                      <small className="is-positive">↗ +23%</small>
                      <strong>78%</strong>
                    </div>
                  </div>
                  <div className="progressBar progressBlue">
                    <div style={{ width: "78%" }} />
                  </div>
                </div>

                <div className="patientProgressItem">
                  <div className="patientProgressTop">
                    <span>Kracht</span>
                    <div className="patientProgressMeta">
                      <small className="is-positive">↗ +3%</small>
                      <strong>88%</strong>
                    </div>
                  </div>
                  <div className="progressBar progressGreen">
                    <div style={{ width: "88%" }} />
                  </div>
                </div>

                <div className="patientProgressItem">
                  <div className="patientProgressTop">
                    <span>Motoriek</span>
                    <div className="patientProgressMeta">
                      <small className="is-negative">↘ -12%</small>
                      <strong>65%</strong>
                    </div>
                  </div>
                  <div className="progressBar progressYellow">
                    <div style={{ width: "65%" }} />
                  </div>
                </div>

                <div className="patientProgressItem">
                  <div className="patientProgressTop">
                    <span>Flexibiliteit</span>
                    <div className="patientProgressMeta">
                      <small className="is-positive">↗ +14%</small>
                      <strong>98%</strong>
                    </div>
                  </div>
                  <div className="progressBar progressPink">
                    <div style={{ width: "98%" }} />
                  </div>
                </div>
              </div>
            </section>

            <section className="patientExercisesSection">
              <div className="patientSectionHeader">
                <h3>Voltooide oefeningen</h3>
                <button type="button" className="patientFilterBtn">
                  deze maand ˅
                </button>
              </div>

              <div className="exerciseCardList">
                <div className="exerciseCard">
                  <img src="/images/exercise-1.png" alt="" />
                  <div>
                    <strong>Op één been staan</strong>
                    <span>Mobiliteit</span>
                    <p>3 min · 10 herhalingen</p>
                  </div>
                </div>

                <div className="exerciseCard">
                  <img src="/images/exercise-2.png" alt="" />
                  <div>
                    <strong>Stretch naar de Sterren</strong>
                    <span>Mobiliteit</span>
                    <p>2 min · 10 herhalingen</p>
                  </div>
                </div>

                <div className="exerciseCard">
                  <img src="/images/exercise-3.png" alt="" />
                  <div>
                    <strong>Boomstam Omhelzing</strong>
                    <span>Flexibiliteit</span>
                    <p>2 min · 10 herhalingen</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "programma" && (
          <section className="patientProgramSection">
            <div className="patientProgramHeader">
              <h3>Actief oefenprogramma</h3>

              <div className="patientProgramMonth">
                <img src="/images/calendar-blue.svg" alt="" />
                <span>{visibleMonthLabel}</span>
              </div>
            </div>

            <div className="patientProgramGrid">
              <div className="programCalendarCard">
                <div className="programCalendarTop">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() - 1,
                          1
                        )
                      )
                    }
                  >
                    ‹
                  </button>

                  <h4>{visibleMonthLabel}</h4>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() + 1,
                          1
                        )
                      )
                    }
                  >
                    ›
                  </button>
                </div>

                <div className="programCalendarWeekdays">
                  <span>M</span>
                  <span>D</span>
                  <span>W</span>
                  <span>D</span>
                  <span>V</span>
                  <span>Z</span>
                  <span>Z</span>
                </div>

                <div className="programCalendarGrid">
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="calendarDay is-empty"
                        ></div>
                      );
                    }

                    const dateKey = formatDateKey(date);
                    const isSelected = selectedDate === dateKey;
                    const isToday = dateKey === formatDateKey(today);
                    const dayExercises = exerciseSchedule[dateKey] || [];

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        className={`calendarDay ${isSelected ? "is-active" : ""} ${isToday ? "is-today" : ""}`}
                        onClick={() => setSelectedDate(dateKey)}
                      >
                        <span>{date.getDate()}</span>

                        {dayExercises.length > 0 && (
                          <div className="calendarDots">
                            {dayExercises.slice(0, 3).map((_, i) => (
                              <i key={i}></i>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="programExerciseList">
                {selectedExercises.length === 0 ? (
                  <div className="programEmptyState">
                    <strong>Geen oefeningen gepland</strong>
                    <p>Er zijn geen oefeningen gekoppeld aan deze dag.</p>
                  </div>
                ) : (
                  selectedExercises.map((exercise) => (
                    <div key={exercise.id} className="programExerciseCard">
                      <img src={exercise.image} alt="" />

                      <div className="programExerciseInfo">
                        <strong>{exercise.title}</strong>

                        <div className="programExerciseTagRow">
                          <span className={`exerciseTag ${exercise.tagClass}`}>
                            {exercise.category}
                          </span>
                          <span className="programBars">▮▮▮</span>
                        </div>

                        <p>
                          {exercise.duration} · {exercise.reps}
                        </p>
                      </div>

                      <div className="programExerciseActions">
                          <button type="button" className="programExerciseActionBtn">
                            <img src="/images/favorite.svg" alt="Favorite" />
                          </button>
                          <button type="button" className="programExerciseActionBtn">
                            <img src="/images/dots.svg" alt="Options" />
                          </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "logboek" && (
          <section className="patientLogbookSection">
            <div className="patientLogbookTop">
              <div>
                <h3>Notities & observaties</h3>
                <p>
                  Deze notities zijn uitsluitend bedoeld voor intern gebruik en zijn
                  niet zichtbaar voor patiënten.
                </p>
              </div>

              <button type="button" className="patientNewNoteBtn">
                Nieuwe notitie +
              </button>
            </div>

            <div className="logbookList">
              <div className="logbookCard">
                <div className="logbookEdit">✎</div>
                <small>17 dec · 09:30</small>
                <strong>Sessie evaluatie</strong>
                <p>
                  Liam toont significante verbetering in balans oefeningen. Ouders
                  melden dat hij thuis ook meer zelfvertrouwen toont bij bewegen.
                  Volgende sessie focus op fijnmotoriek.
                </p>
                <div className="logbookFooter">Dr. Janssens</div>
              </div>

              <div className="logbookCard">
                <div className="logbookEdit">✎</div>
                <small>17 dec · 19:30</small>
                <strong>Voortgangsnotitie</strong>
                <p>
                  Goede sessie met focus op looptraining. Liam laat vooruitgang zien in
                  zijn looppatroon. Blijven werken aan coördinatie.
                </p>
                <div className="logbookFooter">Dr. Janssens</div>
              </div>
            </div>
          </section>
        )}
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
                <div className="kineEditAvatar">{getInitials(editName)}</div>
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

      {showAddExerciseModal && (
        <div className="kineModalOverlay" onClick={closeAddExerciseModal}>
          <div
            className="kineModal kineModal--addExercise"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kineModalHeader">
              <h3>Oefening toevoegen</h3>
              <button
                type="button"
                className="kineModalClose"
                onClick={closeAddExerciseModal}
              >
                ×
              </button>
            </div>

            <div className="kineModalBody">
              <form className="kineEditForm" onSubmit={handleAddExercise}>
                <div className="kineField">
                  <label>Kies een oefening</label>
                  <select
                    className="kineSelect"
                    value={selectedExerciseId}
                    onChange={(e) => setSelectedExerciseId(e.target.value)}
                  >
                    <option value="">Selecteer een oefening</option>
                    {exerciseLibrary.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="kineField kineField--small">
                  <label>Datum</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                <div className="kineModalFooter">
                  <button
                    type="button"
                    className="kineTextAction"
                    onClick={closeAddExerciseModal}
                  >
                    Annuleren
                  </button>

                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={savingExercise}
                  >
                    {savingExercise ? "Opslaan..." : "Toevoegen"}
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