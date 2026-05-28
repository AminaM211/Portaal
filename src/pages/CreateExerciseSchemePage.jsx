import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../components/ExerciseCard.css";
import ExerciseMediaThumb from "../components/ExerciseMediaThumb";
import "../assets/css/exercises.css";
import "../assets/css/kine-dashboard.css";

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

export default function CreateExerciseSchemePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState(null);

  const [step, setStep] = useState(1);
  const [tab, setTab] = useState("bibliotheek");
  const [category, setCategory] = useState("Alles");
  const [search, setSearch] = useState("");

  const [libraryExercises, setLibraryExercises] = useState([]);
  const [myExercises, setMyExercises] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);

  const [schemeTitle, setSchemeTitle] = useState("");
  const [repeat, setRepeat] = useState("Elke dag");
  const [applyToAll, setApplyToAll] = useState(true);
  const [savingScheme, setSavingScheme] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

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

      setUserId(user.id);

      const [libraryRes, myRes] = await Promise.all([
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

      if (libraryRes.error) throw libraryRes.error;
      if (myRes.error) throw myRes.error;

      setLibraryExercises(libraryRes.data || []);
      setMyExercises(myRes.data || []);
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefeningen konden niet geladen worden.");
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

    navigate("/kinesist/oefeningen");
  }

  function handleNext() {
    if (selectedExercises.length === 0) {
      setErrorMessage("Selecteer minstens één oefening.");
      return;
    }

    setErrorMessage("");
    setStep(2);
  }

  function toggleExercise(exercise) {
    setSelectedExercises((prev) => {
      const exists = prev.some((item) => item.id === exercise.id);

      if (exists) {
        return prev.filter((item) => item.id !== exercise.id);
      }

      return [...prev, exercise];
    });
  }

  async function handleCreateScheme() {
    const trimmedTitle = schemeTitle.trim();

    if (!trimmedTitle) {
      setErrorMessage("Geef je oefenschema een naam.");
      return;
    }

    if (selectedExercises.length === 0) {
      setErrorMessage("Voeg minstens één oefening toe.");
      return;
    }

    if (!userId) {
      setErrorMessage("Gebruiker niet gevonden.");
      return;
    }

    try {
      setSavingScheme(true);
      setErrorMessage("");

      const schemeImage =
        selectedExercises[0]?.image_url || "/images/scheme-1.png";

      const metadata = JSON.stringify({
        repeat_type: repeat,
        apply_to_all: applyToAll,
        exercises: selectedExercises.map((exercise, index) => ({
          id: exercise.id,
          title: exercise.title,
          category: exercise.category,
          difficulty: exercise.difficulty,
          duration_minutes: exercise.duration_minutes,
          repetitions: exercise.repetitions,
          image_url: exercise.image_url,
          sort_order: index,
        })),
      });

      const { error: schemeError } = await supabase
        .from("exercise_schemes")
        .insert({
          title: trimmedTitle,
          description: metadata,
          image_url: schemeImage,
          created_by: userId,
        })
        ;

      if (schemeError) throw schemeError;

      navigate("/kinesist/oefeningen");
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefenschema aanmaken is mislukt.");
    } finally {
      setSavingScheme(false);
    }
  }

  const activeDataset = useMemo(() => {
    return tab === "bibliotheek" ? libraryExercises : myExercises;
  }, [tab, libraryExercises, myExercises]);

  const filteredExercises = useMemo(() => {
    return activeDataset.filter((exercise) => {
      const title = (exercise.title || "").toLowerCase();
      const description = (exercise.description || "").toLowerCase();
      const normalizedSearch = search.trim().toLowerCase();

      const matchesSearch =
        normalizedSearch === "" ||
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch);

      const matchesCategory =
        category === "Alles" || exercise.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [activeDataset, search, category]);

  if (loading) {
    return (
      <div className="kineDash">
        <KineSidebar onLogout={handleLogout} />
        <main className="kineDashMain">
          <div className="kineDashLoading">
            <img src="/images/monkey-load.png" style={{ width: "100px"}} alt="" />
            <p>laden . . .</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="exercisesMain">
        <div className="schemeTopbar">
          <button type="button" className="patientBack" onClick={handleBack}>
            <img src="/images/back-icon.svg" alt="" />
            <span>Terug</span>
          </button>
        </div>

          <div className="schemeStepBlock">
            <span className="schemeStepLabel">Stap {step} van 2</span>

            <div className="schemeProgressBar">
              <div
                className={`schemeProgressSegment ${
                  step >= 1 ? "is-active" : ""
                }`}
              />
              <div
                className={`schemeProgressSegment ${
                  step >= 2 ? "is-active" : ""
                }`}
              />
            </div>
          </div>

        <h1 className="schemeBuilderHeading">Oefenschema maken</h1>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        {step === 1 && (
          <section className="schemeLibrarySection">
            <div className="exerciseSearchBar">
              <img src="/images/search-icon.svg" alt="" />
              <input
                type="text"
                placeholder="Zoek oefeningen..."
                className="searchbar"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="exerciseCategoryFilters">
              {["Alles", "Balans", "Mobiliteit", "Kracht"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`exerciseCategoryBtn ${
                    category === item ? "is-active" : ""
                  }`}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="exerciseTabsRow">
              <div className="exerciseTabs">
                <button
                  type="button"
                  className={tab === "bibliotheek" ? "is-active" : ""}
                  onClick={() => setTab("bibliotheek")}
                >
                  Bibliotheek
                </button>

                <button
                  type="button"
                  className={tab === "jouw-oefeningen" ? "is-active" : ""}
                  onClick={() => setTab("jouw-oefeningen")}
                >
                  Jouw oefeningen
                </button>
              </div>
            </div>

            <div className="exerciseLibraryGrid">
              {filteredExercises.map((exercise) => {
                const isSelected = selectedExercises.some(
                  (item) => item.id === exercise.id
                );

                return (
                  <div key={exercise.id} className="schemeLibraryCardWrap">
                    <button
                      type="button"
                      className={`exerciseLibraryCard schemeSelectableCard ${
                        isSelected ? "is-selected" : ""
                      }`}
                      onClick={() => toggleExercise(exercise)}
                    >
                      <ExerciseMediaThumb
                        className="exerciseLibraryThumb"
                        src={exercise.image_url || exercise.thumbnail_url || exercise.media_url}
                        alt={exercise.title}
                      />

                      <div className="exerciseLibraryInfo">
                        <strong>{exercise.title}</strong>

                        <div className="exerciseCardMetaRow">
                          <span
                            className={`exerciseTag ${getCategoryClass(
                              exercise.category
                            )}`}
                          >
                            {exercise.category}
                          </span>

                          <img
                            src={getDifficultyIcon(exercise.difficulty)}
                            alt={exercise.difficulty || "Makkelijk"}
                            className="exerciseDifficultyIcon"
                          />
                        </div>

                        <p>
                          {exercise.duration_minutes || 0} min ·{" "}
                          {exercise.repetitions || 0} herhalingen
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

        {step === 2 && (
          <section className="schemeBuilderLayout">
            <div className="schemeBuilderLeft">
              <div className="schemeFormGroup">
                <label htmlFor="schemeTitle">Naam</label>
                <input
                  id="schemeTitle"
                  type="text"
                  placeholder="Bijv. Startprogramma knierevalidatie"
                  value={schemeTitle}
                  onChange={(e) => setSchemeTitle(e.target.value)}
                />
              </div>

              <div className="schemeFormGroup">
                <label htmlFor="schemeRepeat">Herhaal</label>
                <select
                  id="schemeRepeat"
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
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
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                />
                <span>Voor alle oefeningen</span>
              </label>

              <div className="schemeActionRow">
                <button
                  type="button"
                  className="schemeCancelBtn"
                  onClick={() => navigate("/kinesist/oefeningen")}
                >
                  annuleer
                </button>

                <button
                  type="button"
                  className="schemePrimaryBtn"
                  onClick={handleCreateScheme}
                  disabled={savingScheme}
                >
                  {savingScheme ? "Aanmaken..." : "Aanmaken"}
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
                        className="exerciseLibraryThumb"
                        src={exercise.image_url}
                        alt={exercise.title}
                      />

                      <div className="exerciseLibraryInfo">
                        <strong>{exercise.title}</strong>

                        <div className="exerciseCardMetaRow">
                          <span
                            className={`exerciseTag ${getCategoryClass(
                              exercise.category
                            )}`}
                          >
                            {exercise.category}
                          </span>

                          <img
                            src={getDifficultyIcon(exercise.difficulty)}
                            alt={exercise.difficulty || "Makkelijk"}
                            className="exerciseDifficultyIcon"
                          />
                        </div>

                        <p>
                          {exercise.duration_minutes || 0} min ·{" "}
                          {exercise.repetitions || 0} herhalingen
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