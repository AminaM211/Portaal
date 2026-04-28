import { NavLink } from "react-router-dom";

export default function ParentSidebar({ onLogout }) {
  return (
    <aside className="kineSidebar">
      <div className="kineSidebarBrand">
        <img src="/images/logo-parent.svg" alt="Nimbli parentendashboard" />
      </div>

      <nav className="kineSidebarNav">
        <NavLink
          to="/ouder/dashboard"
          className={({ isActive }) =>
            `kineSidebarLink ${isActive ? "is-active" : ""}`
          }
        >
          <img src="/images/sidebar-dashboard.svg" alt="" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/ouder/oefenplanning"
          className={({ isActive }) =>
            `kineSidebarLink ${isActive ? "is-active" : ""}`
          }
        >
          <img src="/images/sidebar-oefeningen.svg" alt="" />
          <span>Oefenplanning</span>
        </NavLink>

        <NavLink
          to="/ouder/instellingen"
          className={({ isActive }) =>
            `kineSidebarLink ${isActive ? "is-active" : ""}`
          }
        >
          <img src="/images/sidebar-instellingen.svg" alt="" />
          <span>Instellingen</span>
        </NavLink>
      </nav>

      <button type="button" className="kineSidebarLogout" onClick={onLogout}>
        <img src="/images/sidebar-logout.svg" alt="" />
      </button>
    </aside>
  );
}