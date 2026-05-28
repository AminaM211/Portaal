import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export default function PatientSchemeAssignmentPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [patient, setPatient] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [step, setStep] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

      const [patientRes, schemesRes] = await Promise.all([
        supabase
          .from("patients")
          .select("id, name")
          .eq("id", id)
          .eq("kinesist_id", user.id)
          .single(),
        supabase
          .from("exercise_schemes")
          .select("id, title, description, image_url, created_at")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (patientRes.error) throw patientRes.error;
      if (schemesRes.error) throw schemesRes.error;

      setPatient(patientRes.data || null);
      setSchemes(schemesRes.data || []);

      const today = formatDateKey(new Date());
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      setStartDate(today);
      setEndDate(formatDateKey(nextMonth));
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt of schema’s konden niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function handleBack() {
    if (step === 2) {
      setStep(1);
      return;
    }

    navigate(`/patient/${id}`);
  }

  function selectScheme(scheme) {
    setSelectedSchemeId(scheme.id);
    setSelectedScheme(scheme);
  }

  function handleNext() {
    if (!selectedScheme) {
      setErrorMessage("Selecteer een oefenschema.");
      return;
    }

    const meta = getMediaMeta(selectedScheme);
    if (!meta.exercises.length) {
      setErrorMessage("Dit schema bevat nog geen oefeningen.");
      return;
    }

    setErrorMessage("");
    setStep(2);
  }

  const schemeMeta = useMemo(() => getMediaMeta(selectedScheme), [selectedScheme]);
  const schemeExercises = schemeMeta.exercises || [];
  const selectedSchemeThumbSrc = useMemo(
    () => getSchemeThumbSrc(selectedScheme),
    [selectedScheme]
  );
  const scheduledDates = useMemo(
    () => generateScheduledDates(startDate, endDate, schemeMeta.repeat_type),
    [startDate, endDate, schemeMeta.repeat_type]
  );

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

    if (!startDate || !endDate) {
      setErrorMessage("Vul een start- en einddatum in.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setErrorMessage("De einddatum mag niet voor de startdatum liggen.");
      return;
    }

    if (!schemeExercises.length) {
      setErrorMessage("Dit schema bevat nog geen oefeningen.");
      return;
    }

    if (!scheduledDates.length) {
      setErrorMessage("Er konden geen oefendagen gegenereerd worden.");
      return;
    }

    try {
      setSaving(true);
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

      const { error: insertError } = await supabase
        .from("patient_exercises")
        .insert(rows);

      if (insertError) throw insertError;

      navigate(`/patient/${id}`, {
        state: {
          activeTab: "programma",
          selectedDate: startDate,
        },
      });
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefenschema toewijzen is mislukt.");
    } finally {
      setSaving(false);
    }
  }

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

      <main className="exercisesMain patientExerciseAssignMain">
        <div className="schemeTopbar">
          <button type="button" className="patientBack" onClick={handleBack}>
            <img src="/images/back-icon.svg" alt="" />
            <span>Terug</span>
          </button>

          <div className="schemeStepBlock">
            <span className="schemeStepLabel">Stap {step} van 2</span>
            <div className="schemeProgressBar">
              <div className={`schemeProgressSegment ${step >= 1 ? "is-active" : ""}`} />
              <div className={`schemeProgressSegment ${step >= 2 ? "is-active" : ""}`} />
            </div>
          </div>
        </div>

        <h1 className="schemeBuilderHeading">Oefenschema toewijzen</h1>
        <p className="exerciseSchemesIntro">Kies een bestaand schema en plan het in voor deze patiënt. De herhaalinstelling van het schema wordt gebruikt bij het genereren van de datums.</p>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        {step === 1 && (
          <section className="schemeLibrarySection">
            <div className="exerciseLibraryGrid">
              {schemes.length === 0 ? (
                <div className="kinePatientsEmpty">
                  <img src="/images/monkey-search.png" alt="Geen schema’s gevonden" />
                  <strong>Nog geen oefenschema’s</strong>
                  <p>Maak eerst een schema aan in de bibliotheek.</p>
                </div>
              ) : (
                schemes.map((scheme) => {
                  const meta = getMediaMeta(scheme);
                  const isSelected = selectedSchemeId === scheme.id;
                  const thumbSrc = getSchemeThumbSrc(scheme);

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
                          src={thumbSrc}
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

            <div className="schemeNextRow">
              <button
                type="button"
                className="schemePrimaryBtn"
                onClick={handleNext}
                disabled={!selectedScheme}
              >
                Volgende
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="schemeFormGroup">
                <label htmlFor="schemeEndDate">Einde</label>
                <input
                  id="schemeEndDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="schemeFormGroup">
                <label>Herhaal</label>
                <input type="text" value={schemeMeta.repeat_type || "Nooit"} disabled readOnly />
              </div>

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
                  onClick={handleAssignScheme}
                  disabled={saving}
                >
                  {saving ? "Toewijzen..." : "Toewijzen"}
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
      </main>
    </div>
  );
}
