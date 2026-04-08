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

function formatDisplayDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "short",
  }) +
    " · " +
    date.toLocaleTimeString("nl-BE", {
      hour: "2-digit",
      minute: "2-digit",
    });
}

function getCategoryClass(category) {
  if (category === "Mobiliteit") return "exerciseTag--yellow";
  if (category === "Flexibiliteit") return "exerciseTag--pink";
  if (category === "Kracht") return "exerciseTag--blue";
  if (category === "Balans") return "exerciseTag--green";
  return "exerciseTag--blue";
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function PatientDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageRefreshing, setPageRefreshing] = useState(false);
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

  const [scheduledExercises, setScheduledExercises] = useState([]);
  const [exerciseActionLoadingId, setExerciseActionLoadingId] = useState(null);

  const [notesEnabled, setNotesEnabled] = useState(true);
  const [notes, setNotes] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));

  const calendarDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  useEffect(() => {
    initializePage();
  }, [id]);
  
  useEffect(() => {
    if (userId) {
      loadNotesSafe(userId);
    }
  }, [profile, userId]);

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

      setUserId(user.id);

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

      await Promise.all([
        loadPatient(user.id),
        loadPatientExercises(),
        loadExerciseLibrary(),
        loadNotesSafe(user.id),
      ]);
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt kon niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    try {
      setPageRefreshing(true);
      setErrorMessage("");
      await Promise.all([
        loadPatient(userId),
        loadPatientExercises(),
        loadExerciseLibrary(),
        loadNotesSafe(userId),
      ]);
    } catch (error) {
      console.error(error);
      setErrorMessage("Gegevens vernieuwen is mislukt.");
    } finally {
      setPageRefreshing(false);
    }
  }

  async function loadPatient(currentUserId) {
    const authUserId = currentUserId || userId;

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .eq("kinesist_id", authUserId)
      .single();

    if (error) throw error;

    setPatient(data || null);
  }

  async function loadPatientExercises() {
    const { data, error } = await supabase
      .from("patient_exercises")
      .select(`
        id,
        patient_id,
        exercise_id,
        scheduled_date,
        is_completed,
        created_at,
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
  }

  async function loadExerciseLibrary() {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("title", { ascending: true });

    if (error) throw error;

    setExerciseLibrary(data || []);
  }

  async function loadNotesSafe(currentUserId) {
    const authUserId = currentUserId || userId;
  
    try {
      const { data, error } = await supabase
        .from("patient_notes")
        .select("id, patient_id, author_id, note, created_at")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error("patient_notes load error:", error);
        throw error;
      }
  
      setNotesEnabled(true);
  
      const notesWithAuthor = (data || []).map((item) => ({
        ...item,
        author: {
          full_name:
            item.author_id === authUserId
              ? profile?.full_name || "Jij"
              : "Kinesist",
        },
      }));
  
      setNotes(notesWithAuthor);
    } catch (error) {
      console.error("loadNotesSafe unexpected error:", error);
      setNotesEnabled(true);
      setNotes([]);
      setErrorMessage("Logboek kon niet geladen worden.");
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
    setScheduledDate(selectedDate || formatDateKey(new Date()));
    setShowAddExerciseModal(true);
  }

  function closeAddExerciseModal() {
    setShowAddExerciseModal(false);
    setSelectedExerciseId("");
    setScheduledDate("");
  }

  function openNoteModal(note = null) {
    setEditingNote(note);
    setNoteText(note?.note || "");
    setShowNoteModal(true);
  }

  function closeNoteModal() {
    setEditingNote(null);
    setNoteText("");
    setShowNoteModal(false);
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

  async function handleToggleExerciseComplete(item) {
    try {
      setExerciseActionLoadingId(item.id);
      setErrorMessage("");

      const { error } = await supabase
        .from("patient_exercises")
        .update({ is_completed: !item.is_completed })
        .eq("id", item.id);

      if (error) throw error;

      await loadPatientExercises();
    } catch (error) {
      console.error(error);
      setErrorMessage("Status van oefening wijzigen is mislukt.");
    } finally {
      setExerciseActionLoadingId(null);
    }
  }

  async function handleDeleteExercise(itemId) {
    const confirmed = window.confirm(
      "Wil je deze oefening verwijderen uit het programma?"
    );
    if (!confirmed) return;

    try {
      setExerciseActionLoadingId(itemId);
      setErrorMessage("");

      const { error } = await supabase
        .from("patient_exercises")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      await loadPatientExercises();
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefening verwijderen is mislukt.");
    } finally {
      setExerciseActionLoadingId(null);
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

      await loadPatient(userId);
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

  async function handleSaveNote(e) {
    e.preventDefault();

    const trimmed = noteText.trim();
    if (!trimmed) {
      setErrorMessage("Een notitie mag niet leeg zijn.");
      return;
    }

    if (!notesEnabled) {
      setErrorMessage("De tabel patient_notes bestaat nog niet.");
      return;
    }

    try {
      setSavingNote(true);
      setErrorMessage("");

      if (editingNote) {
        const { error } = await supabase
          .from("patient_notes")
          .update({
            note: trimmed,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingNote.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("patient_notes").insert({
          patient_id: id,
          author_id: userId,
          note: trimmed,
        });

        if (error) throw error;
      }

      await loadNotesSafe(userId);
      closeNoteModal();
    } catch (error) {
      console.error(error);
      setErrorMessage("Notitie opslaan is mislukt.");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId) {
    const confirmed = window.confirm("Wil je deze notitie verwijderen?");
    if (!confirmed) return;

    try {
      setDeletingNoteId(noteId);
      setErrorMessage("");

      const { error } = await supabase
        .from("patient_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      await loadNotesSafe(userId);
    } catch (error) {
      console.error(error);
      setErrorMessage("Notitie verwijderen is mislukt.");
    } finally {
      setDeletingNoteId(null);
    }
  }

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
        tagClass: getCategoryClass(item.exercise?.category),
        is_completed: !!item.is_completed,
      });
    }

    return grouped;
  }, [scheduledExercises]);

  const selectedExercises = useMemo(() => {
    return exerciseSchedule[selectedDate] || [];
  }, [exerciseSchedule, selectedDate]);

  const visibleMonthLabel = useMemo(
    () => getMonthLabel(currentMonth),
    [currentMonth]
  );

  const stats = useMemo(() => {
    const todayKey = formatDateKey(new Date());
    const weekStart = startOfWeekMonday();
    const weekStartKey = formatDateKey(weekStart);

    const todayItems = scheduledExercises.filter(
      (item) => item.scheduled_date === todayKey
    );
    const todayCompleted = todayItems.filter((item) => item.is_completed).length;

    const totalAssigned = scheduledExercises.length;
    const totalCompleted = scheduledExercises.filter(
      (item) => item.is_completed
    ).length;

    const thisWeekItems = scheduledExercises.filter(
      (item) => item.scheduled_date >= weekStartKey && item.scheduled_date <= todayKey
    );

    const completedDates = Array.from(
      new Set(
        scheduledExercises
          .filter((item) => item.is_completed)
          .map((item) => item.scheduled_date)
      )
    ).sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;
    let cursor = startOfToday();

    while (true) {
      const key = formatDateKey(cursor);
      if (completedDates.includes(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    const weeklyCompletion =
      thisWeekItems.length > 0
        ? Math.round(
            (thisWeekItems.filter((item) => item.is_completed).length /
              thisWeekItems.length) *
              100
          )
        : 0;

    return {
      todayCompleted,
      todayTotal: todayItems.length,
      totalAssigned,
      totalCompleted,
      streak,
      weeklyCompletion,
    };
  }, [scheduledExercises]);

  const categoryProgress = useMemo(() => {
    const map = {};

    for (const item of scheduledExercises) {
      const category = item.exercise?.category || "Overig";

      if (!map[category]) {
        map[category] = {
          category,
          total: 0,
          completed: 0,
        };
      }

      map[category].total += 1;

      if (item.is_completed) {
        map[category].completed += 1;
      }
    }

    return Object.values(map)
      .map((entry) => ({
        ...entry,
        percentage:
          entry.total > 0
            ? Math.round((entry.completed / entry.total) * 100)
            : 0,
        progressClass:
          entry.category === "Balans"
            ? "progressBlue"
            : entry.category === "Kracht"
            ? "progressGreen"
            : entry.category === "Motoriek"
            ? "progressYellow"
            : entry.category === "Flexibiliteit"
            ? "progressPink"
            : "progressBlue",
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [scheduledExercises]);

  const recentCompletedExercises = useMemo(() => {
    return [...scheduledExercises]
      .filter((item) => item.is_completed)
      .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))
      .slice(0, 6);
  }, [scheduledExercises]);

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
            <button
              type="button"
              className="btn-primary-small"
              onClick={openEditModal}
            >
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

                <p>Startdatum: {formatDisplayDate(patient.created_at)}</p>
                <p>{patient.goal || "-"}</p>
              </div>
            </div>

            <div className="patientHeroQr">
              <div className="patientQrBox">
                {patient.activation_code || "—"}
              </div>
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
                <strong>{stats.streak}</strong>
              </div>
              <span>Streak</span>
            </div>

            <div className="patientStatItem">
              <div className="statFlex">
                <img src="/images/task.svg" alt="" />
                <strong>
                  {stats.todayCompleted}/{stats.todayTotal}
                </strong>
              </div>
              <span>Vandaag voltooid</span>
            </div>

            <div className="patientStatItem">
              <div className="statFlex">
                <img src="/images/progress.svg" alt="" />
                <strong>
                  {stats.totalCompleted}/{stats.totalAssigned}
                </strong>
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
                  live data
                </button>
              </div>

              <div className="patientProgressList">
                {categoryProgress.length === 0 ? (
                  <div className="programEmptyState">
                    <strong>Nog geen categoriegegevens</strong>
                    <p>Koppel eerst oefeningen aan deze patiënt.</p>
                  </div>
                ) : (
                  categoryProgress.map((item) => (
                    <div key={item.category} className="patientProgressItem">
                      <div className="patientProgressTop">
                        <span>{item.category}</span>
                        <div className="patientProgressMeta">
                          <small>
                            {item.completed}/{item.total} voltooid
                          </small>
                          <strong>{item.percentage}%</strong>
                        </div>
                      </div>
                      <div className={`progressBar ${item.progressClass}`}>
                        <div style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="patientExercisesSection">
              <div className="patientSectionHeader">
                <h3>Recent voltooide oefeningen</h3>
                <button type="button" className="patientFilterBtn">
                  laatste 6
                </button>
              </div>

              <div className="exerciseCardList">
                {recentCompletedExercises.length === 0 ? (
                  <div className="programEmptyState">
                    <strong>Nog geen voltooide oefeningen</strong>
                    <p>
                      Zodra oefeningen voltooid worden, verschijnen ze hier.
                    </p>
                  </div>
                ) : (
                  recentCompletedExercises.map((item) => (
                    <div key={item.id} className="exerciseCard">
                      <img
                        src={item.exercise?.image_url || "/images/exercise-1.png"}
                        alt=""
                      />
                      <div>
                        <strong>{item.exercise?.title || "Oefening"}</strong>
                        <span>{item.exercise?.category || "Overig"}</span>
                        <p>
                          {item.exercise?.duration_minutes
                            ? `${item.exercise.duration_minutes} min`
                            : "-"}{" "}
                          ·{" "}
                          {item.exercise?.repetitions
                            ? `${item.exercise.repetitions} herhalingen`
                            : "-"}
                        </p>
                        <small>Voltooid op {formatDisplayDate(item.scheduled_date)}</small>
                      </div>
                    </div>
                  ))
                )}
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
                    const completedCount = dayExercises.filter(
                      (item) => item.is_completed
                    ).length;

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        className={`calendarDay ${isSelected ? "is-active" : ""} ${
                          isToday ? "is-today" : ""
                        }`}
                        onClick={() => setSelectedDate(dateKey)}
                      >
                        <span>{date.getDate()}</span>

                        {dayExercises.length > 0 && (
                          <div className="calendarDots">
                            {dayExercises.map((_, i) => (
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
                          <span className="programBars">
                            {exercise.is_completed ? "Voltooid" : ""}
                          </span>
                        </div>

                        <p>
                          {exercise.duration} · {exercise.reps}
                        </p>
                      </div>

                      <div className="programExerciseActions">
                        <button
                          type="button"
                          className="programExerciseActionBtn"
                          onClick={() =>
                            handleToggleExerciseComplete({
                              id: exercise.id,
                              is_completed: exercise.is_completed,
                            })
                          }
                          disabled={exerciseActionLoadingId === exercise.id}
                          title={
                            exercise.is_completed
                              ? "Markeer als niet voltooid"
                              : "Markeer als voltooid"
                          }
                        >
                          {/* {exercise.is_completed ? "↺" : "✓"} */}
                        </button>

                        <button
                          type="button"
                          className="programExerciseActionBtn"
                          onClick={() => handleDeleteExercise(exercise.id)}
                          disabled={exerciseActionLoadingId === exercise.id}
                          title="Verwijderen"
                        >
                          ×
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
                  Deze notities zijn uitsluitend bedoeld voor intern gebruik en
                  zijn niet zichtbaar voor patiënten.
                </p>
              </div>

              {notesEnabled && (
                <button
                  type="button"
                  className="patientNewNoteBtn"
                  onClick={() => openNoteModal()}
                >
                  Nieuwe notitie +
                </button>
              )}
            </div>

            {!notesEnabled ? (
              <div className="programEmptyState">
                <strong>Logboek nog niet geactiveerd</strong>
                <p>
                  Maak eerst een tabel <code>patient_notes</code> in Supabase.
                </p>
              </div>
            ) : notes.length === 0 ? (
              <div className="programEmptyState">
                <strong>Nog geen notities</strong>
                <p>Voeg een eerste observatie toe voor deze patiënt.</p>
              </div>
            ) : (
              <div className="logbookList">
                {notes.map((note) => (
                  <div key={note.id} className="logbookCard">
                    <div
                      className="logbookEdit"
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <button
                        type="button"
                        onClick={() => openNoteModal(note)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletingNoteId === note.id}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        🗑
                      </button>
                    </div>

                    <small>{formatDateTime(note.updated_at || note.created_at)}</small>
                    <strong>
                      {note.updated_at ? "Bijgewerkte notitie" : "Notitie"}
                    </strong>
                    <p>{note.note}</p>
                    <div className="logbookFooter">
                      {note.author?.full_name || profile?.full_name || "Kinesist"}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {showNoteModal && (
        <div className="kineModalOverlay" onClick={closeNoteModal}>
          <div
            className="kineModal kineModal--note"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kineModalHeader">
              <h3>{editingNote ? "Notitie bewerken" : "Nieuwe notitie"}</h3>
              <button
                type="button"
                className="kineModalClose"
                onClick={closeNoteModal}
              >
                ×
              </button>
            </div>

            <div className="kineModalBody">
              <form className="kineEditForm" onSubmit={handleSaveNote}>
                <div className="kineField">
                  <label>Notitie</label>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={7}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      padding: 14,
                      border: "1px solid #d8d8d8",
                      resize: "vertical",
                    }}
                    placeholder="Schrijf hier je observatie of sessienotitie..."
                  />
                </div>

                <div className="kineModalFooter">
                  <button
                    type="button"
                    className="kineTextAction"
                    onClick={closeNoteModal}
                  >
                    Annuleren
                  </button>

                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={savingNote}
                  >
                    {savingNote ? "Opslaan..." : "Opslaan"}
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