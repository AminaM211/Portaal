
import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import "../assets/css/child-dashboard.css";

const LINK_COLUMN = "parent_user_id";

// NIEUW: Genereer 28 dagen (vorige week + deze week + 2 weken vooruit)
function getPathDates() {
  const today = new Date();
  const weekday = (today.getDay() + 6) % 7; 
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - weekday);
  currentMonday.setHours(0, 0, 0, 0);

  // Pak de maandag van VORIGE week
  const startDay = new Date(currentMonday);
  startDay.setDate(currentMonday.getDate() - 7); 

    return Array.from({ length: 28 }).map((_, index) => {
    const d = new Date(startDay);
      d.setDate(startDay.getDate() + index);
    return d;
  });
}

export default function ChildScreen() {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [loading, setLoading] = useState(true);
  const [scheduledExercises, setScheduledExercises] = useState([]);
  const [missions, setMissions] = useState([]);
  const [activePatientId, setActivePatientId] = useState(null);

  const [selectedDay, setSelectedDay] = useState(null);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  const todayDate = new Date();
  const todayKey = formatDateKey(todayDate);

  const scrollRef = useRef(null);

  async function refetchScheduledExercises(patientId) {
    const { data: ex } = await supabase
      .from("patient_exercises")
      .select("id, scheduled_date, is_completed, exercises(title, description, category, repetitions, duration_minutes)")
      .eq("patient_id", patientId);

    setScheduledExercises(ex || []);
  }


  
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

        // Oefeningen ophalen
        await refetchScheduledExercises(patientData.id);

        // Missies ophalen
        const { data: allMissions } = await supabase
          .from("patient_missions")
          .select("id, patient_id, mission_id, progress, is_completed, assigned_date, missions(title, type, target, xp_reward)")
          .eq("patient_id", patientData.id)
          .order("assigned_date", { ascending: false });

        setMissions(allMissions || []);
        setActivePatientId(patientData.id);
      } catch (err) {
        console.error("INIT ERROR:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [navigate, location.key, todayKey]);

  // --- 2. AFGELEIDE STATE (MEMO'S) ---
  const pathDates = useMemo(() => getPathDates(), []);
  
  const pathData = useMemo(() => {
    // We filteren de Zondagen even eruit voor het zigzag pad, optioneel maar houdt het strak:
    return pathDates.filter(d => d.getDay() !== 0).map((date, i) => {
      const key = formatDateKey(date);
      const isToday = key === todayKey;
      const isPast = key < todayKey;
      const itemsForDay = scheduledExercises.filter(e => e.scheduled_date === key);
      const isDone = itemsForDay.length > 0 && itemsForDay.every(e => e.is_completed);
      
      let pathState = "moon"; 

      if (isDone) {
        pathState = "done";
      } else if (isToday) {
        pathState = "current"; 
      } else if (isPast) {
        if (itemsForDay.length > 0) {
          pathState = "notdone";
        } else {
          pathState = "locked"; 
        }
      } else {
        if (itemsForDay.length === 0) {
          pathState = "moon";
        } else {
          pathState = "locked";
        }
      }

      return {
        key,
        date,
        longLabel: isToday ? "VANDAAG" : ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"][(date.getDay() + 6) % 7],
        pathState,
        isToday,
        exercises: itemsForDay 
      };
    });
  }, [pathDates, scheduledExercises, todayKey]);

  // Scroll naar "Vandaag" alleen bij eerste load
  useEffect(() => {
    if (!loading && scrollRef.current && !hasAutoScrolled) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setHasAutoScrolled(true);
    }
  }, [loading, pathData, hasAutoScrolled]);

  const stats = useMemo(() => {
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

  const dashboardStats = [
    { label: "Patiënten", value: stats.trophies, icon: "/images/wins-stat.png", background: "#F8AE49" },
    { label: "XP", value: stats.totalCompleted, icon: "/images/xp-stat.png", background: "#84C5ED" },
    { label: "Streak", value: stats.streak, icon: "/images/streak-stat.png", background: "#B388FF" },
  ];

  const previewMissions = useMemo(() => missions.slice(0, 3), [missions]);
  const hasMoreMissions = missions.length > previewMissions.length;
  const hoursUntilReset = getHoursUntilReset();

  useEffect(() => {
    if (!activePatientId) return;

    const channel = supabase
      .channel(`patient_exercises:${activePatientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_exercises", filter: `patient_id=eq.${activePatientId}` },
        async () => {
          try {
            await refetchScheduledExercises(activePatientId);
          } catch (err) {
            console.error("Failed to refetch exercises after realtime update", err);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, [activePatientId]);

  useEffect(() => {
    if (!activePatientId) return;
    let mounted = true;

    async function refetchExercises() {
      try {
        const { data } = await supabase
          .from("patient_exercises")
          .select("id, scheduled_date, is_completed, exercises(title, description, category, repetitions, duration_minutes)")
          .eq("patient_id", activePatientId);

        if (mounted) setScheduledExercises(data || []);
      } catch (err) {
        console.error("Failed to poll exercises", err);
      }
    }

    refetchExercises();
    const iv = setInterval(refetchExercises, 8000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [activePatientId]);

  useEffect(() => {
    if (!activePatientId) return;

    const channel = supabase
      .channel(`patient_missions:${activePatientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_missions", filter: `patient_id=eq.${activePatientId}` },
        async () => {
          try {
            const { data: updated } = await supabase
              .from("patient_missions")
              .select("id, patient_id, mission_id, progress, is_completed, assigned_date, missions(title, type, target, xp_reward)")
              .eq("patient_id", activePatientId)
              .order("assigned_date", { ascending: false });

            setMissions(updated || []);
          } catch (err) {
            console.error("Failed to refetch missions after realtime update", err);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, [activePatientId]);

  // Polling fallback: refetch missions every 8s in case realtime events don't arrive
  useEffect(() => {
    if (!activePatientId) return;
    let mounted = true;

    async function refetchMissions() {
      try {
        const { data } = await supabase
          .from("patient_missions")
          .select("id, patient_id, mission_id, progress, is_completed, assigned_date, missions(title, type, target, xp_reward)")
          .eq("patient_id", activePatientId)
          .order("assigned_date", { ascending: false });

        if (mounted) setMissions(data || []);
      } catch (err) {
        console.error("Failed to poll missions", err);
      }
    }

    refetchMissions();
    const iv = setInterval(refetchMissions, 8000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [activePatientId]);

  // --- 3. AUTO UPDATE MISSIONS IN DATABASE ---
  useEffect(() => {
    if (!missions.length || loading) return;

    const completedTodayExercises = scheduledExercises.filter(
      (e) => normalizeDateKey(e.scheduled_date) === todayKey && e.is_completed
    );
    const completedToday = completedTodayExercises.length;
    const completedTodayXp = completedTodayExercises.reduce(
      (total, item) => total + getExerciseXp(item),
      0
    );
    const completedTodayMissionCount = missions.filter(
      (mission) => mission.is_completed && normalizeDateKey(mission.assigned_date) === todayKey
    ).length;
    const currentStreak = getConsecutiveDayStreak(scheduledExercises, todayKey);
    const completedThisWeekXp = scheduledExercises
      .filter((item) => {
        const itemDate = new Date(normalizeDateKey(item.scheduled_date));
        const today = new Date();
        const startOfWeek = new Date(today);
        const weekday = (today.getDay() + 6) % 7;
        startOfWeek.setDate(today.getDate() - weekday);
        startOfWeek.setHours(0, 0, 0, 0);
        return item.is_completed && itemDate >= startOfWeek;
      })
      .reduce((total, item) => total + getExerciseXp(item), 0);

    async function syncMissions() {
      for (const m of missions) {
        let progress = 0;
        const target = Number(m.missions?.target || 1);

        if (m.missions?.type === "complete_exercise") progress = completedToday;
        if (m.missions?.type === "xp") progress = completedTodayXp;
        if (m.missions?.type === "complete_daily_missions") progress = completedTodayMissionCount;
        if (m.missions?.type === "streak") progress = currentStreak;
        if (m.missions?.type === "xp_weekly") progress = completedThisWeekXp;
        
        // Voorkom onnodige updates als de progress hetzelfde is
        if (m.progress === progress) continue;

        const done = progress >= target;
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

  if (loading) {
    return (
      <div className="childApp">
        <ChildSidebar onLogout={handleLogout} />
        <main className="childPathArea">
          <div className="kineDashLoading">
            <img src="/images/monkey-load.png" style={{ width: "100px" }} alt="" />
            <p>laden . . .</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="childApp">
      <ChildSidebar onLogout={handleLogout} />

          <main className="childPathArea">
             <div 
               className="pathWrapper" 
               style={{ 
                 // Aangepast per nieuwe afmetingen: 2 bolletjes per 332.5px
                 height: `${(pathData.length / 2) * 332.5 + 100}px`, 
                 width: '490px', 
                 position: 'relative', 
                 marginTop: '40px', 
                 marginBottom: '40px' 
               }}
             >
               
               {/* SVG PATROON */}
               <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                 <defs>
                   <pattern id="figma-snake" x="0" y="0" width="490" height="332.5" patternUnits="userSpaceOnUse">
                     <path 
                       d="M475 0C475 49.0327 435.251 88.782 386.218 88.782H97.5975C51.9801 88.782 15 125.762 15 171.379C15 216.996 51.9802 253.977 97.5975 253.977H396.477C439.844 253.977 475 289.133 475 332.5" 
                       stroke="#F3EBE0" 
                       strokeWidth="30" 
                       fill="none"
                     />
                   </pattern>
                 </defs>
                 <rect width="100%" height="100%" fill="url(#figma-snake)" />
               </svg>
               
               {/* BOLLETJES */}
               <div className="pathNodesContainer" style={{ position: 'absolute', width: '100%', left: '0', top: '0', height: '100%' }}>
                 {pathData.map((day, i) => {
                   
                   // De SVG start rechts, dus i=0 is rechts (100%), i=1 is links (0%)
                   const isLeft = (i % 2 !== 0); 

                  //  let popoverTypeClass = "popover-exercises"; // Standaard breed (lijst)
                  //  if (day.key < todayKey) {
                  //    popoverTypeClass = "popover-past";
                  //  } else if (day.key > todayKey && day.exercises.length === 0) {
                  //    popoverTypeClass = "popover-future-empty";
                  //  } else if (day.key === todayKey && day.exercises.length === 0) {
                  //    popoverTypeClass = "popover-today-empty";
                  //  }
    
                   return (
                     <div 
                       key={day.key} 
                       ref={day.isToday ? scrollRef : null}
                       className={`pathBubbleWrap ${selectedDay === day.key ? 'clicked' : ''}`}
                       onClick={() => setSelectedDay(selectedDay === day.key ? null : day.key)}
                       style={{
                         position: 'absolute',
                         top: `${100 + (i * 166.25)}px`, 
                         left: isLeft ? '30%' : '70%', 
                         transform: 'translate(-50%, -50%)',
                         transition: 'transform 0.2s ease-in-out',
                         zIndex: selectedDay === day.key ? 50 : (day.isToday ? 10 : 1),
                         cursor: 'pointer'
                       }}
                     >
                       <a className={`pathBubble ${day.pathState}`}>
                         {day.pathState === "done" && <img src="/images/check-white.svg" alt="✓" />}
                         {day.pathState === "notdone" && <img src="/images/onvoltooid-icon.svg" alt="x" />}
                         {day.pathState === "current" && <img src="/images/star-white.svg" alt="⭐" />}
                         {day.pathState === "locked" && <img src="/images/lock-grey.svg" alt="🔒"/>}
                         {day.pathState === "moon" && <img src="/images/moon-white.svg" alt="🌙"/>}
                       </a>
                       <span className="bubbleLabel">{day.longLabel}</span>



                       {/* NIEUW: EXERCISE POPOVER */}
                       {selectedDay === day.key && (
                         <div 
                           // "empty" class toepassen voor smalle popup = Voor verleden EN alle dagen zonder oefeningen
                           className={`dayPopover ${(day.exercises.length === 0 || day.key < todayKey) ? 'empty' : ''}`} 
                           onClick={(e) => e.stopPropagation()}
                         >
                           <div className="popoverArrow" />

                           <div className="popoverContent" style={{ textAlign: (day.exercises.length === 0 || day.key < todayKey) ? 'center' : 'left' }}>
                             
                              {/* SITUATIE 1: VERLEDEN */}
                              {day.key < todayKey ? (
                               <div style={{ display: 'flex', alignItems: 'center', gap: '18px', textAlign: 'left' }}>
                                 <img src="/images/monkey-stunned.png" alt="Relax" style={{ width: '60px' }} />
                                 <div>
                                   <p style={{ margin: 0, color: "#1A202C", fontWeight: "bold", fontSize: "14px" }}>Deze dag is al voorbij!</p>
                                   <p style={{ margin: "4px 0 0", color: "#718096", fontSize: "14px" }}>Je kunt deze oefeningen niet meer maken.</p>
                                 </div>
                               </div>
                             ) : 
                             /* SITUATIE 2: TOEKOMST & GEEN OEFENINGEN */
                             (day.key > todayKey && day.exercises.length === 0) ? (
                               <div style={{ display: 'flex', alignItems: 'center', gap: '18px', textAlign: 'left' }}>
                               <img src="/images/empty-state-relax.png" alt="Relax" style={{ width: '60px' }} />
                               <div>
                                 <p style={{ margin: "0", color: "#1A202C", fontWeight: "bold", fontSize: "14px" }}>Geen oefeningen gepland!</p>
                                 <p style={{ margin: "4px 0 0", color: "#718096", fontSize: "14px" }}>Relax en geniet van je dag.</p>
                               </div>
                               </div>
                             ) : 
                             /* SITUATIE 3: VANDAAG & GEEN OEFENINGEN */
                             (day.key === todayKey && day.exercises.length === 0) ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', textAlign: 'left' }}>
                              <img src="/images/monkey-search.png" alt="Relax" style={{ width: '60px' }} />
                              <div>
                              <p style={{ margin: "0", color: "#1A202C", fontWeight: "bold", fontSize: "14px" }}>Geen oefeningen vandaag!</p>
                              <p style={{ margin: "4px 0 0", color: "#718096", fontSize: "14px" }}>Geniet van je vrije tijd en tot snel!</p>
                              </div>
                              </div>
                            ) : 
                             /* SITUATIE 4: LIJST MET OEFENINGEN (Voor Vandaag en de Toekomst) */
                             (
                              day.exercises.map((ex, idx) => (
                                <div key={ex.id} className={`exerciseItem ${ex.is_completed ? 'completed' : ''}`}>
                                  <div className="exerciseInfo">
                                    {/* Haal de titel uit de gekoppelde table via ex.exercises?.title */}
                                    <h4 className="exerciseTitle">{ex.exercises?.title || `Oefening ${idx + 1}`}</h4>
                                    <div className="exerciseTags">
                                      <span className="exerciseMetaTag">
                                        <img src="/images/star-outline.svg" alt="XP" /> 20 XP
                                      </span>
                                      <span className="exerciseMetaTag">
                                        {/* Haal de duur op (optioneel, of laat de hardcoded 5 min staan) */}
                                        <img src="/images/Clock.svg" alt="Tijd" /> {ex.exercises?.duration_minutes || 5} min
                                      </span>
                                    </div>
                                  </div>
                                   
                                   {/* De knop is 'disabled' als de dag níét vandaag is (dus in de toekomst) OF als oefening al voltooid is */}
                                   <button 
                                     className={`startButton ${(!day.isToday || ex.is_completed) ? 'disabled' : ''} ${ex.is_completed ? 'completed' : ''}`} 
                                     onClick={() => {
                                       if (day.isToday && !ex.is_completed) {
                                         // Stuur de huidige oefening mee in de 'state'
                                        navigate('/kind/oefening', {
                                          state: {
                                            exercise: ex.exercises,
                                            stats,
                                            scheduledExercises,
                                            patientExerciseId: ex.id,
                                            patientId: activePatientId,
                                          },
                                        });
                                       }
                                     }}
                                   >
                                     {ex.is_completed ? 'Klaar' : 'Start'}
                                   </button>
                                  </div>
                                ))
                              )}
                            </div>
                         </div>
                       )}
                     </div>
                   )
                 })}
               </div>
             </div>
          </main>

      <aside className="childRightPanel">
        <div className="panelmobile">
          <ChildStatsRow stats={dashboardStats} />
          <button className="childProfileBtn" onClick={() => navigate("/kind/profiel")}>
            <img src="/images/avatar.svg" alt="" />
          </button>
       </div>

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
            <Link
              to="/kind/missies"
              className="seeAllLink">
              Zie alle
            </Link>
          </div>
          <div className="dagmissiesList">
            {missions.length === 0 && (
              <p style={{color: "#888", fontSize: "14px"}}>Geen missies toegewezen aan deze patiënt.</p>
            )}
            {previewMissions.map((m) => (
              <ChildMissionCard key={m.id} mission={m} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}