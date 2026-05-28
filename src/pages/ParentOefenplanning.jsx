import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ParentSidebar from "../components/ParentSidebar";
import UpcomingExercises from "../components/UpcomingExercises";
import RecentExercises from "../components/RecentExercises";
import { getCategoryClass, getDifficultyIcon, getExerciseImageSrc } from "../utils/helpers";
import ExerciseMediaThumb from "../components/ExerciseMediaThumb";
import "../assets/css/parent-dashboard.css";
import "../components/ExerciseCard.css";

const LINK_COLUMN = "parent_user_id";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ParentOefenplanning() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [scheduledExercises, setScheduledExercises] = useState([]);
  
  // Kalender states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return navigate("/");

      const { data: patientData } = await supabase
        .from("patients")
        .select("*")
        .eq(LINK_COLUMN, user.id)
        .eq("is_archived", false)
        .single();

      if (patientData) {
        setPatient(patientData);
        const { data: exerciseData } = await supabase
          .from("patient_exercises")
          .select(`
            id, patient_id, exercise_id, scheduled_date, is_completed, created_at,
            exercise:exercises (id, title, description, category, difficulty, duration_minutes, repetitions, image_url)
          `)
          .eq("patient_id", patientData.id)
          .order("scheduled_date", { ascending: true });

        if (exerciseData) setScheduledExercises(exerciseData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Kalender logica (Week vs Maand)
  const calendarDays = useMemo(() => {
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth();
    
    if (isExpanded) {
      // MAAND VIEW
      const firstDayOfMonth = new Date(year, month, 1);
      const startingDay = (firstDayOfMonth.getDay() + 6) % 7; // Maandag = 0
      const days = [];
      
      // Vorige maand padding
      for (let i = 0; i < startingDay; i++) {
        days.push(new Date(year, month, -startingDay + i + 1));
      }
      // Huidige maand dagen
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
      }
      return days;
    } else {
      // WEEK VIEW
      const day = (currentViewDate.getDay() + 6) % 7; 
      const startOfWeek = new Date(currentViewDate);
      startOfWeek.setDate(currentViewDate.getDate() - day);
      return Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
      });
    }
  }, [currentViewDate, isExpanded]);

  function getDotsForDate(dateKey) {
    const counts = scheduledExercises.filter(ex => ex.scheduled_date === dateKey).length;
    // Maximaal 3 stipjes tonen
    return Array.from({ length: Math.min(counts, 3) });
  }

  const selectedDateKey = formatDateKey(selectedDate);
  const todayKey = formatDateKey(new Date());

  const selectedDayExercises = useMemo(() => {
    return scheduledExercises.filter(ex => ex.scheduled_date === selectedDateKey);
  }, [scheduledExercises, selectedDateKey]);

  const upcomingExercises = useMemo(() => {
    return scheduledExercises
      .filter((item) => !item.is_completed && item.scheduled_date >= todayKey)
      .slice(0, 2);
  }, [scheduledExercises, todayKey]);

  const recentCompleted = useMemo(() => {
    return [...scheduledExercises]
      .filter((item) => item.is_completed)
      .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))
      .slice(0, 4);
  }, [scheduledExercises]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  if (loading) {
    return (
      <div className="parentDashboardPage">
        <ParentSidebar activeItem="oefenplanning" onLogout={handleLogout} />
        <main className="parentDashboardMain">
          <div className="parentDashboardLoading">
            <img src="/images/monkey-load.png" style={{ width: "100px" }} alt="" />

            <p>laden . . .</p>
          </div>
        </main>
      </div>
    );
  }

