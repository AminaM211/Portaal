import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/new-patient.css";

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
          <img src="/images/back-icon.svg" alt="back" />
          Terug
        </button>

        <div className="stepBar">
          {[1, 2, 3].map((s) => (
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

            <label>
              Voornaam van het kind
              <input
                placeholder="Voornaam"
                value={form.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
              />
            </label>

            <label>
              Achternaam van het kind
              <input
                placeholder="Achternaam"
                value={form.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
              />
            </label>

            <label>
              Geboortedatum
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => updateField("birthDate", e.target.value)}
              />
            </label>

            <label>
              Behandeldoel
              <input
                placeholder="Bijv. Knierevalidatie"
                value={form.goal}
                onChange={(e) => updateField("goal", e.target.value)}
              />
            </label>

            <button className="btn-primary" onClick={nextStep}>
              Volgende
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flowContent">
            <h1>Bijna klaar!</h1>
            <p>Controleer of alle gegevens juist zijn.</p>

            <div className="reviewCard">
              <img src="/images/avatar.svg" alt="" />
              <h2>{form.firstName} {form.lastName}</h2>
              <p>{form.birthDate}</p>
              <p>{form.goal}</p>
            </div>

            <h4>Wat gebeurt er nu?</h4>
            <p>Na het bevestigen van alle gegevens wordt automatisch een 6-cijferige activatiecode gegenereerd. Met deze code kunnen ouders het kinderprofiel veilig activeren in het portaal.</p>

            <button className="btn-primary" onClick={nextStep}>
            Patiënt toevoegen
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flowContent">
            <h1>Patiënt toegevoegd!</h1>
            <p>Deel deze activatiecode met de ouder(s): </p>
            <div className="codeBox">{activationCode}</div>
            <p>Je kunt de activatiecode ook later terugvinden in het profiel van de patiënt.</p>

            <div className="instructions">
              <h4>Wat moeten de ouders doen?</h4>
              <ol>
                <li>Ga naar het nimbli portaal op je browser.</li>
                <li>Open de app en kies "Aanmelden met code"</li>
                <li>Voer de activatiecode {activationCode} in.</li>
              </ol>
            </div>

            <div className="share">
              <h4>Delen</h4>
              <button
                className="btn-secondary"
                onClick={() => navigator.clipboard.writeText(activationCode)}
              >
                <img src="images/QR-code.svg" alt="" />
                QR-code
              </button>
              <a
                href={`mailto:?subject=Activatiecode voor Nimbli&body=Gebruik deze activatiecode om het profiel van ${form.firstName} te activeren in de Nimbli app: ${activationCode}`}
                className="btn-secondary"
              >
                <img src="images/mail.svg" alt="" />
                E-mail
              </a>
              <a
                href={`mailto:?subject=Activatiecode voor Nimbli&body=Gebruik deze activatiecode om het profiel van ${form.firstName} te activeren in de Nimbli app: ${activationCode}`}
                className="btn-secondary"
              >
                <img src="images/icon-patients.svg" alt="" />
                SMS
              </a>
            </div>

            <button className="btn-primary" onClick={() => navigate("/kinesist/dashboard")}>
              Terug naar dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}