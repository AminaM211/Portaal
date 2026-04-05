import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "./supabase"
import "./assets/css/style.css"
import "./assets/css/PatientDetails.css"
import KineSidebar from "./components/KineSidebar"

export default function PatientDetailsScreen() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)

  const [exercises, setExercises] = useState([])
  const [assignedExercises, setAssignedExercises] = useState([])
  const [showAssign, setShowAssign] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState("")
  const [frequency, setFrequency] = useState(3)
  const [activeTab, setActiveTab] = useState("Overzicht")
  const [successMessage, setSuccessMessage] = useState("")

  /* -------------------------
     DATA FETCHING
  --------------------------*/

  useEffect(() => {
    if (id) fetchPatient()
  }, [id])

  useEffect(() => {
    if (patient?.id) {
      fetchExercises()
      fetchAssignedExercises()
    }
  }, [patient])

  const fetchPatient = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single()

    if (!error) setPatient(data)
    else setPatient(null)

    setLoading(false)
  }

  const fetchExercises = async () => {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, title, description")
      .order("title")

    if (!error) setExercises(data || [])
  }

  const fetchAssignedExercises = async () => {
    const { data, error } = await supabase
      .from("assigned_exercises")
      .select(`
        id,
        frequency,
        completed,
        exercises (
          id,
          title,
          description
        )
      `)
      .eq("child_id", patient.id)

    if (!error) setAssignedExercises(data || [])
  }

  const assignExercise = async () => {
    if (!selectedExercise) return

    const { error } = await supabase.from("assigned_exercises").insert([
      {
        child_id: patient.id,
        exercise_id: selectedExercise,
        frequency: Number(frequency),
        completed: false
      }
    ])

    if (!error) {
      setSuccessMessage("Oefening succesvol toegewezen 🎉")

      setShowAssign(false)
      setSelectedExercise("")
      setFrequency(3)
      fetchAssignedExercises()
    }
  }

  /* -------------------------
     DERIVED DATA
  --------------------------*/

  const p = useMemo(() => {
    if (!patient) return null

    return {
      ...patient,
      startDate: patient.startDate || "2026-02-15",
      goal: patient.goal || "Motorische ontwikkeling ondersteunen",
      parentName: patient.parentName || "Sarah Jansen",
      parentRole: patient.parentRole || "Ouder/verzorger",
      parentEmail: patient.parentEmail || "sarah.jansen@email.com",
      parentPhone: patient.parentPhone || "+31 6 1234 5678"
    }
  }, [patient])

  const initials = (fullName) =>
    (fullName || "")
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()

  const tabs = ["Overzicht", "Sessies", "Oefeningen", "Logboek"]

  /* -------------------------
     RENDER
  --------------------------*/

  if (loading || !p) {
    return <div className="pd" style={{ padding: 24 }}>Laden...</div>
  }

  return (
    <div className="main">
      <KineSidebar />

      <div className="pd">
        <div className="pdTopBar">
          <button className="pdBack" onClick={() => navigate("/kinesist")}>
            ← <span>Terug naar overzicht</span>
          </button>
        </div>

        {/* HEADER */}
        <section className="pdHeaderCard">
          <div className="flex">
            <div className="pdHeaderLeft">
              <div className="pdAvatar">{initials(p.name)}</div>

              <div className="pdHeadText">
                <div className="pdNameRow">
                  <h2 className="pdName">{p.name}</h2>
                  <span className="pdAge">{p.age} jaar</span>
                </div>
                <div className="pdMeta">Startdatum: {p.startDate}</div>
                <div className="pdGoal">{p.goal}</div>
              </div>
            </div>

            <div className="pdQr">
              <img src="/images/QR.svg" alt="QR" />
            </div>
          </div>

          <div className="pdDivider" />

          <div className="pdContactRow">
            <div className="pdContactLeft">
              <div className="pdContactName">{p.parentName}</div>
              <div className="pdContactRole">{p.parentRole}</div>
            </div>

            <div className="pdContactRight">
              <div className="pdContactItem">
                <img src="/images/mail-icon.svg" alt="" />
                <span>{p.parentEmail}</span>
              </div>
              <div className="pdContactItem">
                <img src="/images/phone-icon.svg" alt="" />
                <span>{p.parentPhone}</span>
              </div>
            </div>
          </div>
        </section>

        {/* OEFENING TOEVOEGEN */}
        <button className="btn btn-primary pdAddBtn" onClick={() => setShowAssign(true)}>
          + Oefening toevoegen
        </button>

        {showAssign && (
          <div className="pdAssignBox">
            <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}>
              <option value="">Kies een oefening</option>
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />

            <button className="btn btn-primary" onClick={assignExercise}>
              Toewijzen
            </button>
          </div>
        )}

      {successMessage && (
        <div className="successAlert">
          {successMessage}
        </div>
      )}

        {/* TABS */}
        <div className="pdTabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={`pdTab ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* OEFENINGEN TAB */}
        {activeTab === "Oefeningen" && (
  <div className="pdExercises">
    <div className="pdExercisesHeader">
      <div>
        <h2 className="pdH2">Actief oefenprogramma</h2>
        <p className="pdSub">
          {assignedExercises.length} oefeningen • Gemiddeld{" "}
          {assignedExercises.length === 0
            ? "0%"
            : `${Math.round(
                assignedExercises.reduce((acc, a) => {
                  // als je later echte % hebt: a.progress (0-100)
                  const pct = typeof a.progress === "number" ? a.progress : (a.completed ? 100 : 0)
                  return acc + pct
                }, 0) / assignedExercises.length
              )}%`}{" "}
          voltooiing
        </p>
      </div>
    </div>

    {assignedExercises.length === 0 ? (
      <div className="pdEmptyCard">
        Geen oefeningen toegewezen
      </div>
    ) : (
      <div className="pdExerciseList">
        {assignedExercises.map((a) => {
          const title = a.exercises?.title || "Oefening"
          const difficulty = a.difficulty || "Makkelijk" // later uit DB
          const category = a.category || "Mobiliteit" // later uit DB

          const duration = a.duration || "2 min" // later uit DB
          const reps = a.reps || "10× herhalingen" // later uit DB
          const freqLabel =
            typeof a.frequency === "number"
              ? `${a.frequency}× / week`
              : "Dagelijks"

          const pct =
            typeof a.progress === "number"
              ? Math.max(0, Math.min(100, a.progress))
              : a.completed
              ? 100
              : 0

          const lastDone = a.last_done || "Vandaag" // later uit DB
          const icon = a.icon || "⭐" // later uit DB (emoji of url)

          return (
            <div key={a.id} className="pdExerciseCard">
              <div className="pdExerciseIcon" aria-hidden="true">
                <span>{icon}</span>
              </div>

              <div className="pdExerciseBody">
                <div className="pdExerciseTopRow">
                  <div className="pdExerciseTitleWrap">
                    <h3 className="pdExerciseTitle">{title}</h3>

                    <div className="pdExerciseMetaRow">
                      <span className={`pdPill ${difficulty === "Makkelijk" ? "green" : "green"}`}>
                        {difficulty}
                      </span>
                      <span className="pdDot">•</span>
                      <span className="pdMetaText">{category}</span>
                    </div>
                  </div>

                  <button className="pdKebab" type="button" aria-label="Meer opties">
                    ⋮
                  </button>
                </div>

                <div className="pdExerciseInfoGrid">
                  <div className="pdInfoBlock">
                    <div className="pdInfoLabel">Duur</div>
                    <div className="pdInfoValue">{duration}</div>
                  </div>

                  <div className="pdInfoBlock">
                    <div className="pdInfoLabel">Herhalingen</div>
                    <div className="pdInfoValue">{reps}</div>
                  </div>

                  <div className="pdInfoBlock">
                    <div className="pdInfoLabel">Frequentie</div>
                    <div className="pdInfoValue">{freqLabel}</div>
                  </div>
                </div>

                <div className="pdCompletion">
                  <div className="pdCompletionLabel">Voltooiing</div>

                  <div className="pdProgressRow">
                    <div className="pdProgressBar">
                      <div className="pdProgressFill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="pdPct">{pct}%</div>
                  </div>

                  <div className="pdLastDone">Laatst voltooid: {lastDone}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )}
  </div>
)}
      </div>
    </div>
  )
}