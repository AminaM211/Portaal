import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ChildSidebar from "../components/ChildSidebar";
import "../assets/css/child-dashboard.css";

const LINK_COLUMN = "parent_user_id";

// --- Helper Functies ---
function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekDates() {
  const today = new Date();
  const weekday = (today.getDay() + 6) % 7; // Maandag als start
  const monday = new Date(today);
  monday.setDate(today.getDate() - weekday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeekdayLabel(i) {
  return ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"][i];
}

function getShortWeekdayLabel(i) {
  return ["M", "D", "W", "D", "V", "Z", "Z"][i];
}

export default function ChildScreen() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [scheduledExercises, setScheduledExercises] = useState([]);
  const [patient, setPatient] = useState(null);
  const [missions, setMissions] = useState([]);

  const todayDate = new Date();
  const todayKey = formatDateKey(todayDate);

  // --- 1. DATA INITIALISATIE ---
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/"); return; }

        const activePatientId = localStorage.getItem("selectedPatientId");
        let query = supabase.from("patients").select("*").eq(LINK_COLUMN, user.id).eq("is_archived", false);
        if (activePatientId) query = query.eq("id", activePatientId);

        const { data: patientData, error: patientError } = await query.limit(1).maybeSingle();
        if (patientError || !patientData) return;

        setPatient(patientData);

        // Oefeningen ophalen
        const { data: ex } = await supabase
          .from("patient_exercises")
          .select("id, scheduled_date, is_completed")
          .eq("patient_id", patientData.id);
        setScheduledExercises(ex || []);

        // Missies ophalen
        const { data: allMissions } = await supabase
          .from("patient_missions")
          .select(`*, missions (*)`)
          .eq("patient_id", patientData.id);

        if (allMissions) {
          const todaysMissions = allMissions.filter(m => m.assigned_date === todayKey);
          setMissions(todaysMissions);
        }
      } catch (err) {
        console.error("INIT ERROR:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [navigate, todayKey]);

  // --- 2. AFGELEIDE STATE (MEMO'S) ---
  const weekDates = useMemo(() => getWeekDates(), []);

  // De berekening voor het weekoverzicht (rechterkant)
  const weekStatus = useMemo(() => {
    return weekDates.map((date) => {
      const key = formatDateKey(date);
      const items = scheduledExercises.filter((item) => item.scheduled_date === key);
      const isToday = key === todayKey;
      const completedCount = items.filter((item) => item.is_completed).length;
      const isDone = items.length > 0 && completedCount === items.length;

      if (isDone) return { key, type: "done" };
      if (isToday) return { key, type: "today" };
      
      const isSunday = date.getDay() === 0;
      if (isSunday) return { key, type: "sunday" };
      if (items.length === 0) return { key, type: "empty" };

      const isPast = key < todayKey;
      return { key, type: isPast ? "missed" : "pending" };
    });
  }, [weekDates, scheduledExercises, todayKey]);

  // De berekening voor het pad (midden)
  const weekData = useMemo(() => {
    return weekDates.map((date, i) => {
      const key = formatDateKey(date);
      const isToday = key === todayKey;
      const isPast = key < todayKey;
      const itemsForDay = scheduledExercises.filter(e => e.scheduled_date === key);
      const isDone = itemsForDay.length > 0 && itemsForDay.every(e => e.is_completed);

      let pathState = "locked"; 
      if (isDone) pathState = "done";
      else if (isToday) pathState = "current";
      else if (key > todayKey) pathState = "moon";

      return {
        key,
        longLabel: isToday ? "VANDAAG" : getWeekdayLabel(i),
        pathState,
      };
    });
  }, [weekDates, scheduledExercises, todayKey]);

  const stats = useMemo(() => {
    const todayItems = scheduledExercises.filter(e => e.scheduled_date === todayKey);
    const totalCompleted = scheduledExercises.filter(e => e.is_completed).length;
    const completedDates = Array.from(new Set(scheduledExercises.filter(e => e.is_completed).map(e => e.scheduled_date)));

    let streak = 0;
    const cursor = new Date();
    while (true) {
      const key = formatDateKey(cursor);
      if (completedDates.includes(key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    return { 
      trophies: Math.floor(totalCompleted / 5), 
      totalCompleted, 
      streak 
    };
  }, [scheduledExercises, todayKey]);

  // --- 3. AUTO UPDATE MISSIONS IN DATABASE ---
  useEffect(() => {
    if (!missions.length || loading) return;

    const completedToday = scheduledExercises.filter(
      (e) => e.scheduled_date === todayKey && e.is_completed
    ).length;

    async function syncMissions() {
      for (const m of missions) {
        let progress = 0;
        if (m.missions?.type === "complete_exercise") progress = completedToday;
        if (m.missions?.type === "xp") progress = completedToday * 10;
        
        // Voorkom onnodige updates als de progress hetzelfde is
        if (m.progress === progress) continue;

        const done = progress >= (m.missions?.target || 1);
        await supabase
          .from("patient_missions")
          .update({ progress, is_completed: done })
          .eq("id", m.id);
      }
    }
    syncMissions();
  }, [scheduledExercises, missions, todayKey, loading]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  if (loading) return <div className="loading">Laden...</div>;

  return (
    <div className="childApp">
      <ChildSidebar onLogout={handleLogout} />

      <main className="childPathArea">
         <div className="pathWrapper">
           <svg className="pathSvg" viewBox="0 0 500 1200" preserveAspectRatio="xMidYMid meet">
             <path d="M 250 100 C 450 100, 450 300, 250 300 C 50 300, 50 500, 250 500 C 450 500, 450 700, 250 700 C 50 700, 50 900, 250 900 C 450 900, 450 1100, 250 1100" 
                   fill="transparent" stroke="#F4EFE6" strokeWidth="40" strokeLinecap="round" />
           </svg>
           
           <div className="pathNodesContainer">
             {weekData.slice(0, 6).map((day, i) => (
               <div key={day.key} className={`pathBubbleWrap pos-${i}`}>
                 <div className={`pathBubble ${day.pathState}`}>
                   {day.pathState === "done" && <img src="/images/check-white.svg" alt="✓" />}
                   {day.pathState === "current" && <img src="/images/star-white.svg" alt="⭐" />}
                   {day.pathState === "locked" && <img src="/images/lock-grey.svg" alt="🔒"/>}
                   {day.pathState === "moon" && <img src="/images/moon-white.svg" alt="🌙"/>}
                 </div>
                 <span className="bubbleLabel">{day.longLabel}</span>
               </div>
             ))}
             <h2 className="monthOverlay">{todayDate.toLocaleString('nl-NL', { month: 'long' })}</h2>
           </div>
         </div>
      </main>

      <aside className="childRightPanel">
        <div className="childTopStatsRow">
          <div className="childStatItem">
            <div className="childStatIcon trophy"><img src="/images/wins-stat.png" alt="" /></div>
            <span className="childStatNumber">{stats.trophies}</span>
          </div>
          <div className="childStatItem">
            <div className="childStatIcon star"><img src="/images/xp-stat.png" alt="" /></div>
            <span className="childStatNumber">{stats.totalCompleted}</span>
          </div>
          <div className="childStatItem">
            <div className="childStatIcon lightning"><img src="/images/streak-stat.png" alt="" /></div>
            <span className="childStatNumber">{stats.streak}</span>
          </div>
        </div>

        <div className="parentWeekCard">
          <h2>Weekoverzicht</h2>
          <div className="parentWeekRow">
            {weekStatus.map((item, index) => (
              <div key={item.key} className="parentWeekDay">
                <div className={`weekCircle ${item.type}`}>
                  {item.type === "done" && <img src="/images/check-weekoverzicht.svg" alt="Done" />}
                  {item.type === "missed" && <img src="/images/cross-weekoverzicht.svg" alt="missed" />}
                  {item.type === "today" && <img src="/images/target.svg" alt="today" />}
                  {item.type === "sunday" && <img src="/images/present-streakday.svg" alt="Present" />}
                </div>
                <span>{getWeekdayLabel(index)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="parentSideSection">
          <h3>Dagmissies</h3>
          <div className="dagmissiesList">
            {missions.length === 0 && (
               <p style={{color: "#888", fontSize: "14px"}}>Geen missies gevonden voor vandaag.</p>
            )}
            {missions.map((m) => {
              const target = m.missions?.target || 1;
              const pct = Math.min(100, Math.round((m.progress / target) * 100));
              return (
                <div key={m.id} className={`dagmissieCard ${m.is_completed ? 'done' : ''}`}>
                  <div className="missieIconCircle" style={{ background: m.is_completed ? "#2DC07F" : "#E5E7EB", color: m.is_completed ? "white" : "transparent" }}>
                    {m.is_completed ? "✓" : "•"}
                  </div>
                  <div className="missieInfoText">
                    <h4>{m.missions?.title || "Onbekende missie"}</h4>
                    <div className="missieProgressRow">
                      <span>{m.progress}/{target}</span>
                      <div className="missieBarTrack">
                        <div className="missieBarFill" style={{ width: `${pct}%`, background: m.is_completed ? "#2DC07F" : "#F8AE49" }} />
                      </div>
                    </div>
                  </div>
                  <div className="missieChestIcon" style={{fontSize: "24px"}}>
                    {m.is_completed ? "📦" : "🧰"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}