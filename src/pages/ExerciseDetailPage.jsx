import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/exercise-detail.css";
import "../assets/css/kine-dashboard.css";

export default function ExerciseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [exercise, setExercise] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState(null);

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

      setExercise(exerciseRes.data);
      setIsFavorite(!!favoriteRes.data);
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
            <button type="button" className="exerciseIconBtn" onClick={toggleFavorite}>
              {isFavorite ? "♥" : "♡"}
            </button>
            <button type="button" className="btn-outline-small">Wijzig</button>
          </div>
        </div>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        <div className="exerciseVideoHero">
          <img src={exercise.image_url} alt="" />
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
            <span className="quickIcon">▮▮▮</span>
            <strong>{exercise.difficulty || "Makkelijk"}</strong>
          </div>

          <div className="exerciseQuickFact">
            <span className="quickIcon">◷</span>
            <strong>{exercise.duration_minutes || 2} min</strong>
          </div>

          <div className="exerciseQuickFact">
            <span className="quickIcon">↻</span>
            <strong>{exercise.repetitions || 10} herhalen</strong>
          </div>
        </div>
      </main>
    </div>
  );
}