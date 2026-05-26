import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/exercises.css";
import "../assets/css/patient-details.css";
import "../assets/css/kine-dashboard.css";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCategoryClass(categoryName) {
  if (categoryName === "Mobiliteit") return "exerciseTag--yellow";
  if (categoryName === "Flexibiliteit") return "exerciseTag--pink";
  if (categoryName === "Balans") return "exerciseTag--blue";
  if (categoryName === "Kracht") return "exerciseTag--green";
  return "exerciseTag--yellow";
}

function getDifficultyIcon(difficulty) {
  if (difficulty === "Makkelijk") return "/images/difficulty-easy.svg";
  if (difficulty === "Gemiddeld") return "/images/difficulty-medium.svg";
  if (difficulty === "Moeilijk") return "/images/difficulty-hard.svg";
  return "/images/difficulty-easy.svg";
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

  if (repeat === "Nooit") {
    return allDates.map((date) => formatDateKey(date));
  }

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

export default function PatientExerciseAssignmentPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [savingExercise, setSavingExercise] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [patient, setPatient] = useState(null);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [myExercises, setMyExercises] = useState([]);
  const [exerciseTab, setExerciseTab] = useState("bibliotheek");
  const [exerciseCategory, setExerciseCategory] = useState("Alles");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [addExerciseStep, setAddExerciseStep] = useState(1);
  const [assignmentStartDate, setAssignmentStartDate] = useState("");
  const [assignmentEndDate, setAssignmentEndDate] = useState("");
  const [assignmentRepeat, setAssignmentRepeat] = useState("Elke dag");
  const [applyToAllExercises, setApplyToAllExercises] = useState(true);

  useEffect(() => {
    loadPage();
  }, [id]);

  async function loadPage() {
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
        .select("id, role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData || profileData.role !== "kinesist") {
        navigate("/");
        return;
      }

      const [patientRes, libraryRes, myRes] = await Promise.all([
        supabase
          .from("patients")
          .select("id, name")
          .eq("id", id)
          .eq("kinesist_id", user.id)
          .single(),
        supabase
          .from("exercises")
          .select("*")
          .eq("is_public", true)
          .order("title", { ascending: true }),
        supabase
          .from("exercises")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (patientRes.error) throw patientRes.error;
      if (libraryRes.error) throw libraryRes.error;
      if (myRes.error) throw myRes.error;

      setPatient(patientRes.data || null);
      setExerciseLibrary(libraryRes.data || []);
      setMyExercises(myRes.data || []);

      const startDate = formatDateKey(new Date());
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
      setAssignmentStartDate(startDate);
      setAssignmentEndDate(formatDateKey(endDate));
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt kon niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function handleBack() {
    if (addExerciseStep === 2) {
      setAddExerciseStep(1);
      return;
    }

    navigate(`/patient/${id}`);
  }

  function toggleExerciseSelection(exercise) {
    setSelectedExercises((prev) => {
      const exists = prev.some((item) => item.id === exercise.id);

      if (exists) {
        return prev.filter((item) => item.id !== exercise.id);
      }

      return [...prev, exercise];
    });
  }

  function handleNext() {
    if (selectedExercises.length === 0) {
      setErrorMessage("Selecteer minstens één oefening.");
      return;
    }

    setErrorMessage("");
    setAddExerciseStep(2);
  }

  async function handleSaveAssignment(e) {
    e.preventDefault();

    if (selectedExercises.length === 0) {
      setErrorMessage("Selecteer minstens één oefening.");
      return;
    }

    if (!assignmentStartDate || !assignmentEndDate) {
      setErrorMessage("Vul een start- en einddatum in.");
      return;
    }

    const scheduledDates = generateScheduledDates(
      assignmentStartDate,
      assignmentEndDate,
      assignmentRepeat
    );

    if (scheduledDates.length === 0) {
      setErrorMessage("Er konden geen oefendagen gegenereerd worden.");
      return;
    }

    try {
      setSavingExercise(true);
      setErrorMessage("");

      const exercisesToAssign = applyToAllExercises
        ? selectedExercises
        : selectedExercises.slice(0, 1);

      const rows = exercisesToAssign.flatMap((exercise) =>
        scheduledDates.map((date) => ({
          patient_id: id,
          exercise_id: exercise.id,
          scheduled_date: date,
          is_completed: false,
        }))
      );

      const { error } = await supabase.from("patient_exercises").insert(rows);
      if (error) throw error;

      navigate(`/patient/${id}`);
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefening toevoegen is mislukt.");
    } finally {
      setSavingExercise(false);
    }
  }

  const activeExerciseDataset = useMemo(() => {
    return exerciseTab === "bibliotheek" ? exerciseLibrary : myExercises;
  }, [exerciseTab, exerciseLibrary, myExercises]);

  const filteredExercises = useMemo(() => {
    const normalizedSearch = exerciseSearch.trim().toLowerCase();

    return activeExerciseDataset.filter((exercise) => {
      const title = (exercise.title || "").toLowerCase();
      const description = (exercise.description || "").toLowerCase();
      const matchesSearch =
        normalizedSearch === "" ||
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch);
      const matchesCategory =
        exerciseCategory === "Alles" || exercise.category === exerciseCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activeExerciseDataset, exerciseSearch, exerciseCategory]);

  if (loading) {
    return (
      <div className="kineDash">
        <KineSidebar onLogout={handleLogout} />
        <main className="kineDashMain">
          <div className="kineDashLoading">
            <img src="/images/monkey-load.png" style={{ width: "100px" }} alt="" />
            <p>laden . . .</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="exercisesMain patientExerciseAssignMain">
        <div className="schemeTopbar">
          <button type="button" className="patientBack" onClick={handleBack}>
            <img src="/images/back-icon.svg" alt="" />
            <span>Terug</span>
          </button>

          <div className="schemeStepBlock">
            <span className="schemeStepLabel">Stap {addExerciseStep} van 2</span>
            <div className="schemeProgressBar">
              <div className={`schemeProgressSegment ${addExerciseStep >= 1 ? "is-active" : ""}`} />
              <div className={`schemeProgressSegment ${addExerciseStep >= 2 ? "is-active" : ""}`} />
            </div>
          </div>
        </div>

        <h1 className="schemeBuilderHeading">Oefening toewijzen</h1>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        {addExerciseStep === 1 && (
          <section className="schemeLibrarySection">
            <div className="exerciseSearchBar">
              <img src="/images/search-icon.svg" alt="" />
              <input
                type="text"
                placeholder="Zoek oefeningen..."
                className="searchbar"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
              />
            </div>

            <div className="exerciseCategoryFilters">
              {["Alles", "Balans", "Mobiliteit", "Kracht"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`exerciseCategoryBtn ${exerciseCategory === item ? "is-active" : ""}`}
                  onClick={() => setExerciseCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="exerciseTabsRow">
              <div className="exerciseTabs">
                <button
                  type="button"
                  className={exerciseTab === "bibliotheek" ? "is-active" : ""}
                  onClick={() => setExerciseTab("bibliotheek")}
                >
                  Bibliotheek
                </button>

                <button
                  type="button"
                  className={exerciseTab === "jouw-oefeningen" ? "is-active" : ""}
                  onClick={() => setExerciseTab("jouw-oefeningen")}
                >
                  Jouw oefeningen
                </button>
              </div>
            </div>

            <div className="exerciseLibraryGrid">
              {filteredExercises.map((exercise) => {
                const isSelected = selectedExercises.some((item) => item.id === exercise.id);

                return (
                  <div key={exercise.id} className="schemeLibraryCardWrap">
                    <button
                      type="button"
                      className={`exerciseLibraryCard schemeSelectableCard ${isSelected ? "is-selected" : ""}`}
                      onClick={() => toggleExerciseSelection(exercise)}
                    >
                      <img
                        className="exerciseLibraryThumb"
                        src={exercise.image_url || "/images/exercise-1.png"}
                        alt={exercise.title}
                      />

                      <div className="exerciseLibraryInfo">
                        <strong>{exercise.title}</strong>

                        <div className="exerciseCardMetaRow">
                          <span className={`exerciseTag ${getCategoryClass(exercise.category)}`}>
                            {exercise.category}
                          </span>

                          <img
                            src={getDifficultyIcon(exercise.difficulty)}
                            alt={exercise.difficulty || "Makkelijk"}
                            className="exerciseDifficultyIcon"
                          />
                        </div>

                        <p>
                          {exercise.duration_minutes || 0} min · {exercise.repetitions || 0} herhalingen
                        </p>
                      </div>

                      <button type="button" className="schemeDotsBtn" tabIndex={-1}>
                        <img src="/images/dots.svg" alt="" />
                      </button>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="schemeNextRow">
              <button
                type="button"
                className="schemePrimaryBtn"
                onClick={handleNext}
                disabled={selectedExercises.length === 0}
              >
                Volgende
              </button>
            </div>
          </section>
        )}

        {addExerciseStep === 2 && (
          <section className="schemeBuilderLayout patientExerciseWizardLayout">
            <div className="schemeBuilderLeft">
              <div className="schemeFormGroup">
                <label>Patiënt</label>
                <input type="text" value={patient?.name || "-"} disabled />
              </div>

              <div className="schemeFormGroup">
                <label htmlFor="assignmentStartDate">Start</label>
                <input
                  id="assignmentStartDate"
                  type="date"
                  value={assignmentStartDate}
                  onChange={(e) => setAssignmentStartDate(e.target.value)}
                />
              </div>

              <div className="schemeFormGroup">
                <label htmlFor="assignmentEndDate">Einde</label>
                <input
                  id="assignmentEndDate"
                  type="date"
                  value={assignmentEndDate}
                  onChange={(e) => setAssignmentEndDate(e.target.value)}
                />
              </div>

              <div className="schemeFormGroup">
                <label htmlFor="assignmentRepeat">Herhaal</label>
                <select
                  id="assignmentRepeat"
                  value={assignmentRepeat}
                  onChange={(e) => setAssignmentRepeat(e.target.value)}
                >
                  <option value="Elke dag">Elke dag</option>
                  <option value="Wekelijks">Wekelijks</option>
                  <option value="2x per week">2x per week</option>
                  <option value="3x per week">3x per week</option>
                  <option value="4x per week">4x per week</option>
                  <option value="5x per week">5x per week</option>
                  <option value="6x per week">6x per week</option>
                </select>
              </div>

              <label className="schemeCheckboxRow">
                <input
                  type="checkbox"
                  checked={applyToAllExercises}
                  onChange={(e) => setApplyToAllExercises(e.target.checked)}
                />
                <span>Voor alle oefeningen</span>
              </label>

              <div className="schemeActionRow">
                <button
                  type="button"
                  className="schemeCancelBtn"
                  onClick={handleBack}
                >
                  annuleer
                </button>

                <button
                  type="button"
                  className="schemePrimaryBtn"
                  onClick={handleSaveAssignment}
                  disabled={savingExercise}
                >
                  {savingExercise ? "Toewijzen..." : "Toewijzen"}
                </button>
              </div>
            </div>

            <div className="schemeBuilderRight">
              <h3 className="schemeAssignedTitle">
                Toegewezen ({selectedExercises.length} oefeningen):
              </h3>

              <div className="schemeAssignedList">
                {selectedExercises.map((exercise) => (
                  <div key={exercise.id} className="schemeAssignedCard">
                    <div className="exerciseLibraryCard">
                      <img
                        className="exerciseLibraryThumb"
                        src={exercise.image_url || "/images/exercise-1.png"}
                        alt={exercise.title}
                      />

                      <div className="exerciseLibraryInfo">
                        <strong>{exercise.title}</strong>

                        <div className="exerciseCardMetaRow">
                          <span className={`exerciseTag ${getCategoryClass(exercise.category)}`}>
                            {exercise.category}
                          </span>

                          <img
                            src={getDifficultyIcon(exercise.difficulty)}
                            alt={exercise.difficulty || "Makkelijk"}
                            className="exerciseDifficultyIcon"
                          />
                        </div>

                        <p>
                          {exercise.duration_minutes || 0} min · {exercise.repetitions || 0} herhalingen
                        </p>
                      </div>

                      <button type="button" className="schemeDotsBtn" tabIndex={-1}>
                        <img src="/images/dots.svg" alt="" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
