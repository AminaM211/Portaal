import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../assets/css/new-patient.css";

export default function NewPatientFlow() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  function generateActivationCode(length = 6) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    return result;
  }

  async function generateUniqueActivationCode() {
    let code = "";
    let exists = true;

    while (exists) {
      code = generateActivationCode();

      const { data, error } = await supabase
        .from("patients")
        .select("id")
        .eq("activation_code", code)
        .maybeSingle();

      if (error) throw error;
      exists = !!data;
    }

    return code;
  }

  async function handleCreatePatient() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) {
        setErrorMessage("Je bent niet ingelogd.");
        return;
      }

      if (!form.firstName.trim() || !form.lastName.trim() || !form.birthDate) {
        setErrorMessage("Vul alle verplichte velden in.");
        return;
      }

      const code = await generateUniqueActivationCode();

      const { error } = await supabase.from("patients").insert({
        kinesist_id: user.id,
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        birth_date: form.birthDate,
        goal: form.goal.trim() || null,
        activation_code: code,
      });

      if (error) throw error;

      setActivationCode(code);
      setStep(3);
    } catch (err) {
      console.error(err);
      setErrorMessage("Patiënt aanmaken is mislukt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="kineDash">
      <KineSidebar />

      <main className="flowMain">
        <button className="patientBack" onClick={() => (step === 1 ? navigate(-1) : prevStep())}>
          <img src="/images/back-icon.svg" alt="back" />
          Terug
        </button>

        <div className="stepBar">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`step ${step >= s ? "active" : ""}`} />
          ))}
        </div>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

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
              <h2>
                {form.firstName} {form.lastName}
              </h2>
              <p>{form.birthDate}</p>
              <p>{form.goal}</p>
            </div>

            <h4>Wat gebeurt er nu?</h4>
            <p>
              Na het bevestigen van alle gegevens wordt automatisch een activatiecode
              gegenereerd. Met deze code kunnen ouders het kinderprofiel veilig activeren.
            </p>

            <button className="btn-primary" onClick={handleCreatePatient} disabled={loading}>
              {loading ? "Toevoegen..." : "Patiënt toevoegen"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flowContent">
            <h1>Patiënt toegevoegd!</h1>
            <p>Deel deze activatiecode met de ouder(s):</p>

            <div className="codeBox">
              <img src="/images/copy.svg" alt="" />
              <p>{activationCode.slice(0, 3)}-{activationCode.slice(3, 6)}</p>
            </div>

            <p>Je kunt de activatiecode ook later terugvinden in het profiel van de patiënt.</p>

            <div className="instructions">
              <h4>Wat moeten de ouders doen?</h4>
              <ol>
                <li>Open het Nimbli portaal.</li>
                <li>Kies “Aanmelden met code”.</li>
                <li>
                  Voer de activatiecode{" "}
                  <span className="code">
                    {activationCode.slice(0, 3)}-{activationCode.slice(3, 6)}
                  </span>{" "}
                  in.
                </li>
              </ol>
            </div>

            <div className="share">
              <h4>Delen</h4>
              <div className="share-options">
                <button
                  className="btn-secondary"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      `${activationCode.slice(0, 3)}-${activationCode.slice(3, 6)}`
                    )
                  }
                >
                  <img src="/images/copy.svg" alt="" />
                  Kopieer code
                </button>

                <a
                  href={`mailto:?subject=Activatiecode voor Nimbli&body=Gebruik deze activatiecode om het profiel van ${form.firstName} te activeren in de Nimbli app: ${activationCode.slice(0, 3)}-${activationCode.slice(3, 6)}`}
                  className="btn-secondary"
                >
                  <img src="/images/mail.svg" alt="" />
                  E-mail
                </a>
              </div>
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