import { NavLink } from "react-router-dom"
import "../assets/css/style.css"

export default function KineSidebar() {
  return (
    <aside className="kineSidebar">
      <div className="brand">
        <img className="brandLogo" src="/images/logo.png" alt="Nimbli" />
      </div>

      <nav className="sideNav">
        <NavLink to="/kind" className="sideLink">
          <span className="icon">
            <img src="/images/kindoef-icon.svg" alt="" />
          </span>
          Oefeningen
        </NavLink>

        <NavLink to="/kinesist/missions" className="sideLink">
          <span className="icon">
            <img src="/images/mission-icon.svg" alt="" />
          </span>
          Daily missions
        </NavLink>

        <NavLink to="/kinesist/profiel" className="sideLink">
          <span className="icon">
            <img src="/images/profile-icon.svg" alt="" />
          </span>
          Profiel
        </NavLink>
      </nav>
    </aside>
  )
}

