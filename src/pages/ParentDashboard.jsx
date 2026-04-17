import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ParentSidebar from "../components/ParentSidebar";
import "../assets/css/parent-dashboard.css";

const LINK_COLUMN = "parent_user_id";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("nl-BE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatShortDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return (
    date.toLocaleDateString("nl-BE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " " +
    date.toLocaleTimeString("nl-BE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCategoryClass(category) {
  if (category === "Mobiliteit") return "exerciseTag--yellow";
  if (category === "Flexibiliteit") return "exerciseTag--pink";
  if (category === "Balans") return "exerciseTag--blue";
  if (category === "Kracht") return "exerciseTag--green";
  return "exerciseTag--yellow";
}

function getDifficultyIcon(difficulty) {
  if (difficulty === "Makkelijk") return "/images/difficulty-easy.svg";
  if (difficulty === "Gemiddeld") return "/images/difficulty-medium.svg";
  if (difficulty === "Moeilijk") return "/images/difficulty-hard.svg";
  return "/images/difficulty-easy.svg";
}

function getWeekDates() {
  const today = new Date();
  const weekday = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - weekday);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function getWeekdayLabel(index) {
  return ["M", "D", "W", "D", "V", "Z", "Z"][index] || "";
}

function getInitials(name) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ParentDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [parentProfile, setParentProfile] = useState(null);
  const [patient, setPatient] = useState(null);
  const [kinesistProfile, setKinesistProfile] = useState(null);

  const [scheduledExercises, setScheduledExercises] = useState([]);
  const [recentCompleted, setRecentCompleted] = useState([]);

  useEffect(() => {
    initializePage();
  }, []);

  async function initializePage() {
    try {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        navigate("/");
        return;
      }

      setCurrentUser(user);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      setParentProfile(profileData);

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq(LINK_COLUMN, user.id)
        .eq("is_archived", false)
        .single();

      if (patientError) throw patientError;

      setPatient(patientData);

      if (patientData?.kinesist_id) {
        const { data: kinesistData, error: kinesistError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .eq("id", patientData.kinesist_id)
          .single();

        if (!kinesistError) {
          setKinesistProfile(kinesistData);
        }
      }

      const { data: exerciseData, error: exerciseError } = await supabase
        .from("patient_exercises")
        .select(`
          id,
          patient_id,
          exercise_id,
          scheduled_date,
          is_completed,
          created_at,
          exercise:exercises (
            id,
            title,
            category,
            difficulty,
            duration_minutes,
            repetitions,
            image_url
          )
        `)
        .eq("patient_id", patientData.id)
        .order("scheduled_date", { ascending: true });

      if (exerciseError) throw exerciseError;

      const allExercises = exerciseData || [];
      setScheduledExercises(allExercises);

      const recent = [...allExercises]
        .filter((item) => item.is_completed)
        .sort((a, b) => {
          const aDate = new Date(`${a.scheduled_date}T00:00:00`);
          const bDate = new Date(`${b.scheduled_date}T00:00:00`);
          return bDate - aDate;
        })
        .slice(0, 4);

      setRecentCompleted(recent);
    } catch (error) {
      console.error(error);
      setErrorMessage("Ouderdashboard kon niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  useEffect(() => {
    async function fetchKinesist() {
      if (!patient?.kinesist_id) return;
  
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone")
        .eq("id", patient.kinesist_id)
        .single();
  
      if (error) {
        console.error("kinesist fetch error", error);
        return;
      }
  
      setKinesistProfile(data);
    }
  
    fetchKinesist();
  }, [patient]);

  const todayKey = formatDateKey(new Date());

  const upcomingExercises = useMemo(() => {
    return scheduledExercises
      .filter((item) => !item.is_completed && item.scheduled_date >= todayKey)
      .sort((a, b) => {
        const aDate = new Date(`${a.scheduled_date}T00:00:00`);
        const bDate = new Date(`${b.scheduled_date}T00:00:00`);
        return aDate - bDate;
      })
      .slice(0, 2);
  }, [scheduledExercises, todayKey]);

  const weekDates = useMemo(() => getWeekDates(), []);
  const weekStatus = useMemo(() => {
    return weekDates.map((date) => {
      const key = formatDateKey(date);
      const items = scheduledExercises.filter((item) => item.scheduled_date === key);

      if (items.length === 0) {
        return {
          key,
          type: "empty",
        };
      }

      const completedCount = items.filter((item) => item.is_completed).length;

      if (completedCount === items.length) {
        return {
          key,
          type: "done",
        };
      }

      const isToday = key === todayKey;

      if (isToday) {
        return {
          key,
          type: "today",
        };
      }

      const isPast = key < todayKey;

      return {
        key,
        type: isPast ? "missed" : "pending",
      };
    });
  }, [weekDates, scheduledExercises, todayKey]);

  const stats = useMemo(() => {
    const todayItems = scheduledExercises.filter((item) => item.scheduled_date === todayKey);
    const todayCompleted = todayItems.filter((item) => item.is_completed).length;

    const totalAssigned = scheduledExercises.length;
    const totalCompleted = scheduledExercises.filter((item) => item.is_completed).length;

    const completedDates = Array.from(
      new Set(
        scheduledExercises
          .filter((item) => item.is_completed)
          .map((item) => item.scheduled_date)
      )
    ).sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (true) {
      const key = formatDateKey(cursor);
      if (completedDates.includes(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      streak,
      todayCompleted,
      todayTotal: todayItems.length,
      totalCompleted,
      totalAssigned,
    };
  }, [scheduledExercises, todayKey]);

  const categoryProgress = useMemo(() => {
    const map = {};

    for (const item of scheduledExercises) {
      const category = item.exercise?.category || "Overig";

      if (!map[category]) {
        map[category] = {
          category,
          total: 0,
          completed: 0,
        };
      }

      map[category].total += 1;

      if (item.is_completed) {
        map[category].completed += 1;
      }
    }

    return Object.values(map).map((entry) => ({
      ...entry,
      percentage:
        entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
      progressClass:
        entry.category === "Grofmotoriek"
          ? "progressBlue"
          : entry.category === "Fijnmotoriek"
          ? "progressGreen"
          : entry.category === "Balans"
          ? "progressYellow"
          : "progressPurple",
      delta:
        entry.category === "Balans"
          ? "-12%"
          : entry.category === "Fijnmotoriek"
          ? "+3%"
          : entry.category === "Grofmotoriek"
          ? "+23%"
          : "+14%",
      deltaClass:
        entry.category === "Balans" ? "deltaNegative" : "deltaPositive",
    }));
  }, [scheduledExercises]);

  if (loading) {
    return (
      <div className="parentDashboardPage">
        <ParentSidebar activeItem="dashboard" onLogout={handleLogout} />
        <main className="parentDashboardMain">
          <div className="parentDashboardLoading">
            <p>Dashboard laden...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="parentDashboardPage">
      <ParentSidebar activeItem="dashboard" onLogout={handleLogout} />

      <main className="parentDashboardMain">
        {errorMessage && <p className="parentDashboardError">{errorMessage}</p>}

        <div className="parentDashboardGrid">
          <section className="parentDashboardLeft">
            <div className="parentProfileCard">
              <div className="parentProfileTop">
                <div className="parentChildAvatar">
                  {patient?.avatar_url ? (
                    <img src={patient.avatar_url} alt={patient.name} />
                  ) : (
                    <span>{getInitials(patient?.name)}</span>
                  )}
                </div>

                <div className="parentChildInfo">
                  <h1>{patient?.name || "-"}</h1>
                  <p>Startdatum: {formatDate(patient?.created_at)}</p>
                  <p>{patient?.goal || "Geen doel ingevuld"}</p>
                </div>
              </div>

              <div className="parentProfileDivider" />

              <div className="parentKinesistRow">
                <div>
                  <strong>{kinesistProfile?.full_name || "Kinesist"}</strong>
                  <span>Kinesist</span>
                </div>

                <div className="parentKinesistMeta">
                  <span>
                    <img src="/images/phone-icon.svg" alt="" />
                    {kinesistProfile?.phone || "+31 6 1234 5678"}
                  </span>
                  <span>
                    <img src="/images/mail-icon.svg" alt="" />
                    {kinesistProfile?.email || "sarah.jansen@email.com"}
                  </span>
                </div>
              </div>
            </div>

            <div className="parentWeekCard">
              <h2>Weekoverzicht</h2>

              <div className="parentWeekRow">
                {weekStatus.map((item, index) => (
                  <div key={item.key} className="parentWeekDay">
                    <div className={`weekCircle ${item.type}`}>
                      {item.type === "done" && "✓"}
                      {item.type === "missed" && "✕"}
                      {item.type === "today" && "⌖"}
                    </div>
                    <span>{getWeekdayLabel(index)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="parentStatusBlock">
              <div className="parentStatusHeader">
                <h2>Status</h2>
                <button type="button" className="parentStatusFilter">
                  deze week
                  {/* <img src="/images/chevron-down.svg" alt="" /> */}
                </button>
              </div>

              <div className="parentStatusGrid">
                <div className="parentStatCard">
                  <div className="parentStatTop">
                    <img src="/images/streak.svg" alt="" />
                    <strong>{stats.streak}</strong>
                  </div>
                  <span>Streak</span>
                </div>

                <div className="parentStatCard">
                  <div className="parentStatTop">
                    <img src="/images/task.svg" alt="" />
                    <strong>
                      {stats.todayCompleted}/{stats.todayTotal}
                    </strong>
                  </div>
                  <span>Vandaag voltooid</span>
                </div>

                <div className="parentStatCard">
                  <div className="parentStatTop">
                    <img src="/images/progress.svg" alt="" />
                    <strong>
                      {stats.totalCompleted}/{stats.totalAssigned}
                    </strong>
                  </div>
                  <span>Totaal voltooid</span>
                </div>
              </div>
            </div>

            <div className="parentCategoryCard">
              <div className="parentCategoryHeader">
                <h2>Voortgang per categorie</h2>
                <span>Laatste 30 dagen</span>
              </div>

              <div className="parentCategoryList">
                {categoryProgress.length === 0 ? (
                  <div className="parentEmptyState">
                    <strong>Nog geen categoriegegevens</strong>
                    <p>Voltooide oefeningen verschijnen hier automatisch.</p>
                  </div>
                ) : (
                  categoryProgress.map((item) => (
                    <div key={item.category} className="parentCategoryItem">
                      <div className="parentCategoryTop">
                        <strong>{item.category}</strong>

                        <div className="parentCategoryNumbers">
                          <small className={item.deltaClass}>{item.delta}</small>
                          <span>{item.percentage}%</span>
                        </div>
                      </div>

                      <div className={`parentProgressBar ${item.progressClass}`}>
                        <div style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="parentDashboardRight">
            <div className="parentSideSection">
              <h3>Aankomende oefeningen</h3>

              <div className="parentUpcomingList">
                {upcomingExercises.length === 0 ? (
                  <div className="parentEmptyState side">
                    <strong>Geen aankomende oefeningen</strong>
                    <p>Nieuwe oefeningen verschijnen hier.</p>
                  </div>
                ) : (
                  upcomingExercises.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="parentUpcomingCard"
                      onClick={() => navigate("/ouder/oefenplanning")}
                    >
                      <img
                        src={item.exercise?.image_url || "/images/exercise-1.png"}
                        alt={item.exercise?.title || "Oefening"}
                      />

                      <div className="parentUpcomingInfo">
                        <strong>{item.exercise?.title || "Oefening"}</strong>

                        <div className="parentUpcomingMeta">
                          <span
                            className={`exerciseTag ${getCategoryClass(
                              item.exercise?.category
                            )}`}
                          >
                            {item.exercise?.category || "Overig"}
                          </span>

                          <img
                            className="exerciseDifficultyIcon"
                            src={getDifficultyIcon(item.exercise?.difficulty)}
                            alt={item.exercise?.difficulty || "Makkelijk"}
                          />
                        </div>

                        <p>
                          {item.scheduled_date === todayKey
                            ? "Vandaag"
                            : formatDate(item.scheduled_date)}
                        </p>
                      </div>

                      <img
                        className="parentThreeDots"
                        src="/images/dots.svg"
                        alt=""
                      />
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="parentSideSection">
              <h3>Recente oefeningen</h3>

              <div className="parentRecentList">
                {recentCompleted.length === 0 ? (
                  <div className="parentEmptyState side">
                    <strong>Nog geen recente oefeningen</strong>
                    <p>Voltooide oefeningen verschijnen hier.</p>
                  </div>
                ) : (
                  recentCompleted.map((item) => (
                    <div key={item.id} className="parentRecentCard">
                      <div className="parentRecentLeft">
                        <span className="parentRecentCheck">✓</span>

                        <div className="parentRecentInfo">
                          <strong>{item.exercise?.title || "Oefening"}</strong>
                          <p>{formatShortDateTime(item.scheduled_date)}</p>
                        </div>
                      </div>

                      <span className="parentXpTag">+100 XP</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}