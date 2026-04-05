import "./assets/css/HomeScreen.css";

function HomeScreen() {
  return (
    <div className="page">
      <div className="shell">
        <div className="left">
          <h1>Samen sterk in thuisrevalidatie.</h1>
          <p className="subtitle">
            Log in of meld je aan met een code die je van de kinesist hebt gekregen.
          </p>

          <form className="form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Email" />
            <input type="password" placeholder="Wachtwoord" />

            <label className="remember">
              <input type="checkbox" />
              <span>Onthoudd mij.</span>
            </label>

            <button className="btn btn-primary" type="submit">
              Inloggen
            </button>

            <button className="btn btn-secondary" type="button">
              Aanmelden met code
            </button>

            <a className="link" href="#">
              Wachtwoord vergeten? Klik hier
            </a>
          </form>

          <div className="Registreren">
        <p className="account" href="#">
              Nog geen account?
          </p>
        <button className="btn btn-secondary" type="button">
              Registreer je praktijk
          </button>
        </div>
        </div>


        <div className="right">
          <img src="/images/hero-img.png" alt="Hero" className="hero-image" />
        </div>
      </div>

      <footer className="footer">
        <a href="#">Privacy</a>
        <a href="#">Gebruiksvoorwaarden</a>
      </footer>
    </div>
  );
}
  
  export default HomeScreen