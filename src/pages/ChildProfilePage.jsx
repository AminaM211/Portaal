import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ChildSidebar from "../components/ChildSidebar";
import ChildStatsRow from "../components/ChildStatsRow";
import ChildMissionCard from "../components/ChildMissionCard";
import WeekStreak from "../components/WeekStreak";
import {
  formatDateKey,
  normalizeDateKey,
  getExerciseXp,
  getConsecutiveDayStreak,
  getHoursUntilReset,
} from "../utils/childDashboard";
import "../assets/css/child-profile.css";

const LINK_COLUMN = "parent_user_id";

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function getAvatarColor(index) {
  const colors = ["#8BB8E8", "#A98BE8", "#E4AE87", "#DB85DA", "#86D4E0", "#E58C8C", "#8EA2EA"];
  return colors[index % colors.length];
}

export default function ChildProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [scheduledExercises, setScheduledExercises] = useState([]);
  const [missions, setMissions] = useState([]);

  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  async function handleChangeProfile() {
    navigate("/ouder/profielselectie");
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/");
          return;
        }

        const activePatientId = localStorage.getItem("selectedPatientId");
        let query = supabase
          .from("patients")
          .select("*")
          .eq(LINK_COLUMN, user.id)
          .eq("is_archived", false);

        if (activePatientId) query = query.eq("id", activePatientId);

        const { data: patientData } = await query.limit(1).maybeSingle();
        if (!patientData) return;

        setPatient(patientData);

        const { data: ex } = await supabase
          .from("patient_exercises")
          .select("id, scheduled_date, is_completed, exercises(id, title, duration_minutes, xp_reward)")
          .eq("patient_id", patientData.id);

        setScheduledExercises(ex || []);

        // Fetch missions
        const { data: allMissions } = await supabase
          .from("patient_missions")
          .select("id, patient_id, mission_id, progress, is_completed, assigned_date, missions(title, type, target, xp_reward)")
          .eq("patient_id", patientData.id)
          .order("assigned_date", { ascending: false });

        setMissions(allMissions || []);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [navigate]);

  if (loading) {
    return (
      <div className="childApp">
        <ChildSidebar onLogout={handleLogout} />
        <main className="childPathArea">
          <div className="kineDashLoading">
            <img src="/images/monkey-load.png" style={{ width: "100px"}} alt="" />
            <p>laden . . .</p>
          </div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="childApp">
        <ChildSidebar onLogout={handleLogout} />
        <main className="childPathArea">
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            <p>Patiënt niet gevonden.</p>
          </div>
        </main>
      </div>
    );
  }

  const totalCompleted = scheduledExercises.filter((item) => item.is_completed).length;
  const completedTodayExercises = scheduledExercises.filter(
    (item) => normalizeDateKey(item.scheduled_date) === todayKey && item.is_completed
  );
  const completedTodayXp = completedTodayExercises.reduce((total, item) => total + getExerciseXp(item), 0);
  const currentStreak = getConsecutiveDayStreak(scheduledExercises);
  const hoursUntilReset = getHoursUntilReset();

  const dashboardStats = [
    { label: "Patiënten", value: Math.floor(totalCompleted / 5), icon: "/images/troffee.svg", background: "#F8AE49" },
    { label: "Trofeeën", value: totalCompleted, icon: "/images/star-blue.svg", background: "#84C5ED" },
    { label: "Streak", value: currentStreak, icon: "/images/streak.svg", background: "#B388FF" },
  ];

  const rightPanelStats = [
    { label: "Patiënten", value: Math.floor(totalCompleted / 5), icon: "/images/wins-stat.png", background: "#F8AE49" },
    { label: "XP", value: completedTodayXp, icon: "/images/xp-stat.png", background: "#84C5ED" },
    { label: "Streak", value: currentStreak, icon: "/images/streak-stat.png", background: "#B388FF" },
  ];

  const previewMissions = missions.slice(0, 3);

  return (
    <div className="childApp">
      <ChildSidebar onLogout={handleLogout} />

      <main className="childProfilePage">
        <div className="childProfileSection">
          {/* Profile Card with Mascot */}
          <div className="childProfileCardLarge">
            <div className="childProfileCardHeader">
              <h2 className="childProfileName">{patient.name}</h2>
              <p className="childProfileGoal">{patient.goal || "Geen doel ingesteld"}</p>
            </div>
            
            {/* Mascot Image */}
            <div className="childProfileMascot">
              <img src="/images/monkey-avatar.png" alt="avatar" />
            </div>
        </div>

            <div className="childProfileStatsRow">
              {dashboardStats.map((stat, idx) => (
                <div key={idx} className="childStatItemRow">
                  <img src={stat.icon} alt={stat.label} className="childStatRowIcon" />
                  <span className="childStatRowValue">{stat.value}</span>
                </div>
              ))}
            </div>

            {/* Trophies */}
            <div className="childProfileTrophies">
              <div className="childProfileTrophiesHeader">
                <h3>Gewonnen trofeeën</h3>
                <a href="#" className="childTrophiesLink">Zie alle</a>
              </div>
              <div className="childTrophiesList">
                {[
                  { icon: "⭐", name: "7 dagen streak", desc: "Voltooi 7 dagen achtereen" },
                  { icon: "👆", name: "Eerste stap", desc: "Voer je eerste oefening uit" },
                  { icon: "🏃", name: "Beweging!", desc: "Voltooi 20 oefeningen" },
                ].map((trophy, idx) => (
                  <div key={idx} className="childTrophyCard">
                    <div className="childTrophyIcon">{trophy.icon}</div>
                    <p className="childTrophyName">{trophy.name}</p>
                    <p className="childTrophyDesc">{trophy.desc}</p>
                  </div>
                ))}
              </div>
            
          </div>
        </div>

        {/* Right Section (like ChildScreen right panel) */}
        <aside className="childRightPanel">
          <WeekStreak scheduledExercises={scheduledExercises} />
          <div className="parentSideSection">
            <div className="dagmissiesHeader" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 style={{ margin: 0 }}>Dagmissies</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F05D5E', fontWeight: 700, fontSize: '13px' }}>
                  <img src="/images/Clock.svg" alt="" style={{ width: '16px', height: '16px' }} />
                  <span>{hoursUntilReset} UUR</span>
                </div>
              </div>
              <Link to="/kind/missies" className="seeAllLink">Zie alle</Link>
            </div>
            <div className="dagmissiesList">
              {previewMissions.length === 0 ? (
                <p style={{color: "#888", fontSize: "14px"}}>Geen missies beschikbaar.</p>
              ) : (
                previewMissions.map((m) => (
                  <ChildMissionCard key={m.id} mission={m} />
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="childProfileActions">
            <button
              className="btn-primary-large full"
              onClick={handleChangeProfile}
            >
              Verander van profiel
            </button>
            <button
              className="btn-outline-large full"
              onClick={handleLogout}
            >
              Log uit
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
