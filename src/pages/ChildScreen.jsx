import { useEffect, useMemo, useState, useRef } from "react";
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

  return Array.from({ length: 28 }).map((_, i) => {
    const d = new Date(startDay);
    d.setDate(startDay.getDate() + i);
    return d;
  });
}

// NIEUW: Teken automatisch het SVG pad zodra er meer dan 6 nodes zijn
function generateSnakePath(nodesCount) {
  let d = "M 100 50 "; // Start mooi in het midden
  for (let i = 0; i < nodesCount; i++) {
    const startY = 50 + i * 160;
    const endY = startY + 160;
    
    // We creëren een kleine marge (20px) zodat de lijn verticaal vertrekt en landt. 
    // Hierdoor sluiten de bogen 100% vloeiend op elkaar aan zonder een 'knik'.
    const cp1Y = startY; 
    const cp2Y = endY;

    // Wissel van rechts naar links
    if (i % 2 === 0) {
      d += `C 400 ${cp1Y}, 400 ${cp2Y}, 250 ${endY} `;
    } else {
      d += `C 40 ${cp1Y}, 40 ${cp2Y}, 250 ${endY} `;
    }
  }
  return d;
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

  const [selectedDay, setSelectedDay] = useState(null);
  
  const todayDate = new Date();
  const todayKey = formatDateKey(todayDate);

  const scrollRef = useRef(null);


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
        longLabel: isToday ? "VANDAAG" : getWeekdayLabel((date.getDay() + 6) % 7),
        pathState,
        isToday,
        exercises: itemsForDay 
      };
    });
  }, [pathDates, scheduledExercises, todayKey]);


  // NIEUW: Scrolt naar "Vandaag" zodra het scherm geladen is
  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, pathData]);

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
                                 <img src="/images/relax2.png" alt="Relax" style={{ width: '60px' }} />
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
                                 <div key={ex.id} className="exerciseItem">
                                   <div className="exerciseInfo">
                                     <h4 className="exerciseTitle">{ex.title || `Oefening ${idx + 1}`}</h4>
                                     <div className="exerciseTags">
                                       <span className="exerciseTag">
                                         <img src="/images/star-outline.svg" alt="XP" /> 20 XP
                                       </span>
                                       <span className="exerciseTag">
                                         <img src="/images/Clock.svg" alt="Tijd" /> 5 min
                                       </span>
                                     </div>
                                   </div>
                                   
                                   {/* De knop is 'disabled' als de dag níét vandaag is (dus in de toekomst) */}
                                   <button className={`startButton ${!day.isToday ? 'disabled' : ''}`}>
                                     Start
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
                  {item.type === "today" && <img src="/images/target-today.svg" alt="today" />}
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