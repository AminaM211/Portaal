import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
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

export default function ExercisesPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("bibliotheek");
  const [category, setCategory] = useState("Alles");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState(null);

  const [libraryExercises, setLibraryExercises] = useState([]);
  const [myExercises, setMyExercises] = useState([]);
  const [exerciseSchemes, setExerciseSchemes] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);

  useEffect(() => {
    loadExercisesPage();
  }, []);

  async function loadExercisesPage() {
    try {
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

      const [libraryRes, myRes, favoritesRes, schemesRes] = await Promise.all([
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
          .from("favorite_exercises")
          .select("exercise_id")
          .eq("user_id", user.id),

        supabase
          .from("exercise_schemes")
          .select(`
            id,
            title,
            description,
            image_url,
            exercise_scheme_items ( id )
          `)
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (libraryRes.error) throw libraryRes.error;
      if (myRes.error) throw myRes.error;
      if (favoritesRes.error) throw favoritesRes.error;
      if (schemesRes.error) throw schemesRes.error;

      setLibraryExercises(libraryRes.data || []);
      setMyExercises(myRes.data || []);
      setFavoriteIds((favoritesRes.data || []).map((item) => item.exercise_id));
      setExerciseSchemes(schemesRes.data || []);
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefeningen konden niet geladen worden.");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  async function toggleFavorite(exerciseId) {
    if (!userId) return;

    const isFavorite = favoriteIds.includes(exerciseId);

    try {
      setErrorMessage("");

      if (isFavorite) {
        const { error } = await supabase
          .from("favorite_exercises")
          .delete()
          .eq("user_id", userId)
          .eq("exercise_id", exerciseId);

        if (error) throw error;

        setFavoriteIds((prev) => prev.filter((id) => id !== exerciseId));
      } else {
        const { error } = await supabase.from("favorite_exercises").insert({
          user_id: userId,
          exercise_id: exerciseId,
        });

        if (error) throw error;

        setFavoriteIds((prev) => [...prev, exerciseId]);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Favoriet aanpassen is mislukt.");
    }
  }

  const activeDataset = useMemo(() => {
    if (tab === "bibliotheek") return libraryExercises;
    if (tab === "jouw-oefeningen") return myExercises;
    return [];
  }, [tab, libraryExercises, myExercises]);

  const filteredExercises = useMemo(() => {
    return activeDataset.filter((exercise) => {
      const title = exercise.title || "";
      const description = exercise.description || "";
      const normalizedSearch = search.trim().toLowerCase();

      const matchesSearch =
        normalizedSearch === "" ||
        title.toLowerCase().includes(normalizedSearch) ||
        description.toLowerCase().includes(normalizedSearch);

      const matchesCategory =
        category === "Alles" ||
        (category === "Favorieten" && favoriteIds.includes(exercise.id)) ||
        exercise.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [activeDataset, search, category, favoriteIds]);

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="exercisesMain">
        <div className="exercisesHeader">
          <h1>Bibliotheek</h1>
          <p>
            De Nimbli oefeningenbibliotheek. Je kan oefeningen bekijken
            uit de bibliotheek of je eigen oefeningen toevoegen.
          </p>
        </div>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        <div className="exerciseSearchBar">
          <img src="/images/search-icon.svg" alt="" />
          <input
            type="text"
            placeholder="Zoek oefeningen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="exerciseCategoryFilters">
          {["Alles", "Favorieten", "Balans", "Mobiliteit", "Flexibiliteit", "Kracht"].map(
            (item) => (
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
            )
          )}
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

            <button
              type="button"
              className={tab === "schema’s" ? "is-active" : ""}
              onClick={() => setTab("schema’s")}
            >
              Oefenschema’s
            </button>
          </div>

          <button type="button" className="btn-outline-small">
            <img src="/images/check-square.png" alt="" />
            <span>Selecteer</span>
          </button>
        </div>

        {tab === "bibliotheek" && (
          <div className="exerciseLibraryGrid">
            {filteredExercises.length === 0 ? (
              <div className="kinePatientsEmpty">
                 <img src="/images/monkey-search.png" alt="Geen patiënten gevonden" />
                <strong>Geen oefeningen gevonden</strong>
                <p>Probeer een andere zoekterm of filter.</p>
              </div>
            ) : (
              filteredExercises.map((exercise) => (
                <div key={exercise.id} className="exerciseLibraryCardWrap">
                  <a
                    type="button"
                    className="exerciseLibraryCard"
                    onClick={() => navigate(`/kinesist/oefeningen/${exercise.id}`)}
                  >
                    <button
                      type="button"
                      className="favIconBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(exercise.id);
                      }}
                    >
                      <img
                        src={
                          favoriteIds.includes(exercise.id)
                            ? "/images/favorite-filled.svg"
                            : "/images/favorite.svg"
                        }
                        alt="Favoriet"
                      />
                    </button>

                    <img
                      className="exerciseLibraryThumb"
                      src={exercise.image_url || "/images/exercise-1.png"}
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
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "jouw-oefeningen" && (
          <>
            <button type="button" className="exerciseCreateBtn">
              Oefening toevoegen +
            </button>

            <div className="myExercisesGrid">
              {filteredExercises.length === 0 ? (
                <div className="kinePatientsEmpty">
                    <img src="/images/monkey-search.png" alt="Geen patiënten gevonden" />
                  <strong>Nog geen eigen oefeningen</strong>
                  <p>Maak een eerste oefening om hier te tonen.</p>
                </div>
              ) : (
                filteredExercises.map((exercise) => (
                  <div key={exercise.id} className="myExerciseCardWrap">
                    <button
                      type="button"
                      className="myExerciseCard"
                      onClick={() => navigate(`/kinesist/oefeningen/${exercise.id}`)}
                    >
                      <div className="myExerciseCardTop">
                        <strong>{exercise.title}</strong>

                        <button
                          type="button"
                          className="favIconBtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(exercise.id);
                          }}
                        >
                          <img
                            src={
                              favoriteIds.includes(exercise.id)
                                ? "/images/favorite-filled.svg"
                                : "/images/favorite.svg"
                            }
                            alt="Favoriet"
                          />
                        </button>
                      </div>

                      <div className="myExerciseImageWrap">
                        <img
                          src={exercise.image_url || "/images/exercise-1.png"}
                          alt={exercise.title}
                        />
                        {exercise.video_url && (
                          <div className="myExercisePlayOverlay">▶</div>
                        )}
                      </div>

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
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === "schema’s" && (
          <>
           
            <p className="exerciseSchemesIntro">
              Bundels van oefeningen die je eenvoudig kan hergebruiken en
              toewijzen aan patiënten.
            </p>
            <button type="button" className="exerciseCreateBtn" onClick={() => navigate("/kinesist/oefeningen/schema/nieuw")}>
              Nieuw oefenschema maken
            </button>
            <div className="exerciseSchemesGrid">
              {exerciseSchemes.length === 0 ? (
                <div className="kinePatientsEmpty">
                      <img src="/images/monkey-search.png" alt="Geen patiënten gevonden" />
                  <strong>Nog geen oefenschema’s</strong>
                  <p>Maak een eerste schema om hier te tonen.</p>
                </div>
              ) : (
                exerciseSchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    type="button"
                    className="exerciseSchemeCard"
                  >
                    <div className="exerciseSchemeStack stack-1"></div>
                    <div className="exerciseSchemeStack stack-2"></div>

                    <div className="exerciseSchemeInner">
                      <strong>{scheme.title}</strong>
                      <img
                        src={scheme.image_url || "/images/scheme-1.png"}
                        alt={scheme.title}
                      />
                      <p>{scheme.exercise_scheme_items?.length || 0} oefeningen</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}