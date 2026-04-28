import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../assets/css/parent-activation.css";

export default function ParentActivationFlow() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);

  const [matchedPatient, setMatchedPatient] = useState(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (step === 1 && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [step]);

  function normalizedCode() {
    return codeDigits.join("").toUpperCase();
  }

  function handleDigitChange(index, value) {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);

    setCodeDigits((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });

    if (cleaned && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  async function handleVerifyCode() {
    try {
      setLoading(true);
      setErrorMessage("");

      const code = normalizedCode();

      if (code.length !== 6) {
        setErrorMessage("Vul een geldige activatiecode in.");
        return;
      }

      const { data, error } = await supabase.rpc("verify_activation_code", {
        input_code: code,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setErrorMessage("Deze code is ongeldig.");
        return;
      }

      setMatchedPatient(data[0]);
      setStep(2);
    } catch (error) {
      console.error(error);
      setErrorMessage("Code controleren is mislukt.");
    } finally {
      setLoading(false);
    }
  }

// ...existing code...
async function handleCreateParentAccount() {
  try {
    setLoading(true);
    setErrorMessage("");

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage("Vul alle velden in.");
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage("Je moet akkoord gaan met de voorwaarden.");
      return;
    }

    let user = null;

    // 1. Probeer eerst een account aan te maken
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      // Als de error zegt dat de user al bestaat, probeer dan in te loggen
      if (error.message.includes("already registered") || error.status === 422) {
        console.log("User bestaat al → probeer login");

        const { data: loginData, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (loginError) {
          throw new Error("Inloggen met bestaand account mislukt: " + loginError.message);
        }
        user = loginData.user;
      } else {
        throw error;
      }
    } else {
      user = data.user ?? data.session?.user;
    }

    if (!user) {
      throw new Error("Account aangemaakt, maar geen user teruggekregen.");
    }

// 2. Sla de naam in de profiles tabel op
const { error: profileError } = await supabase.from("profiles").upsert({
  id: user.id,
  full_name: fullName.trim(),
  role: "ouder", // Zorg dat het profiel als "ouder" gemarkeerd is
});

if (profileError) throw profileError;

// 3. Koppel de user aan de patiënt, markeer de code als gebruikt, vul info aan

    // 3. Koppel de user aan de patiënt via een veilige database-functie
    const { data: updatedPatient, error: linkError } = await supabase.rpc(
      "link_parent_to_patient",
      {
        p_patient_id: matchedPatient.id,
        p_parent_user_id: user.id,
        p_parent_name: fullName.trim(),
        p_parent_email: email.trim(),
      }
    );

    if (linkError) throw linkError;

    if (!updatedPatient) {
      throw new Error("Kon de patiënt niet updaten. De database gaf geen resultaat terug.");
    }

    setStep(3);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="parentAuthPage">
      <header className="parentAuthHeader">
        <img src="/images/logo.png" alt="nimbli" className="parentAuthLogo" />

        {step !== 3 ? (
          <div className="parentAuthLoginBlock">
            <span>Heb je al een account?</span>
            <button type="button" className="parentAuthTopBtn" onClick={() => navigate("/")}>
              Log in
            </button>
          </div>
        ) : (
          <button type="button" className="parentAuthTopBtn outline" onClick={handleLogout}>
            Uitloggen
          </button>
        )}
      </header>

      {errorMessage && <p className="parentAuthError">{errorMessage}</p>}

      {step === 1 && (
        <main className="parentAuthContent codeStep">
          <button type="button" className="parentBackBtn" onClick={() => navigate(-1)}>
            <img src="/images/back-icon.svg" alt="" />
            <span>Terug</span>
          </button>

          <section className="parentAuthLeft">
            <h1>Voer je activatiecode in:</h1>
            <p>
              Je krijgt enkel toegang tot het portaal met een code
              <br />
              van je kinesist.
            </p>

            <div className="activationCodeRow">
              {codeDigits.slice(0, 3).map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputsRef.current[index] = el)}
                  className="activationDigit"
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  maxLength={1}
                />
              ))}

              <span className="activationDash">—</span>

              {codeDigits.slice(3, 6).map((digit, index) => {
                const realIndex = index + 3;
                return (
                  <input
                    key={realIndex}
                    ref={(el) => (inputsRef.current[realIndex] = el)}
                    className="activationDigit"
                    value={digit}
                    onChange={(e) => handleDigitChange(realIndex, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(realIndex, e)}
                    maxLength={1}
                  />
                );
              })}
            </div>

            <button
              type="button"
              className="parentPrimaryBtn"
              onClick={handleVerifyCode}
              disabled={loading}
            >
              {loading ? "Controleren..." : "Doorgaan"}
            </button>
          </section>
        </main>
      )}

      {step === 2 && (
        <main className="parentAuthContent signupStep">
          <button type="button" className="parentBackBtn" onClick={() => setStep(1)}>
            <img src="/images/back-icon.svg" alt="" />
            <span>Terug</span>
          </button>

          <section className="parentAuthLeft">
            <h1>Maak een account aan</h1>
            <p>
              We hebben je code herkend! Je kinesist gebruikt
              <br />
              nimbli om de oefeningen van je kind op te volgen.
            </p>

            <div className="parentForm">
              <input
                type="text"
                placeholder="Voor- en achternaam van de ouder"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Wachtwoord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <label className="parentCheckbox">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span>
                  Ik ga akkoord met de <strong>gebruiksvoorwaarden</strong> en
                  <br />
                  <strong>privacy overeenkomsten.</strong>
                </span>
              </label>

              <button
                type="button"
                className="parentPrimaryBtn"
                onClick={handleCreateParentAccount}
                disabled={loading}
              >
                {loading ? "Aanmaken..." : "Aanmelden"}
              </button>
            </div>
          </section>

          <section className="parentAuthIllustration">
            <img src="/images/parent-signup-visual.png" alt="" />
          </section>
        </main>
      )}

      {step === 3 && (
        <main className="parentProfilePick">
          <h1>Tik jouw profiel aan!</h1>

          <div className="profileCards">
            <button
              type="button"
              className="profileCard"
              onClick={() => navigate("/kind/oefeningen")}
            >
              <img src="/images/avatar.svg" alt="" />
              <span>Kind</span>
            </button>

            <button
              type="button"
              className="profileCard"
              onClick={() => navigate("/ouder/dashboard")}
            >
              <img src="/images/avatar.svg" alt="" />
              <span>Ouderdashboard</span>
            </button>
          </div>
        </main>
      )}

      <footer className="parentAuthFooter">
        <button type="button">Privacy</button>
        <button type="button">Gebruiksvoorwaarden</button>
      </footer>
    </div>
  );
}