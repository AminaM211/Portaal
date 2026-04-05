import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../assets/css/login.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError("E-mailadres of wachtwoord klopt niet.");
      return;
    }

    const user = data.user;
    if (!user) {
      setError("Gebruiker niet gevonden.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setError("Profiel niet gevonden.");
      return;
    }

    if (remember) {
      localStorage.setItem("nimbli_remember_email", email);
    } else {
      localStorage.removeItem("nimbli_remember_email");
    }

    if (profile.role === "kinesist") {
      navigate("/kinesist/dashboard");
      return;
    }

    if (profile.role === "ouder") {
      navigate("/ouder/dashboard");
      return;
    }

    setError("Onbekende gebruikersrol.");
  }
  return (
    <div className="login">
      {/* HEADER */}
      <header className="login-header">
        <img src="/images/logo.png" className="logo" />

        <div className="header-right">
          <span>Praktijk nog niet geregistreerd?</span>
          <a
            href="https://jouwdomein.be"
            className="btn-primary"
            target="_blank"
            rel="noreferrer"
            >
            Start gratis
            </a>
        </div>
      </header>

      {/* MAIN */}
      <main className="login-main">
        {/* LEFT */}
        <div className="login-left">
          <h1>Log in</h1>
          <p>
            De centrale omgeving voor kinesisten,
            <br />
            ouders en kinderen.
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Wachtwoord"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <label className="checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Onthoud mij.</span>
            </label>

            {error && <div className="error">{error}</div>}

            <button className="btn-primary full">
              Inloggen
            </button>

            <a className="forgot">Wachtwoord vergeten?</a>
          </form>

          <div className="code-section">
            <p>Heb je een code gekregen van je kinesist?</p>

            <button className="btn-outline">
              Aanmelden met code
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="login-right">
          <img
            src="/images/hero.png"
            className="visual"
          />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="login-footer">
        <a>Privacy</a>
        <a>Gebruiksvoorwaarden</a>
      </footer>
    </div>
  );
}