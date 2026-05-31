import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import ExerciseMediaThumb from "../components/ExerciseMediaThumb";
import "../assets/css/exercise-detail.css";
import "../assets/css/kine-dashboard.css";

function getSchemeMeta(scheme) {
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
  const meta = getSchemeMeta(scheme);
  const parsedExercises = Array.isArray(meta.exercises) ? meta.exercises : [];
  const linkedExercises = (scheme?.exercise_scheme_items || []).map((item) => item.exercise).filter(Boolean);

  const findWithMedia = (arr) => arr.find((exercise) => exercise?.image_url || exercise?.thumbnail_url || exercise?.media_url);

  const parsedWithMedia = findWithMedia(parsedExercises);
  if (parsedWithMedia) return parsedWithMedia.image_url || parsedWithMedia.thumbnail_url || parsedWithMedia.media_url;

  const linkedWithMedia = findWithMedia(linkedExercises);
  if (linkedWithMedia) return linkedWithMedia.image_url || linkedWithMedia.thumbnail_url || linkedWithMedia.media_url;

  return scheme?.image_url || "";
}

function getTotalDuration(exercises) {
  return exercises.reduce((sum, exercise) => sum + Number(exercise.duration_minutes || 0), 0);
}

function getCategoryClass(categoryName) {
  if (categoryName === "Mobiliteit") return "exerciseTag--yellow";
  if (categoryName === "Flexibiliteit") return "exerciseTag--pink";
  if (categoryName === "Balans") return "exerciseTag--blue";
  if (categoryName === "Kracht") return "exerciseTag--green";
  return "exerciseTag--yellow";
}

