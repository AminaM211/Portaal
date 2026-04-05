import { NavLink } from "react-router-dom"
import "../assets/css/style.css"

export default function KineSidebar() {
  return (
    <aside className="kineSidebar">
      <div className="brand">
        <img className="brandLogo" src="/images/kinedash.svg" alt="Nimbli" />
      </div>

      <nav className="sideNav">
        <NavLink to="/kinesist" className="sideLink">
          <span className="icon">
            <img src="/images/dashboard.svg" alt="" />
          </span>
          Dashboard
        </NavLink>

        <NavLink to="/kinesist/oefeningen" className="sideLink">
          <span className="icon">
            <img src="/images/oef-icon.svg" alt="" />
          </span>
          Oefeningen
        </NavLink>

        <NavLink to="/kinesist/instellingen" className="sideLink">
          <span className="icon">
            <img src="/images/settings.svg" alt="" />
          </span>
          Instellingen
        </NavLink>
      </nav>
    </aside>
  )
}

