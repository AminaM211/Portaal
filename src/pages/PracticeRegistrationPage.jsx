import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../assets/css/practice-registration.css";

const initialPractice = {
  name: "",
  phone: "",
  email: "",
  country: "Belgie",
  street: "",
  number: "",
  postalCode: "",
  city: "",
};

const initialAccount = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

const plans = [
  {
    id: "starter",
    title: "Starter",
    price: "€0",
    suffix: "/ jaar",
    items: ["1 gebruiker", "Tot 3 patienten toevoegen en opvolgen", "Helemaal gratis"],
  },
  {
    id: "team",
    title: "Team",
    price: "Vanaf €250",
    suffix: "/ jaar",
    items: ["Voor praktijken tot 5 gebruikers", "Onbeperkte patienten", "Opzeggen wanneer je wilt"],
  },
];

export default function PracticeRegistrationPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [practice, setPractice] = useState(initialPractice);
  const [account, setAccount] = useState(initialAccount);
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function updatePractice(field, value) {
    setPractice((prev) => ({ ...prev, [field]: value }));
  }

  function updateAccount(field, value) {
    setAccount((prev) => ({ ...prev, [field]: value }));
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  function validatePractice() {
    if (!practice.name.trim()) return "Praktijknaam is verplicht.";
    if (!practice.phone.trim()) return "Telefoon is verplicht.";
    if (!isEmail(practice.email)) return "Vul een geldig praktijk e-mailadres in.";
    if (!practice.street.trim() || !practice.number.trim()) return "Straat en nummer zijn verplicht.";
    if (!practice.postalCode.trim() || !practice.city.trim()) return "Postcode en gemeente zijn verplicht.";
    if (!practice.country.trim()) return "Land is verplicht.";
    return "";
  }

  function validateAccount() {
    if (!account.firstName.trim() || !account.lastName.trim()) {
      return "Voornaam en achternaam zijn verplicht.";
    }

    if (!isEmail(account.email)) return "Vul een geldig e-mailadres in.";

    if (account.password.length < 6) {
      return "Kies een wachtwoord van minstens 6 tekens.";
    }

    return "";
  }

  function handleNext() {
    const validationMessage = step === 1 ? validatePractice() : validateAccount();

    setErrorMessage("");

    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setStep((prev) => prev + 1);
  }

  function handleBack() {
    setErrorMessage("");

    if (step === 1) {
      navigate("/");
      return;
    }

    setStep((prev) => prev - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (step < 3) {
      handleNext();
      return;
    }

    const practiceValidation = validatePractice();
    const accountValidation = validateAccount();

    if (practiceValidation || accountValidation) {
      setErrorMessage(practiceValidation || accountValidation);
      setStep(practiceValidation ? 1 : 2);
      return;
    }

    if (!plan) {
      setErrorMessage("");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const fullName = `${account.firstName.trim()} ${account.lastName.trim()}`.trim();

      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: account.email.trim(),
        password: account.password,
      });

      if (signupError) throw signupError;

      const user = signupData.user ?? signupData.session?.user;

      if (!user) {
        throw new Error("Account aangemaakt, maar de gebruiker kon niet geladen worden.");
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        role: "kinesist",
        plan,
        phone: practice.phone.trim(),
        email: account.email.trim(),
      });

      if (profileError) throw profileError;

      const { data: createdPractice, error: practiceError } = await supabase
        .from("practices")
        .insert({
          owner_id: user.id,
          name: practice.name.trim(),
          contact_first_name: account.firstName.trim(),
          contact_last_name: account.lastName.trim(),
          phone: practice.phone.trim(),
          email_general: practice.email.trim(),
          email_billing: practice.email.trim(),
          practice_country: practice.country.trim(),
          practice_street: practice.street.trim(),
          practice_number: practice.number.trim(),
          practice_postal_code: practice.postalCode.trim(),
          practice_city: practice.city.trim(),
          billing_same_as_practice: true,
          billing_name: practice.name.trim(),
          billing_country: practice.country.trim(),
          billing_street: practice.street.trim(),
          billing_number: practice.number.trim(),
          billing_postal_code: practice.postalCode.trim(),
          billing_city: practice.city.trim(),
        })
        .select("id")
        .single();

      if (practiceError) throw practiceError;

      const { error: memberError } = await supabase.from("practice_members").insert({
        practice_id: createdPractice.id,
        profile_id: user.id,
        role: "owner",
      });

      if (memberError) throw memberError;

      navigate("/kinesist/dashboard");
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error.message?.includes("already registered")
          ? "Er bestaat al een account met dit e-mailadres."
          : error.message || "Registreren is mislukt."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="practiceRegister">
      <header className="practiceRegisterHeader">
        <button type="button" className="practiceRegisterLogoBtn" onClick={() => navigate("/")}>
          <img src="/images/logo.png" alt="Nimbli" />
        </button>

        <div className="practiceRegisterLogin">
          <span>Heb je al een account?</span>
          <button type="button" className="practiceRegisterTopBtn" onClick={() => navigate("/")}>
            Log in
          </button>
        </div>
      </header>

      <main className="practiceRegisterMain">
        <button type="button" className="practiceRegisterBack" onClick={handleBack}>
          <img src="/images/back-icon.svg" alt="" />
          <span>Terug</span>
        </button>

        <div className="practiceRegisterStep">Stap {step} van 3</div>
        <div className="practiceRegisterProgress">
          <span className={step >= 1 ? "is-active" : ""} />
          <span className={step >= 2 ? "is-active" : ""} />
          <span className={step >= 3 ? "is-active" : ""} />
        </div>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <section className="practiceRegisterPanel">
              <h1>Praktijkgegevens</h1>

              <div className="practiceRegisterGrid">
                <label>
                  Praktijknaam
                  <input value={practice.name} onChange={(e) => updatePractice("name", e.target.value)} />
                </label>
                <label>
                  Telefoon
                  <input value={practice.phone} onChange={(e) => updatePractice("phone", e.target.value)} />
                </label>
                <label>
                  E-mail
                  <input type="email" value={practice.email} onChange={(e) => updatePractice("email", e.target.value)} />
                </label>
              </div>

              <h2>Adres praktijk</h2>

              <div className="practiceRegisterGrid address">
                <label>
                  Straat
                  <input value={practice.street} onChange={(e) => updatePractice("street", e.target.value)} />
                </label>
                <label>
                  Nr.
                  <input value={practice.number} onChange={(e) => updatePractice("number", e.target.value)} />
                </label>
                <label>
                  Postcode
                  <input value={practice.postalCode} onChange={(e) => updatePractice("postalCode", e.target.value)} />
                </label>
                <label>
                  Gemeente
                  <input value={practice.city} onChange={(e) => updatePractice("city", e.target.value)} />
                </label>
                <label>
                  Land
                  <input value={practice.country} onChange={(e) => updatePractice("country", e.target.value)} />
                </label>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="practiceRegisterPanel narrow">
              <h1>Account aanmaken</h1>

              <div className="practiceRegisterGrid">
                <label>
                  Voornaam
                  <input value={account.firstName} onChange={(e) => updateAccount("firstName", e.target.value)} />
                </label>
                <label>
                  Achternaam
                  <input value={account.lastName} onChange={(e) => updateAccount("lastName", e.target.value)} />
                </label>
                <label>
                  E-mail
                  <input type="email" value={account.email} onChange={(e) => updateAccount("email", e.target.value)} />
                </label>
                <label>
                  Wachtwoord
                  <input type="password" value={account.password} onChange={(e) => updateAccount("password", e.target.value)} />
                </label>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="practiceRegisterPanel">
              <h1>Kies je plan</h1>

              <div className="practicePlanGrid">
                {plans.map((planOption) => (
                  <button
                    key={planOption.id}
                    type="button"
                    className={`practicePlanCard ${plan === planOption.id ? "is-selected" : ""}`}
                    onClick={() => setPlan(planOption.id)}
                  >
                    <span className="practicePlanTitle">{planOption.title}</span>
                    <span className="practicePlanPrice">
                      <strong>{planOption.price}</strong> {planOption.suffix}
                    </span>
                    <ul>
                      {planOption.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </section>
          )}

          {errorMessage && <p className="practiceRegisterError">{errorMessage}</p>}

          <div className="practiceRegisterActions">
            {step < 3 ? (
              <button type="button" className="practiceRegisterPrimary" onClick={handleNext}>
                Volgende
              </button>
            ) : (
              <button type="submit" className="practiceRegisterPrimary" disabled={loading}>
                {loading ? "Account maken..." : plan ? "Account aanmaken" : "Kies een plan"}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
