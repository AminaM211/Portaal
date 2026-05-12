import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import { isVideoFileUrl, getExerciseImageSrc } from "../utils/helpers";
import "../components/ExerciseCard.css";
import "../assets/css/exercises.css";
import "../assets/css/kine-dashboard.css";

function getMediaSrc(value) {
  if (!value) return "/images/exercise-1.png";
  if (value.startsWith("http")) return value;
  if (value.startsWith("/")) return value;
  return `/images/${value}`;
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

export default function ExercisesPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("bibliotheek");
  const [category, setCategory] = useState("Alles");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
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
        const { error } = await supabase
          .from("favorite_exercises")
          .upsert(
            {
              user_id: userId,
              exercise_id: exerciseId,
            },
            {
              onConflict: "user_id,exercise_id",
              ignoreDuplicates: true,
            }
          );

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
            className="searchbar"
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

          <button
            type="button"
            className="btn-outline-small"
          >
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
                    <div
                      role="button"
                      tabIndex={0}
                      className="favIconBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(exercise.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleFavorite(exercise.id);
                        }
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
                    </div>

                    {isVideoFileUrl(exercise.image_url) ? (
                      <video
                        className="exerciseLibraryThumb exerciseLibraryVideoThumb"
                        src={getMediaSrc(exercise.image_url)}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        className="exerciseLibraryThumb"
                        src={getExerciseImageSrc(exercise.image_url)}
                        alt={exercise.title}
                      />
                    )}

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

                      <p className="exerciseLibraryMeta">
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
             <button 
                    type="button" 
                    className="btn-primary exerciseCreateBtn"
                    onClick={() => navigate("/kinesist/oefeningen/nieuw")}
                  >
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
                    <div
                      role="button"
                      tabIndex={0}
                      className="myExerciseCard"
                      onClick={() => navigate(`/kinesist/oefeningen/${exercise.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          navigate(`/kinesist/oefeningen/${exercise.id}`);
                        }
                      }}
                    >
                      <div className="myExerciseCardTop">
                        <strong>{exercise.title}</strong>

                        <div
                          role="button"
                          tabIndex={0}
                          className="favIconBtn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(exercise.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              toggleFavorite(exercise.id);
                            }
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
                        </div>
                      </div>

                      <div className="myExerciseImageWrap">
                        {isVideoFileUrl(exercise.image_url) ? (
                          <video
                            src={getMediaSrc(exercise.image_url)}
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={getExerciseImageSrc(exercise.image_url)}
                            alt={exercise.title}
                          />
                        )}
                        {isVideoFileUrl(exercise.image_url) && (
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
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === "schema’s" && (
          <>
            <div >
              <button
                type="button"
                className="exerciseCreateBtn btn-primary"
                onClick={() => navigate("/kinesist/oefeningen/schema/nieuw")}
              >
                Nieuw oefenschema maken
              </button>
            </div>

            <p className="exerciseSchemesIntro">
              Bundels van oefeningen die je eenvoudig kan hergebruiken en
              toewijzen aan patiënten.
            </p>

            <div className="exerciseSchemesGrid">
              {exerciseSchemes.length === 0 ? (
                <div className="kinePatientsEmpty">
                  <img src="/images/monkey-search.png" alt="Geen patiënten gevonden" />
                  <strong>Nog geen oefenschema’s</strong>
                  <p>Maak een eerste schema om hier te tonen.</p>
                </div>
              ) : (
                exerciseSchemes.map((exerciseScheme) => (
                  <button
                    key={exerciseScheme.id}
                    type="button"
                    className="exerciseSchemeCard"
                  >
                    <div className="exerciseSchemeStack stack-1"></div>
                    <div className="exerciseSchemeStack stack-2"></div>

                    <div className="exerciseSchemeInner">
                      <strong>{exerciseScheme.title}</strong>
                      {isVideoFileUrl(exerciseScheme.image_url) ? (
                        <video
                          src={getMediaSrc(exerciseScheme.image_url)}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={getExerciseImageSrc(exerciseScheme.image_url)}
                          alt={exerciseScheme.title}
                        />
                      )}
                      <p>{exerciseScheme.exercise_scheme_items?.length || 0} oefeningen</p>
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