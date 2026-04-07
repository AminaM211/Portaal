import { NavLink } from "react-router-dom";

export default function ChildSidebar({ onLogout }) {
  return (
    <aside className="ChildSidebar">
      <div className="ChildSidebarBrand">
        <img src="/images/Child-logo-full.png" alt="Nimbli Childscreen" />
      </div>

      <nav className="ChildSidebarNav">
        <NavLink to="/Childscreen/oefeningen" className="ChildSidebarLink is-active">
          <img src="/images/sidebar-oefeningen.svg" alt="" />
          <span>Dashboard</span>
        </NavLink>

        <button type="button" className="ChildSidebarLink">
          <img src="/images/sidebar-missions.svg" alt="" />
          <span>Oefeningen</span>
        </button>

        <button type="button" className="ChildSidebarLink">
          <img src="/images/sidebar-profile.svg" alt="" />
          <span>Instellingen</span>
        </button>
      </nav>

      <button type="button" className="ChildSidebarLogout" onClick={onLogout}>
        <img src="/images/sidebar-logout.svg" alt="" />
      </button>
    </aside>
  );
}