export default function ExerciseSchemeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [scheme, setScheme] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadScheme();
  }, [id]);

  async function loadScheme() {
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

      const { data, error } = await supabase
        .from("exercise_schemes")
        .select(`
          id,
          title,
          description,
          image_url,
          is_public,
          created_by,
          created_at,
          exercise_scheme_items (
            id,
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
        .eq("id", id)
        .single();

      if (error) throw error;

      if (!data) {
        navigate("/kinesist/oefeningen");
        return;
      }

      // allow viewing public schemes by non-owners; editing restricted to owner
      if (data.created_by !== user.id && !data.is_public) {
        navigate("/kinesist/oefeningen");
        return;
      }

      setIsOwner(data.created_by === user.id);
      setScheme(data);
      console.log("[SchemeDetail] loaded scheme:", data);
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefenschema kon niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  async function handleDeleteScheme() {
    if (!scheme) return;

    const confirmed = window.confirm("Weet je zeker dat je dit oefenschema wilt verwijderen?");
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("exercise_schemes").delete().eq("id", scheme.id);
      if (error) throw error;
      navigate("/kinesist/oefeningen");
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefenschema verwijderen is mislukt.");
    }
  }

  async function toggleFavorite() {
    if (!userId || !scheme) return;

    setIsFavorited((prev) => !prev);
  }

  useEffect(() => {
    // initialize editable list when scheme is loaded
    const meta = getSchemeMeta(scheme);
    const parsedExercises = Array.isArray(meta.exercises) ? meta.exercises : [];
    const linkedExercises = (scheme?.exercise_scheme_items || []).map((item) => item.exercise).filter(Boolean);
    const initial = parsedExercises.length > 0 ? parsedExercises : linkedExercises;
    setSelectedExercises(initial || []);
    console.log('[SchemeDetail] init selectedExercises:', initial);
  }, [scheme]);

  useEffect(() => {
    // moved logging below where schemeExercises is defined to avoid accessing before init
  }, [scheme]);

  async function handleSaveScheme() {
    if (!scheme) return;

    try {
      setErrorMessage("");
      const schemeImage = selectedExercises[0]?.image_url || scheme.image_url || "/images/scheme-1.png";

      const metadata = JSON.stringify({
        repeat_type: getSchemeMeta(scheme).repeat_type || "Nooit",
        apply_to_all: getSchemeMeta(scheme).apply_to_all ?? true,
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

      const updatePayload = { description: metadata, image_url: schemeImage };
      const { error } = await supabase
        .from("exercise_schemes")
        .update(updatePayload)
        .eq("id", scheme.id);

      if (error) throw error;

      // reload scheme
      await loadScheme();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setErrorMessage("Oefenschema opslaan is mislukt.");
    }
  }

  const schemeMeta = useMemo(() => getSchemeMeta(scheme), [scheme]);
  const schemeExercises = useMemo(() => {
    const parsedExercises = Array.isArray(schemeMeta.exercises) ? schemeMeta.exercises : [];
    const linkedExercises = (scheme?.exercise_scheme_items || [])
      .map((item) => item.exercise)
      .filter(Boolean);

    if (parsedExercises.length > 0) return parsedExercises;
    return linkedExercises;
  }, [scheme, schemeMeta.exercises]);
  const schemeThumbSrc = useMemo(() => getSchemeThumbSrc(scheme), [scheme]);
  const totalDuration = useMemo(() => getTotalDuration(schemeExercises), [schemeExercises]);

  useEffect(() => {
    console.log('[SchemeDetail] schemeExercises:', schemeExercises);
    console.log('[SchemeDetail] schemeThumbSrc:', schemeThumbSrc);
    console.log('[SchemeDetail] selectedExercises:', selectedExercises);
  }, [schemeExercises, schemeThumbSrc, selectedExercises]);

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

  if (!scheme) {
    return (
      <div className="kineDashLoading">
        <p>{errorMessage || "Oefenschema niet gevonden."}</p>
      </div>
    );
  }

  const previewSrc = schemeThumbSrc;

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="exerciseDetailMain exerciseSchemeDetailMain">
        <div className="exerciseDetailTopbar exerciseSchemeDetailTopbar">
          <button type="button" className="patientBack" onClick={() => navigate(-1)}>
            <img src="/images/back-icon.svg" alt="" />
            <span>Terug</span>
          </button>

          <div className="exerciseDetailActions">
              {isOwner && (
                <button type="button" className="btn-outline-small" onClick={handleDeleteScheme}>
                  Verwijder oefenschema
                </button>
              )}

              {/* Public toggle removed from detail page per UX: only set on creation */}

              <button type="button" className="exerciseIconBtn" onClick={toggleFavorite} aria-label="Favoriet">
                <img
                  src={isFavorited ? "/images/favorite-filled.svg" : "/images/favorite.svg"}
                  alt=""
                />
              </button>
          </div>
        </div>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        <div className="exerciseVideoHero exerciseSchemeHero">
          <ExerciseMediaThumb
            src={previewSrc}
            alt={scheme.title || "Oefenschema"}
            className="schemeExerciseThumb"
          />
        </div>

        <div className="exerciseDetailHeader exerciseSchemeHeader">
            <h1>{scheme.title}</h1>

          <div className="exerciseSchemeDurationPill">
            <img src="/images/Clock.svg" alt="" />
            <span>{totalDuration || 0} min</span>
          </div>
        </div>

        <section className="exerciseDetailSection">
          <h2>{(isEditing ? selectedExercises.length : schemeExercises.length) || 0} Oefeningen</h2>

          <div className="exerciseSchemeExerciseList">
            {(isEditing ? selectedExercises : schemeExercises).map((exercise, index) => (
              <article key={`${exercise.id || exercise.title}-${index}`} className="schemeExerciseCard">
                <ExerciseMediaThumb
                  src={exercise.image_url || exercise.thumbnail_url || exercise.media_url}
                  alt={exercise.title}
                  className="schemeExerciseThumb"
                />

                <div className="schemeExerciseInfo">
                  <strong>{exercise.title}</strong>

                  <div className="schemeExerciseBadgesRow">
                    <span className={`exerciseTag ${getCategoryClass(exercise.category)}`}>
                      {exercise.category || "Mobiliteit"}
                    </span>

                    <img
                      src={getCategoryClass(exercise.category) === "exerciseTag--green" ? "/images/difficulty-medium.svg" : "/images/difficulty-easy.svg"}
                      alt=""
                      className="schemeExerciseDifficulty"
                    />
                  </div>

                  <p>
                    {exercise.duration_minutes || 0} min · {exercise.repetitions || 0} herhalingen
                  </p>
                </div>

                {isEditing && (
                  <button
                    type="button"
                    className="schemeRemoveBtn"
                    onClick={() => setSelectedExercises((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="Verwijder oefening"
                  >
                    <img src="/images/trash.svg" alt="" />
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}