import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
// import "../assets/css/new-patient.css";

export default function NewPatientFlow() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    goal: "",
  });

  const [activationCode, setActivationCode] = useState("");

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function nextStep() {
    setStep((s) => s + 1);
  }

  function prevStep() {
    setStep((s) => s - 1);
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 })
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  }

  async function handleCreatePatient() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const code = generateCode();

    const { error } = await supabase.from("patients").insert({
      kinesist_id: user.id,
      name: `${form.firstName} ${form.lastName}`,
      birth_date: form.birthDate,
      goal: form.goal,
      activation_code: code,
    });

    if (error) {
      console.error(error);
      return;
    }

    setActivationCode(code);
    nextStep();
  }

  return (
    <div className="kineDash">
      <KineSidebar />

      <main className="flowMain">
        <button className="backBtn" onClick={() => navigate(-1)}>
          ← Terug
        </button>

        <div className="stepBar">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`step ${step >= s ? "active" : ""}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="flowContent">
            <h1>Nieuwe patiënt toevoegen</h1>

            <h3>Basisgegevens</h3>

            <input
              placeholder="Voornaam"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
            />

            <input
              placeholder="Achternaam"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
            />

            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => updateField("birthDate", e.target.value)}
            />

            <input
              placeholder="Behandeldoel"
              value={form.goal}
              onChange={(e) => updateField("goal", e.target.value)}
            />

            <button className="btn-primary" onClick={nextStep}>
              Volgende
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flowContent">
            <h1>Bijna klaar!</h1>

            <div className="reviewCard">
              <h2>{form.firstName} {form.lastName}</h2>
              <p>{form.birthDate}</p>
              <p>{form.goal}</p>
            </div>

            <button className="btn-primary" onClick={nextStep}>
              Volgende
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flowContent">
            <h1>Bevestigen</h1>

            <button className="btn-primary" onClick={handleCreatePatient}>
              Patiënt toevoegen
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="flowContent">
            <h1>Patiënt toegevoegd!</h1>

            <div className="codeBox">{activationCode}</div>

            <button className="btn-primary" onClick={() => navigate("/kinesist/dashboard")}>
              Terug naar dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}