return (
    <div className="parentDashboardPage">
        <ParentSidebar activeItem="oefenplanning" onLogout={handleLogout} />

        <main className="parentDashboardMain">
            <div className="parentDashboardGrid planningGrid">
                
                <section className="parentPlanningLeft">
                    <div className="planningHeaderRow">
                        <button 
                            className={`planningToggleBtn ${isExpanded ? "expanded" : ""}`}
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            <img src="/images/toggle.svg" alt="Toggle" />
                        </button>
                        <div className="planningDateRange">
                            {currentViewDate.toLocaleString("nl-BE", { month: "long", year: "numeric" })}
                            <img src="/images/calendar-blue.svg" alt="calendar" />
                        </div>
                    </div>

                    <div className={`planningCalendarCard ${isExpanded ? "is-expanded" : ""}`}>
                        <div className="planningCalendarTop">
                            <button onClick={() => setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - (isExpanded ? 1 : 0), currentViewDate.getDate() - (!isExpanded ? 7 : 0)))}> <img src="/images/arrowSL.svg" alt="" /></button>
                            <h4>{currentViewDate.toLocaleString("nl-BE", { month: "long"})}</h4>
                            <button onClick={() => setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + (isExpanded ? 1 : 0), currentViewDate.getDate() + (!isExpanded ? 7 : 0)))}> <img src="/images/arrowSR.svg" alt="" /></button>
                        </div>

                        <div className="planningWeekdays">
                            <span>M</span><span>D</span><span>W</span><span>D</span><span>V</span><span>Z</span><span>Z</span>
                        </div>

                        <div className="planningDaysGrid">
                            {calendarDays.map((d) => {
                                const key = formatDateKey(d);
                                const isSelected = key === selectedDateKey;
                              const isToday = key === todayKey;
                                const dots = getDotsForDate(key);
                                const isCurrentMonth = d.getMonth() === currentViewDate.getMonth();
                                
                                return (
                                    <div 
                                        key={key} 
                                  className={`planningDayCell ${isSelected ? "selected" : ""} ${isToday ? "is-today" : ""} ${!isCurrentMonth && isExpanded ? "faded" : ""}`}
                                        onClick={() => {
                                            setSelectedDate(d);
                                            setCurrentViewDate(d);
                                        }}
                                    >
                                        <div className="dayNumber">{d.getDate()}</div>
                                        <div className="dayDots">
                                    {dots.map((_, i) => <span key={i} className="dot dot-green"></span>)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="planningExerciseList">
                        {selectedDayExercises.length === 0 ? (
                            <div className="parentEmptyState geenoefeningen">
                                <img src="/images/empty-state-relax.png" alt="" />
                                <p>Geen oefeningen gepland voor deze dag</p>
                                {/* if date not today, go to today */}
                                {selectedDateKey !== todayKey && (
                                    <button className="goToTodayBtn" onClick={() => {
                                        const today = new Date();
                                        setSelectedDate(today);
                                        setCurrentViewDate(today);
                                    }}>
                                        Ga naar vandaag
                                    </button>
                                )}
                                </div>
                        ) : (
                            selectedDayExercises.map(item => (
                                <div 
                                    key={item.id} 
                                    className={`planningExerciseCard ${item.is_completed ? "completed" : ""}`}
                                    onClick={() => navigate(`/kinesist/oefeningen/${item.exercise?.id}`)}
                                    style={{ cursor: "pointer" }}
                                >
                                <ExerciseMediaThumb
                                  src={item.exercise?.image_url || item.exercise?.thumbnail_url || item.exercise?.media_url}
                                  alt={item.exercise?.title || "Oefening"}
                                  className="planningExerciseThumb"
                                />
                                    <div className="planningExInfo">
                                        <strong>{item.exercise?.title}</strong>
                                        <div className="parentUpcomingMeta">
                                            <span className={`exerciseTag ${getCategoryClass(item.exercise?.category)}`}>
                                                {item.exercise?.category}
                                            </span>
                                            <img className="exerciseDifficultyIcon" src={getDifficultyIcon(item.exercise?.difficulty)} alt="" />
                                        </div>
                                        <small>{item.exercise?.duration_minutes} min • {item.exercise?.repetitions} herhalingen</small>
                                    </div>
                                    {item.is_completed && <span className="planningVoltooidBadge">✓ Voltooid</span>}
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <aside className="parentDashboardRight">
                  <UpcomingExercises exercises={upcomingExercises} todayKey={todayKey} />

                  <RecentExercises
                    exercises={recentCompleted}
                    dateField="scheduled_date"
                    emptyTitle="Nog geen recente oefeningen"
                    emptyDescription="Voltooide oefeningen verschijnen hier."
                  />
                </aside>
                
            </div>
        </main>
    </div>
);
}