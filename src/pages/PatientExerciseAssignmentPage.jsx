import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import ExerciseMediaThumb from "../components/ExerciseMediaThumb";
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

function getMediaMeta(scheme) {
  if (!scheme?.description) {
    return { repeat_type: "Nooit", apply_to_all: true, exercises: [] };
  }

  try {
    const parsed = JSON.parse(scheme.description);
    return {
      repeat_type: parsed.repeat_type || "Nooit",
      apply_to_all: parsed.apply_to_all ?? true,
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises : [],
    };
  } catch {
    return { repeat_type: "Nooit", apply_to_all: true, exercises: [] };
  }
}

function getSchemeThumbSrc(scheme) {
  const meta = getMediaMeta(scheme);
  const firstExercise = meta.exercises[0];

  return (
    firstExercise?.image_url ||
    firstExercise?.thumbnail_url ||
    firstExercise?.media_url ||
    scheme?.image_url ||
    ""
  );
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
  const location = useLocation();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [savingExercise, setSavingExercise] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [patient, setPatient] = useState(null);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [myExercises, setMyExercises] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [assignmentTab, setAssignmentTab] = useState("bibliotheek");
  const [exerciseCategory, setExerciseCategory] = useState("Alles");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedSchemeExercises, setSelectedSchemeExercises] = useState([]);
  const [selectedSchemeLoading, setSelectedSchemeLoading] = useState(false);
  const [addExerciseStep, setAddExerciseStep] = useState(1);
  const [assignmentStartDate, setAssignmentStartDate] = useState("");
  const [assignmentEndDate, setAssignmentEndDate] = useState("");
  const [assignmentRepeat, setAssignmentRepeat] = useState("Elke dag");
  const [applyToAllExercises, setApplyToAllExercises] = useState(true);

  useEffect(() => {
    loadPage();
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");

    if (location.pathname.includes("oefenschema-toevoegen")) {
      setAssignmentTab("schema’s");
      return;
    }

    if (tab === "schema’s" || tab === "schema's" || tab === "oefenschemas") {
      setAssignmentTab("schema’s");
      return;
    }

    if (tab === "jouw-oefeningen") {
      setAssignmentTab("jouw-oefeningen");
      return;
    }

    setAssignmentTab("bibliotheek");
  }, [location.pathname, location.search]);

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

      const [patientRes, libraryRes, myRes, schemesRes] = await Promise.all([
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

        supabase
          .from("exercise_schemes")
          .select("id, title, description, image_url, created_at")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (patientRes.error) throw patientRes.error;
      if (libraryRes.error) throw libraryRes.error;
      if (myRes.error) throw myRes.error;
      if (schemesRes.error) throw schemesRes.error;

      setPatient(patientRes.data || null);
      setExerciseLibrary(libraryRes.data || []);
      setMyExercises(myRes.data || []);
      setSchemes(schemesRes.data || []);

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

  async function fetchSchemeExercises(schemeId) {
    const { data, error } = await supabase
      .from("exercise_schemes")
      .select(`
        id,
        description,
        exercise_scheme_items (
          id,
          sort_order,
          exercise:exercises (
            id,
            title,
            category,
            difficulty,
            duration_minutes,
            repetitions,
            image_url
          )
        )
      `)
      .eq("id", schemeId)
      .single();

    if (error) throw error;

    const meta = getMediaMeta(data);
    const parsedExercises = Array.isArray(meta.exercises) ? meta.exercises : [];
    const parsedIds = parsedExercises.map((exercise) => exercise?.id).filter(Boolean);

    if (parsedIds.length > 0) {
      const { data: existingExercises, error: existingError } = await supabase
        .from("exercises")
        .select("id, title, category, difficulty, duration_minutes, repetitions, image_url")
        .in("id", parsedIds);

      if (existingError) throw existingError;

      const byId = new Map((existingExercises || []).map((exercise) => [exercise.id, exercise]));
      return parsedIds.map((exerciseId) => byId.get(exerciseId)).filter(Boolean);
    }

    const linkedExercises = (data?.exercise_scheme_items || [])
      .map((item) => item.exercise)
      .filter((exercise) => exercise && exercise.id);

    const linkedIds = linkedExercises.map((exercise) => exercise.id);
    if (linkedIds.length === 0) return [];

    const { data: existingLinkedExercises, error: linkedError } = await supabase
      .from("exercises")
      .select("id, title, category, difficulty, duration_minutes, repetitions, image_url")
      .in("id", linkedIds);

    if (linkedError) throw linkedError;

    const linkedById = new Map((existingLinkedExercises || []).map((exercise) => [exercise.id, exercise]));
    return linkedIds.map((exerciseId) => linkedById.get(exerciseId)).filter(Boolean);
  }

  function selectScheme(scheme) {
    if (selectedSchemeId === scheme.id) {
      setSelectedSchemeId("");
      setSelectedScheme(null);
      setSelectedSchemeExercises([]);
      setSelectedSchemeLoading(false);
      return;
    }

    setSelectedSchemeId(scheme.id);
    setSelectedScheme(scheme);
    setSelectedSchemeExercises([]);
    setSelectedSchemeLoading(true);
    setErrorMessage("");

    fetchSchemeExercises(scheme.id)
      .then((resolvedExercises) => {
        setSelectedSchemeExercises(resolvedExercises);
        setSelectedSchemeLoading(false);
        if (!resolvedExercises.length) {
          setErrorMessage("Dit schema bevat nog geen oefeningen.");
        }
      })
      .catch((error) => {
        console.error("Failed to load scheme exercises:", error);
        setSelectedSchemeExercises([]);
        setSelectedSchemeLoading(false);
        setErrorMessage("Oefenschema kon niet geladen worden.");
      });
  }

  function handleNext() {
    if (assignmentTab === "schema’s") {
      if (!selectedScheme) {
        setErrorMessage("Selecteer een oefenschema.");
        return;
      }

      if (selectedSchemeLoading) {
        setErrorMessage("Oefenschema wordt geladen...");
        return;
      }

      if (!selectedSchemeExercises.length) {
        setErrorMessage("Dit schema bevat nog geen oefeningen.");
        return;
      }

      setErrorMessage("");
      setAddExerciseStep(2);
      return;
    }

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

      // Deduplicate rows client-side to avoid DB constraint conflicts (409)
      const seen = new Set();
      const dedupedRows = rows.filter((r) => {
        const key = `${r.patient_id}|${r.exercise_id}|${r.scheduled_date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Validate foreign keys exist client-side: ensure exercise_id is present
      const invalidRows = dedupedRows.filter((r) => !r.exercise_id);
      if (invalidRows.length > 0) {
        console.warn("Some rows are missing exercise_id and will be skipped:", invalidRows);
        setErrorMessage("Sommige oefeningen uit het schema bestaan niet (werden overgeslagen).");
      }

      const validRows = dedupedRows.filter((r) => r.exercise_id);
      if (validRows.length === 0) {
        setErrorMessage("Geen geldige oefeningen om toe te voegen.");
        return;
      }

      const { error } = await supabase
        .from("patient_exercises")
        .upsert(validRows, {
          onConflict: "patient_id,exercise_id,scheduled_date",
          ignoreDuplicates: true,
        });
      if (error) throw error;

      navigate(`/patient/${id}`);
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefening toevoegen is mislukt.");
    } finally {
      setSavingExercise(false);
    }
  }

  async function handleAssignScheme(e) {
    e.preventDefault();

    if (!selectedScheme) {
      setErrorMessage("Selecteer eerst een oefenschema.");
      return;
    }

    if (!patient) {
      setErrorMessage("Patiënt niet gevonden.");
      return;
    }

    if (!assignmentStartDate || !assignmentEndDate) {
      setErrorMessage("Vul een start- en einddatum in.");
      return;
    }

    if (new Date(assignmentEndDate) < new Date(assignmentStartDate)) {
      setErrorMessage("De einddatum mag niet voor de startdatum liggen.");
      return;
    }

    let schemeExercises = selectedSchemeExercises;

    if (!schemeExercises.length) {
      try {
        schemeExercises = await fetchSchemeExercises(selectedScheme.id);
        setSelectedSchemeExercises(schemeExercises);
      } catch (error) {
        console.error("Failed to refresh scheme exercises before insert:", error);
        setErrorMessage("Oefenschema kon niet geladen worden.");
        return;
      }
    }

    if (!schemeExercises.length) {
      setErrorMessage("Dit schema bevat nog geen oefeningen.");
      return;
    }

    const meta = getMediaMeta(selectedScheme);
    const scheduledDates = generateScheduledDates(
      assignmentStartDate,
      assignmentEndDate,
      meta.repeat_type
    );

    if (scheduledDates.length === 0) {
      setErrorMessage("Er konden geen oefendagen gegenereerd worden.");
      return;
    }

    try {
      setSavingExercise(true);
      setErrorMessage("");

      const exerciseIds = schemeExercises.map((exercise) => exercise.id);

      const { error: deleteError } = await supabase
        .from("patient_exercises")
        .delete()
        .eq("patient_id", id)
        .in("exercise_id", exerciseIds);

      if (deleteError) throw deleteError;

      const rows = schemeExercises.flatMap((exercise) =>
        scheduledDates.map((date) => ({
          patient_id: id,
          exercise_id: exercise.id,
          scheduled_date: date,
          is_completed: false,
        }))
      );

      // Deduplicate rows to avoid DB conflicts
      const seen2 = new Set();
      const dedupedRows2 = rows.filter((r) => {
        const key = `${r.patient_id}|${r.exercise_id}|${r.scheduled_date}`;
        if (seen2.has(key)) return false;
        seen2.add(key);
        return true;
      });

      const invalidRows2 = dedupedRows2.filter((r) => !r.exercise_id);
      if (invalidRows2.length > 0) {
        console.warn("Some scheme rows are missing exercise_id and will be skipped:", invalidRows2);
        setErrorMessage("Sommige oefeningen uit het schema bestaan niet (werden overgeslagen).");
      }

      const validRows2 = dedupedRows2.filter((r) => r.exercise_id);
      if (validRows2.length === 0) {
        setErrorMessage("Geen geldige oefeningen in het schema om toe te wijzen.");
        return;
      }

      const { error: insertError } = await supabase
        .from("patient_exercises")
        .insert(validRows2);

      if (insertError) throw insertError;

      navigate(`/patient/${id}`, {
        state: {
          activeTab: "programma",
          selectedDate: assignmentStartDate,
        },
      });
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefenschema toewijzen is mislukt.");
    } finally {
      setSavingExercise(false);
    }
  }

  const activeExerciseDataset = useMemo(() => {
    if (assignmentTab === "bibliotheek") return exerciseLibrary;
    if (assignmentTab === "jouw-oefeningen") return myExercises;
    return [];
  }, [assignmentTab, exerciseLibrary, myExercises]);

  const filteredSchemes = useMemo(() => {
    const normalizedSearch = exerciseSearch.trim().toLowerCase();

    return schemes.filter((scheme) => {
      const title = (scheme.title || "").toLowerCase();
      const description = (scheme.description || "").toLowerCase();
      return (
        normalizedSearch === "" ||
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch)
      );
    });
  }, [schemes, exerciseSearch]);

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

  const schemeMeta = useMemo(() => getMediaMeta(selectedScheme), [selectedScheme]);
  const schemeExercises = schemeMeta.exercises || [];
  const selectedSchemeThumbSrc = useMemo(
    () => getSchemeThumbSrc(selectedScheme),
    [selectedScheme]
  );
  const scheduledDates = useMemo(
    () => generateScheduledDates(assignmentStartDate, assignmentEndDate, schemeMeta.repeat_type),
    [assignmentStartDate, assignmentEndDate, schemeMeta.repeat_type]
  );

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

        <h1 className="schemeBuilderHeading">
          {assignmentTab === "schema’s" ? "Oefenschema toewijzen" : "Oefening toewijzen"}
        </h1>

        <p className="exerciseSchemesIntro">
          {assignmentTab === "schema’s"
            ? "Kies een bestaand oefenschema en plan het in voor deze patiënt."
            : "Kies oefeningen uit de bibliotheek of uit je eigen oefeningen om toe te voegen aan deze patiënt."}
        </p>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        {addExerciseStep === 1 && (
          <section className="schemeLibrarySection">
            <div className="exerciseSearchBar">
              <img src="/images/search-icon.svg" alt="" />
              <input
                type="text"
                placeholder={assignmentTab === "schema’s" ? "Zoek oefenschema’s..." : "Zoek oefeningen..."}
                className="searchbar"
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
              />
            </div>

            <div className="exerciseTabsRow">
              <div className="exerciseTabs">
                <button
                  type="button"
                  className={assignmentTab === "bibliotheek" ? "is-active" : ""}
                  onClick={() => setAssignmentTab("bibliotheek")}
                >
                  Bibliotheek
                </button>

                <button
                  type="button"
                  className={assignmentTab === "jouw-oefeningen" ? "is-active" : ""}
                  onClick={() => setAssignmentTab("jouw-oefeningen")}
                >
                  Jouw oefeningen
                </button>

                <button
                  type="button"
                  className={assignmentTab === "schema’s" ? "is-active" : ""}
                  onClick={() => setAssignmentTab("schema’s")}
                >
                  Oefenschema’s
                </button>
              </div>
            </div>

            {assignmentTab === "schema’s" ? (
              <div className="exerciseSchemesGrid">
                {filteredSchemes.length === 0 ? (
                  <div className="kinePatientsEmpty">
                    <img src="/images/monkey-search.png" alt="Geen schema’s gevonden" />
                    <strong>Nog geen oefenschema’s</strong>
                    <p>Maak eerst een schema aan in de bibliotheek.</p>
                  </div>
                ) : (
                  filteredSchemes.map((scheme) => {
                    const meta = getMediaMeta(scheme);
                    const isSelected = selectedSchemeId === scheme.id;

                    return (
                      <button
                        key={scheme.id}
                        type="button"
                        className={`exerciseSchemeCard schemeSelectableCard ${isSelected ? "is-selected" : ""}`}
                        onClick={() => selectScheme(scheme)}
                      >
                        <div className="exerciseSchemeStack stack-1"></div>
                        <div className="exerciseSchemeStack stack-2"></div>

                        <div className="exerciseSchemeInner">
                          <strong>{scheme.title}</strong>
                          <ExerciseMediaThumb
                            src={getSchemeThumbSrc(scheme)}
                            alt={scheme.title}
                            className="exerciseSchemeThumb"
                          />
                          <p>{meta.exercises.length} oefeningen · {meta.repeat_type}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <>
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
                          <ExerciseMediaThumb
                            className="exerciseLibraryThumb exerciseLibraryVideoThumb"
                            src={exercise.image_url}
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

                          <div className="schemeDotsBtn" tabIndex={-1} role="button">
                            <img src="/images/dots.svg" alt="" />
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="schemeNextRow">
                <button
                type="button"
                className="schemePrimaryBtn"
                onClick={handleNext}
                disabled={assignmentTab === "schema’s" ? !selectedScheme || selectedSchemeLoading : selectedExercises.length === 0}
              >
                {selectedSchemeLoading && assignmentTab === "schema’s" ? "Laden..." : "Volgende"}
              </button>
            </div>
          </section>
        )}

        {addExerciseStep === 2 && assignmentTab === "schema’s" && (
          <section className="schemeBuilderLayout patientExerciseWizardLayout">
            <div className="schemeBuilderLeft">
              <div className="schemeFormGroup">
                <label>Patiënt</label>
                <input type="text" value={patient?.name || "-"} disabled readOnly />
              </div>

              <div className="schemeFormGroup">
                <label htmlFor="schemeStartDate">Start</label>
                <input
                  id="schemeStartDate"
                  type="date"
                  value={assignmentStartDate}
                  onChange={(e) => setAssignmentStartDate(e.target.value)}
                />
              </div>

              <div className="schemeFormGroup">
                <label htmlFor="schemeEndDate">Einde</label>
                <input
                  id="schemeEndDate"
                  type="date"
                  value={assignmentEndDate}
                  onChange={(e) => setAssignmentEndDate(e.target.value)}
                />
              </div>

              <div className="schemeFormGroup">
                <label>Herhaal</label>
                <input type="text" value={schemeMeta.repeat_type || "Nooit"} disabled readOnly />
              </div>

              <div className="schemeActionRow">
                <button type="button" className="schemeCancelBtn" onClick={handleBack}>
                  annuleer
                </button>

                <button
                  type="button"
                  className="schemePrimaryBtn"
                  onClick={handleAssignScheme}
                  disabled={savingExercise}
                >
                  {savingExercise ? "Toewijzen..." : "Toewijzen"}
                </button>
              </div>
            </div>

            <div className="schemeBuilderRight">
              <h3 className="schemeAssignedTitle">Schema-overzicht</h3>

              <div className="schemePreviewCard exerciseSchemeCard schemeSelectableCard is-selected">
                <div className="exerciseSchemeStack stack-1" />
                <div className="exerciseSchemeStack stack-2" />

                <div className="exerciseSchemeInner">
                  <strong>{selectedScheme?.title || "-"}</strong>
                  <ExerciseMediaThumb
                    src={selectedSchemeThumbSrc}
                    alt={selectedScheme?.title || "Schema"}
                    className="exerciseSchemeThumb"
                  />
                  <p>{schemeExercises.length} oefeningen · {schemeMeta.repeat_type || "Nooit"}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {addExerciseStep === 2 && assignmentTab !== "schema’s" && (
          <section className="schemeBuilderLayout patientExerciseWizardLayout">
            <div className="schemeBuilderLeft">
              <div className="schemeFormGroup">
                <label>Patiënt</label>
                <input type="text" value={patient?.name || "-"} disabled readOnly />
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
                <button type="button" className="schemeCancelBtn" onClick={handleBack}>
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
                      <ExerciseMediaThumb
                        className="exerciseLibraryThumb exerciseLibraryVideoThumb"
                        src={exercise.image_url}
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

                      <div className="schemeDotsBtn" tabIndex={-1} role="button">
                        <img src="/images/dots.svg" alt="" />
                      </div>
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
