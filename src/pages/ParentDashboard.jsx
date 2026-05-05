import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import ParentSidebar from "../components/ParentSidebar";
import WeekStreak from "../components/WeekStreak";
import UpcomingExercises from "../components/UpcomingExercises";
import RecentExercises from "../components/RecentExercises";
import { formatDate } from "../utils/helpers";
import "../assets/css/parent-dashboard.css";

const LINK_COLUMN = "parent_user_id";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData || profileData.role !== "ouder") {
        navigate("/");
        return;
      }

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq(LINK_COLUMN, user.id)
        .eq("is_archived", false)
        .single();

      if (patientError) throw patientError;

      setPatient(patientData);

      // if (patientData?.kinesist_id) {
      //   const { data: kinesistData, error: kinesistError } = await supabase
      //     .from("profiles")
      //     .select("id, full_name, email, phone")
      //     .eq("id", patientData.kinesist_id)
      //     .single();

      //   if (!kinesistError) {
      //     setKinesistProfile(kinesistData);
      //   }
      // }

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

const categoryProgress = useMemo(() => {
  const now = new Date();

  const last30Start = new Date();
  last30Start.setDate(now.getDate() - 30);

  const prev30Start = new Date();
  prev30Start.setDate(now.getDate() - 60);

  const prev30End = new Date();
  prev30End.setDate(now.getDate() - 30);

  const map = {};

  for (const item of scheduledExercises) {
    const category = item.exercise?.category || "Overig";
    const date = new Date(item.scheduled_date);

    if (!map[category]) {
      map[category] = {
        category,
        total: 0,
        completed: 0,
        last30: 0,
        prev30: 0,
      };
    }

    // totaal
    map[category].total += 1;
    if (item.is_completed) {
      map[category].completed += 1;
    }

    // laatste 30 dagen
    if (date >= last30Start && item.is_completed) {
      map[category].last30 += 1;
    }

    // vorige 30 dagen
    if (date >= prev30Start && date < prev30End && item.is_completed) {
      map[category].prev30 += 1;
    }
  }

 // ...existing code...
 return Object.values(map).map((entry) => {
  const percentage =
    entry.total > 0
      ? Math.round((entry.completed / entry.total) * 100)
      : 0;

  const diff = entry.last30 - entry.prev30;
  const delta = entry.prev30 === 0
    ? (entry.last30 > 0 ? "+100%" : "0%")
    : `${diff >= 0 ? "+" : ""}${Math.round((diff / entry.prev30) * 100)}%`;

  // Een array van beschikbare kleuren in je CSS
  const progressColors = ["progressBlue", "progressGreen", "progressYellow", "progressPurple", "progressPink"];
  
  // Bereken een vaste index op basis van de categorienaam (zodat dezelfde naam altijd dezelfde kleur krijgt)
  const colorIndex = Array.from(entry.category).reduce((acc, char) => acc + char.charCodeAt(0), 0) % progressColors.length;

  return {
    ...entry,
    percentage,
    progressClass: progressColors[colorIndex],
    delta,
    deltaClass: diff < 0 ? "deltaNegative" : "deltaPositive",
  };
});
}, [scheduledExercises]);

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

if (loading) {
    return (
      <div className="parentDashboardPage">
        <ParentSidebar activeItem="dashboard" onLogout={handleLogout} />
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

            <WeekStreak scheduledExercises={scheduledExercises} />

            <div className="parentStatusBlock">
              <div className="parentStatusHeader">
                <h2>Status</h2>
                <p className="parentStatusFilter">
                  deze week
                </p>
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