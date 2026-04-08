import { NavLink } from "react-router-dom";

export default function KineSidebar({ onLogout }) {
  return (
    <aside className="kineSidebar">
      <div className="kineSidebarBrand">
        <img src="/images/kine-logo-full.png" alt="Nimbli kinesistendashboard" />
      </div>

      <nav className="kineSidebarNav">
        <NavLink
          to="/kinesist/dashboard"
          className={({ isActive }) =>
            `kineSidebarLink ${isActive ? "is-active" : ""}`
          }
        >
          <img src="/images/sidebar-dashboard.svg" alt="" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/kinesist/oefeningen"
          className={({ isActive }) =>
            `kineSidebarLink ${isActive ? "is-active" : ""}`
          }
        >
          <img src="/images/sidebar-oefeningen.svg" alt="" />
          <span>Oefeningen</span>
        </NavLink>

        <button type="button" className="kineSidebarLink">
          <img src="/images/sidebar-settings.svg" alt="" />
          <span>Instellingen</span>
        </button>
      </nav>

      <button type="button" className="kineSidebarLogout" onClick={onLogout}>
        <img src="/images/sidebar-logout.svg" alt="" />
      </button>
    </aside>
  );
}