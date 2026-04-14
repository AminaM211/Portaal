import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/exercise-detail.css";
import "../assets/css/kine-dashboard.css";

function formatDateForInput(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysBetween(start, end) {
  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}


function generateScheduledDates(startDateStr, endDateStr, repeat) {
    if (!startDateStr) return [];
  
    const start = new Date(startDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date(startDateStr);
  
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
  
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    if (end < start) return [];
  
    const allDates = getDaysBetween(start, end);
  
    // "Nooit" = elke dag tussen start en einde
    if (repeat === "Nooit") {
      return allDates.map((date) => formatDateKey(date));
    }
  
    // "Wekelijks" = zelfde weekdag als startdatum, elke 7 dagen
    if (repeat === "Wekelijks") {
      const dates = [];
      const current = new Date(start);
  
      while (current <= end) {
        dates.push(formatDateKey(current));
        current.setDate(current.getDate() + 7);
      }
  
      return dates.length > 0 ? dates : [formatDateKey(start)];
    }
  
    const allowedWeekdaysMap = {
      "2x per week": [1, 4],
      "3x per week": [1, 3, 5],
      "4x per week": [1, 2, 4, 5],
      "5x per week": [1, 2, 3, 4, 5],
      "6x per week": [1, 2, 3, 4, 5, 6],
    };
  
    const allowedWeekdays = allowedWeekdaysMap[repeat] || [1];
  
    const matchingDates = allDates
      .filter((date) => allowedWeekdays.includes(date.getDay()))
      .map((date) => formatDateKey(date));
  
    return matchingDates.length > 0
      ? matchingDates
      : allDates.map((date) => formatDateKey(date));
  }


export default function ExerciseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get("patientId");

  const [exercise, setExercise] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-03-01");
  const [repeat, setRepeat] = useState("Nooit");
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    loadExercise();
  }, [id]);

  async function loadExercise() {
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

      setUserId(user.id);

      const [exerciseRes, favoriteRes] = await Promise.all([
        supabase.from("exercises").select("*").eq("id", id).single(),
        supabase
          .from("favorite_exercises")
          .select("id")
          .eq("user_id", user.id)
          .eq("exercise_id", id)
          .maybeSingle(),
      ]);

      if (exerciseRes.error) throw exerciseRes.error;
      if (favoriteRes.error) throw favoriteRes.error;

      const loadedExercise = exerciseRes.data;

      setExercise(loadedExercise);
      setIsFavorite(!!favoriteRes.data);

      setStartDate(formatDateForInput(loadedExercise.start_date) || "2026-03-01");
      setEndDate(formatDateForInput(loadedExercise.end_date) || "2026-03-01");
      setRepeat(loadedExercise.repeat_type || "Nooit");
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefening kon niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  async function toggleFavorite() {
    if (!userId || !exercise) return;

    try {
      setErrorMessage("");

      if (isFavorite) {
        const { error } = await supabase
          .from("favorite_exercises")
          .delete()
          .eq("user_id", userId)
          .eq("exercise_id", exercise.id);

        if (error) throw error;
        setIsFavorite(false);
      } else {
        const { error } = await supabase.from("favorite_exercises").insert({
          user_id: userId,
          exercise_id: exercise.id,
        });

        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Favoriet aanpassen is mislukt.");
    }
  }

  function getCategoryClass(categoryName) {
    if (categoryName === "Mobiliteit") return "exerciseTag--yellow";
    if (categoryName === "Flexibiliteit") return "exerciseTag--pink";
    if (categoryName === "Balans") return "exerciseTag--blue";
    if (categoryName === "Kracht") return "exerciseTag--green";
    return "exerciseTag--yellow";
  }

  function openEditModal() {
    if (!exercise) return;

    setStartDate(formatDateForInput(exercise.start_date) || startDate || "2026-03-01");
    setEndDate(formatDateForInput(exercise.end_date) || endDate || "2026-03-01");
    setRepeat(exercise.repeat_type || repeat || "Nooit");
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
  }

  async function handleSaveSchedule() {
    try {
      setErrorMessage("");
  
      if (!patientId) {
        setErrorMessage("Geen patiënt geselecteerd. Open deze oefening vanuit een patiënt.");
        return;
      }
  
      if (!startDate || !endDate) {
        setErrorMessage("Vul een start- en einddatum in.");
        return;
      }
  
      if (new Date(endDate) < new Date(startDate)) {
        setErrorMessage("De einddatum mag niet voor de startdatum liggen.");
        return;
      }
  
      setSavingSchedule(true);
  
      const scheduledDates = generateScheduledDates(startDate, endDate, repeat);
  
      if (scheduledDates.length === 0) {
        setErrorMessage("Er konden geen oefendagen gegenereerd worden.");
        return;
      }
  
      // 1. Verwijder eerst het volledige bestaande programma
      // voor deze patiënt + deze oefening
      const { error: deleteError } = await supabase
        .from("patient_exercises")
        .delete()
        .eq("patient_id", patientId)
        .eq("exercise_id", exercise.id);
  
      if (deleteError) throw deleteError;
  
      // 2. Voeg daarna enkel het nieuwe schema toe
      const rows = scheduledDates.map((date) => ({
        patient_id: patientId,
        exercise_id: exercise.id,
        scheduled_date: date,
        is_completed: false,
      }));
  
      const { error: insertError } = await supabase
        .from("patient_exercises")
        .insert(rows);
  
      if (insertError) throw insertError;
  
      setShowEditModal(false);
  
      navigate(`/patient/${patientId}`, {
        state: {
          activeTab: "programma",
          selectedDate: startDate,
        },
      });
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefening plannen is mislukt.");
    } finally {
      setSavingSchedule(false);
    }
  }

  if (loading) {
    return (
      <div className="kineDashLoading">
        <p>Oefening laden...</p>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="kineDashLoading">
        <p>{errorMessage || "Oefening niet gevonden."}</p>
      </div>
    );
  }

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="exerciseDetailMain">
        <div className="exerciseDetailTopbar">
          <button
            type="button"
            className="patientBack"
            onClick={() => navigate("/kinesist/oefeningen")}
          >
            <img src="/images/back-icon.svg" alt="" />
            <span>Terug</span>
          </button>

          <div className="exerciseDetailActions">
            <button
              type="button"
              className="exerciseIconBtn"
              onClick={toggleFavorite}
            >
              <img
                src={
                  isFavorite
                    ? "/images/favorite-filled.svg"
                    : "/images/favorite.svg"
                }
                alt="Favoriet"
              />
            </button>

            <button
              type="button"
              className="btn-outline-small btn-outline"
              onClick={openEditModal}
            >
              Wijzig
            </button>
          </div>
        </div>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        <div className="exerciseVideoHero">
          <img src={exercise.image_url} alt={exercise.title} />
          <div className="exercisePlayButton">▶</div>
        </div>

        <div className="exerciseDetailHeader">
          <h1>{exercise.title}</h1>
          <span className={`exerciseTag ${getCategoryClass(exercise.category)}`}>
            {exercise.category}
          </span>
        </div>

        <section className="exerciseDetailSection">
          <h2>Beschrijving</h2>
          <p>Hoe doe je deze oefening?</p>
          <p>
            {exercise.description ||
              "Streef naar een rustige uitvoering met correcte houding. Volg de instructies stap voor stap."}
          </p>
        </section>

        <section className="exerciseDetailSection">
          <h2>Tags</h2>

          <div className="exerciseTagInfoGrid">
            <strong>Categorie:</strong>
            <span>{exercise.category || "-"}</span>

            <strong>Geschikte leeftijden:</strong>
            <span>{exercise.age_range || "6–12 jaar"}</span>

            <strong>Benodigdheden:</strong>
            <span>{exercise.materials || "Geen"}</span>

            <strong>Ruimte:</strong>
            <span>{exercise.space_needed || "Staand, 1m²"}</span>
          </div>
        </section>

        <div className="exerciseQuickFacts">
          <div className="exerciseQuickFact">
            <span className="quickIcon">
              <img
                src={
                  exercise.difficulty === "Makkelijk"
                    ? "/images/difficulty-easy.svg"
                    : exercise.difficulty === "Gemiddeld"
                    ? "/images/difficulty-medium.svg"
                    : exercise.difficulty === "Moeilijk"
                    ? "/images/difficulty-hard.svg"
                    : "/images/difficulty-easy.svg"
                }
                alt={exercise.difficulty || "Makkelijk"}
              />
            </span>
            <strong>{exercise.difficulty || "Makkelijk"}</strong>
          </div>

          <div className="exerciseQuickFact">
            <span className="quickIcon">
              <img src="/images/Clock.svg" alt="" />
            </span>
            <strong>{exercise.duration_minutes || 2} min</strong>
          </div>

          <div className="exerciseQuickFact">
            <span className="quickIcon">
              <img src="/images/Repeat.svg" alt="" />
            </span>
            <strong>{exercise.repetitions || 10} herhalen</strong>
          </div>
        </div>

        {showEditModal && (
          <div className="modalOverlay" onClick={closeEditModal}>
            <div className="editModal" onClick={(e) => e.stopPropagation()}>
              <div className="editModalHeader">
                <h2>{exercise.title}</h2>
                <button
                  type="button"
                  className="modalCloseBtn"
                  onClick={closeEditModal}
                >
                  ✕
                </button>
              </div>

              <div className="editModalBody">
                <div className="formRow">
                  <div className="formGroup">
                    <label htmlFor="startDate">Start</label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="formGroup">
                    <label htmlFor="endDate">Einde</label>
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="formGroup ">
                  <label htmlFor="repeat">Herhaal</label>
                  <select
                    id="repeat"
                    className="form-repeat"
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value)}
                  >
                    <option value="Nooit">Nooit</option>
                    <option value="Wekelijks">Wekelijks</option>
                    <option value="2x per week">2x per week</option>
                    <option value="3x per week">3x per week</option>
                    <option value="4x per week">4x per week</option>
                    <option value="5x per week">5x per week</option>
                    <option value="6x per week">6x per week</option>
                  </select>
                </div>
              </div>

              <div className="editModalActions">
                <button
                  type="button"
                  className="btn-cancel btn-outline"
                  onClick={closeEditModal}
                >
                  Annuleer
                </button>

                <button
                  type="button"
                  className="btn-save btn"
                  onClick={handleSaveSchedule}
                  disabled={savingSchedule}
                >
                  {savingSchedule ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}