import { NavLink } from "react-router-dom";

export default function ChildSidebar({ onLogout }) {
  return (
    <>
      <aside className="kineSidebar">
        <div className="ChildSidebarBrand">
          <img src="/images/logo.png" alt="Nimbli parentendashboard" />
        </div>

        <nav className="kineSidebarNav">
          <NavLink
            to="/kind/oefeningen"
            className={({ isActive }) =>
              `kineSidebarLink ${isActive ? "is-active" : ""}`
            }
          >
            <img src="/images/oefeningen-dash.svg" alt="" />
            <span>Oefeningen</span>
          </NavLink>

          <NavLink
            to="/kind/missies"
            className={({ isActive }) =>
              `kineSidebarLink ${isActive ? "is-active" : ""}`
            }
          >
            <img src="/images/missions-dash.svg" alt="" />
            <span>Missions</span>
          </NavLink>

          <NavLink
            to="/kind/profiel"
            className={({ isActive }) =>
              `kineSidebarLink ${isActive ? "is-active" : ""}`
            }
          >
            <img src="/images/profiel-dash.svg" alt="" />
            <span>Profiel</span>
          </NavLink>
        </nav>

        <button type="button" className="kineSidebarLogout" onClick={onLogout}>
          <img src="/images/sidebar-logout.svg" alt="" />
        </button>
      </aside>

      <nav className="mobileBottomNav" aria-label="Kind navigatie">
        <NavLink
          to="/kind/oefeningen"
          className={({ isActive }) => `mobileBottomNavLink ${isActive ? "is-active" : ""}`}
        >
          <img src="/images/oefeningen-dash.svg" alt="" />
          <span>Oefeningen</span>
        </NavLink>

        <NavLink
          to="/kind/missies"
          className={({ isActive }) => `mobileBottomNavLink ${isActive ? "is-active" : ""}`}
        >
          <img src="/images/missions-dash.svg" alt="" />
          <span>Missies</span>
        </NavLink>

        <NavLink
          to="/kind/profiel"
          className={({ isActive }) => `mobileBottomNavLink ${isActive ? "is-active" : ""}`}
        >
          <img src="/images/profiel-dash.svg" alt="" />
          <span>Profiel</span>
        </NavLink>
      </nav>
    </>
  );
}