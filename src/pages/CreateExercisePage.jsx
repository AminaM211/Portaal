import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/exercises.css";
import "../assets/css/kine-dashboard.css";
import "../assets/css/create-exercise.css";

export default function CreateExercisePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const MAX_VIDEO_SIZE_MB = 500;
  const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Mobiliteit");
  const [difficulty, setDifficulty] = useState("Makkelijk");
  const [repetitions, setRepetitions] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState(3);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [xpReward, setXpReward] = useState(50);
  const [stance, setStance] = useState("Staand");
  const [materials, setMaterials] = useState("Geen");
  const [spaceNeeded, setSpaceNeeded] = useState("Minimaal");
  const [ageRange, setAgeRange] = useState("6-14");
  const [isPublic, setIsPublic] = useState(false);

  const categories = ["Mobiliteit", "Flexibiliteit", "Balans", "Kracht", "Conditie", "Andere"];
  const difficulties = ["Makkelijk", "Gemiddeld", "Moeilijk"];
  const stances = ["Staand", "Liggend", "Zittend"];
  const spaceLevels = ["Minimaal", "Klein", "Groot"];

  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        setError(`Je video is te groot. Kies een bestand kleiner dan ${MAX_VIDEO_SIZE_MB} MB.`);
        setMediaFile(null);
        setMediaPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setError("");
      setMediaFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMediaPreview(ev.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError("Titel is verplicht");
      return;
    }

    if (!description.trim()) {
      setError("Beschrijving is verplicht");
      return;
    }

    if (!mediaFile) {
      setError("Een video is verplicht");
      return;
    }

    if (mediaFile.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`Je video is te groot. Kies een bestand kleiner dan ${MAX_VIDEO_SIZE_MB} MB.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        navigate("/");
        return;
      }

      // Upload video to Supabase Storage
      const fileName = `${Date.now()}-${mediaFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("exercise_images")
        .upload(`exercises/${fileName}`, mediaFile);

      if (uploadError) {
        if (uploadError.message?.toLowerCase().includes("maximum allowed size")) {
          throw new Error("Deze video is nog te groot voor de Supabase storage bucket. Verhoog daar de limiet of gebruik een kleinere video.");
        }

        throw uploadError;
      }

      // Get public URL for the uploaded file so the frontend can load it
      const { data: publicData } = await supabase.storage
        .from("exercise_images")
        .getPublicUrl(`exercises/${fileName}`);
      const publicUrl = publicData?.publicUrl || `/images/${fileName}`;
      // publicUrl retrieved and stored in DB; not kept in UI

      // Create exercise in database
      const { data, error: dbError } = await supabase
        .from("exercises")
        .insert([
          {
            title: title.trim(),
            description: description.trim(),
            category,
            difficulty,
            repetitions: parseInt(repetitions),
            duration_minutes: parseInt(durationMinutes),
            image_url: publicUrl,
            xp_reward: parseInt(xpReward),
            stance,
            materials: materials.trim() || "Geen",
            space_needed: spaceNeeded,
            age_range: ageRange,
            created_by: user.id,
            is_public: isPublic,
            uploaded: true,
          }
        ])
        .select();

      if (dbError) throw dbError;

      setSuccessMessage("Oefening succesvol aangemaakt!");
      navigate("/kinesist/oefeningen");
    } catch (err) {
      console.error(err);
      setError(err.message || "Er is iets misgegaan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container-create-exercise">
      <KineSidebar />
      
      <main className="main-content">
        <header className="pageHeader">
          <h1>Nieuwe oefening maken</h1>
        </header>

        <div className="createExerciseContainer">
          <form onSubmit={handleSubmit} className="exerciseForm">
            
            {error && <div className="errorBanner">{error}</div>}
            {successMessage && (
              <div className="successBanner">
                {successMessage}
                {uploadedUrl && (
                  <div style={{ marginTop: 8 }}>
                    <a href={uploadedUrl} target="_blank" rel="noreferrer" style={{ color: "#0645AD" }}>
                      Open geüploade file
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Media Upload Section */}
            <div className="formSection">
              <h2>Video uploaden</h2>
              <div className="imageUploadArea">
                {mediaPreview ? (
                  <div className="imagePreview">
                    {mediaFile && mediaFile.type && mediaFile.type.startsWith("video/") ? (
                      <video className="videoPreview" controls src={mediaPreview} />
                    ) : (
                      <img src={mediaPreview} alt="Preview" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMediaFile(null);
                        setMediaPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="removeImageBtn"
                    >
                      Verwijderen
                    </button>
                  </div>
                ) : (
                  <div
                    className="uploadPlaceholder"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <img src="/images/plus-icon.svg" alt="" />
                    <p>Klik om video te uploaden</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleMediaSelect}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="formSection">
              <h2>Basisgegevens</h2>
              <div className="formGrid">
                <div className="formGroup">
                  <label>Titel *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Bijv. Armheffingen"
                  />
                </div>
                <div className="formGroup">
                  <label>Categorie</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="formGroup">
                <label>Beschrijving *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beschrijf hoe de oefening moet worden uitgevoerd..."
                  rows={4}
                />
              </div>
            </div>

            {/* Difficulty & Duration */}
            <div className="formSection">
              <h2>Moeilijkheid & Timing</h2>
              <div className="formGrid">
                <div className="formGroup">
                  <label>Moeilijkheid</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    {difficulties.map((diff) => (
                      <option key={diff} value={diff}>
                        {diff}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="formGroup">
                  <label>Duur (minuten)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>
                <div className="formGroup">
                  <label>Herhalingen/Reps</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={repetitions}
                    onChange={(e) => setRepetitions(e.target.value)}
                  />
                </div>
                <div className="formGroup">
                  <label>XP Beloning</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={xpReward}
                    onChange={(e) => setXpReward(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Physical Requirements */}
            <div className="formSection">
              <h2>Fysieke Vereisten</h2>
              <div className="formGrid">
                <div className="formGroup">
                  <label>Houding</label>
                  <select value={stance} onChange={(e) => setStance(e.target.value)}>
                    {stances.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="formGroup">
                  <label>Ruimte Nodig</label>
                  <select value={spaceNeeded} onChange={(e) => setSpaceNeeded(e.target.value)}>
                    {spaceLevels.map((space) => (
                      <option key={space} value={space}>
                        {space}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="formGroup">
                  <label>Materiaal</label>
                  <input
                    type="text"
                    value={materials}
                    onChange={(e) => setMaterials(e.target.value)}
                    placeholder="Bijv. Geen, Halters, Yoga mat"
                  />
                </div>
                <div className="formGroup">
                  <label>Leeftijd (bereik)</label>
                  <input
                    type="text"
                    value={ageRange}
                    onChange={(e) => setAgeRange(e.target.value)}
                    placeholder="Bijv. 6-14"
                  />
                </div>
              </div>
            </div>

            {/* Visibility */}
            <div className="formSection">
              <h2>Zichtbaarheid</h2>
              <div className="checkboxGroup">
                <label>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <span><strong>Openbaar maken</strong> <br></br> Andere kinesisten kunnen je video zien in de bibliotheek en gebruiken</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="formActions">
              <button
                type="button"
                onClick={() => navigate("/kinesist/oefeningen")}
                className="btn-outline-large"
                disabled={loading}
              >
                Annuleren
              </button>
              <button
                type="submit"
                className="btn-primary-small"
                disabled={loading}
              >
                {loading ? "Laden..." : "Oefening Creëren"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
