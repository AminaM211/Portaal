import { NavLink } from "react-router-dom";

export default function KineSidebar({ onLogout }) {
  return (
    <>
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

          <NavLink
            to="/kinesist/instellingen"
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

      <nav className="mobileBottomNav" aria-label="Kinesist navigatie">
        <NavLink
          to="/kinesist/dashboard"
          className={({ isActive }) => `mobileBottomNavLink ${isActive ? "is-active" : ""}`}
        >
          <img src="/images/sidebar-dashboard.svg" alt="" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/kinesist/oefeningen"
          className={({ isActive }) => `mobileBottomNavLink ${isActive ? "is-active" : ""}`}
        >
          <img src="/images/sidebar-oefeningen.svg" alt="" />
          <span>Oefeningen</span>
        </NavLink>

        <NavLink
          to="/kinesist/instellingen"
          className={({ isActive }) => `mobileBottomNavLink ${isActive ? "is-active" : ""}`}
        >
          <img src="/images/sidebar-instellingen.svg" alt="" />
          <span>Instellingen</span>
        </NavLink>
      </nav>
    </>
  );
}