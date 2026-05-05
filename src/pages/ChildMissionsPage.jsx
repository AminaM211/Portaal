import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  getDaysLeftInMonth,
} from "../utils/childDashboard";
import "../assets/css/child-dashboard.css";

const LINK_COLUMN = "parent_user_id";

export default function ChildMissionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [missions, setMissions] = useState([]);
  const [activePatientId, setActivePatientId] = useState(null);
  const [scheduledExercises, setScheduledExercises] = useState([]);
  const [lastError, setLastError] = useState(null);

  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
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

        const { data: patientData, error: patientError } = await query.limit(1).maybeSingle();
        if (patientError || !patientData) return;

        const { data: ex, error: exError } = await supabase
          .from("patient_exercises")
          .select("id, scheduled_date, is_completed, exercise_id")
          .eq("patient_id", patientData.id);

        if (exError) {
          console.error("Failed to fetch patient_exercises", exError);
          setLastError(exError);
        }

        const patientExercises = ex || [];

        // Fetch related exercises data (xp/xp_reward, title) and merge for progress calculations
        const exerciseIds = Array.from(new Set(patientExercises.map((p) => p.exercise_id).filter(Boolean)));
        let exercisesMap = {};
        if (exerciseIds.length) {
          try {
            const { data: exRows, error: exRowsErr } = await supabase
              .from("exercises")
              .select("id, title, duration_minutes, xp_reward, xp")
              .in("id", exerciseIds);

            if (exRowsErr) {
              console.warn("Failed to fetch exercises rows", exRowsErr);
            } else {
              exercisesMap = (exRows || []).reduce((acc, r) => {
                acc[r.id] = r;
                return acc;
              }, {});
            }
          } catch (err) {
            console.error("Error fetching exercises for patient_exercises merge", err);
          }
        }

        const merged = patientExercises.map((p) => ({
          ...p,
          exercises: exercisesMap[p.exercise_id] || null,
        }));

        setScheduledExercises(merged);

        const { data: allMissions, error: missionsError } = await supabase
          .from("patient_missions")
          .select("id, patient_id, mission_id, progress, is_completed, assigned_date, missions(title, type, target, xp_reward)")
          .eq("patient_id", patientData.id)
          .order("assigned_date", { ascending: false });

        if (missionsError) {
          console.error("Failed to fetch patient_missions", missionsError);
          setLastError(missionsError);
        }

        console.debug("[ChildMissionsPage] loaded missions for patient", patientData.id, allMissions);
        setMissions(allMissions || []);
        setActivePatientId(patientData.id);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [navigate]);

  const totalCompleted = scheduledExercises.filter((item) => item.is_completed).length;
  const completedTodayExercises = scheduledExercises.filter(
    (item) => normalizeDateKey(item.scheduled_date) === todayKey && item.is_completed
  );
  const completedTodayXp = completedTodayExercises.reduce((total, item) => total + getExerciseXp(item), 0);
  const currentStreak = getConsecutiveDayStreak(scheduledExercises);
  const hoursUntilReset = getHoursUntilReset();

  const dailyMissions = missions
    .filter((mission) => mission.missions?.type !== "xp_weekly")
    .sort((a, b) => (a.is_completed ? 1 : 0) - (b.is_completed ? 1 : 0));
  const monthlyMission = missions.find((mission) => mission.missions?.type === "xp_weekly") || missions[3] || null;

  // Auto-update mission progress (streak, xp, completions)
  useEffect(() => {
    if (!missions.length || loading) return;

    const completedTodayExercises = scheduledExercises.filter(
      (e) => normalizeDateKey(e.scheduled_date) === todayKey && e.is_completed
    );
    const completedToday = completedTodayExercises.length;
    const completedTodayXp = completedTodayExercises.reduce((total, item) => total + getExerciseXp(item), 0);
    const completedTodayMissionCount = missions.filter(
      (mission) => mission.is_completed && normalizeDateKey(mission.assigned_date) === todayKey
    ).length;
    const currentStreak = getConsecutiveDayStreak(scheduledExercises);
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

        if (m.progress === progress) continue;

        const done = progress >= target;
        try {
          await supabase
            .from("patient_missions")
            .update({ progress, is_completed: done })
            .eq("id", m.id);
        } catch (err) {
          console.error("Failed to update mission progress", err);
        }
      }
    }

    syncMissions();
  }, [scheduledExercises, missions, todayKey, loading]);

  useEffect(() => {
    if (!activePatientId) return;

    let channel = supabase
      .channel(`patient_missions:${activePatientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patient_missions", filter: `patient_id=eq.${activePatientId}` },
        async (payload) => {
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
      } catch (e) {
        // ignore
      }
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

    // initial fetch + interval
    refetchMissions();
    const iv = setInterval(refetchMissions, 8000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, [activePatientId]);

  // Debug: compute some quick stats for visibility
  const missionStats = {
    total: missions.length,
    completed: missions.filter((m) => m.is_completed).length,
    byType: missions.reduce((acc, m) => {
      const t = m.missions?.type || 'unknown';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {}),
  };

  if (loading) {
    return (
      <div className="childApp">
        <ChildSidebar onLogout={handleLogout} />
        <main className="childPathArea">
          <div className="childLoading">
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

      <main style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0, 0.85fr) 340px", gap: "40px", padding: "40px 48px 40px 40px", overflowY: "auto" }}>
        <section style={{ minWidth: 0}}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
            <h1 style={{ margin: 0, fontFamily: "Nunito, sans-serif", fontSize: "20px", lineHeight: "31px", fontWeight: 700, color: "#000" }}>
              Dagelijkse missies
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F05D5E', fontWeight: 700, fontSize: '13px' }}>
              <img src="/images/Clock.svg" alt="" style={{ width: '16px', height: '16px' }} />
              <span>{hoursUntilReset} UUR</span>
            </div>
          </div>

          <div className="dagmissiesList">
            {dailyMissions.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>Geen dagelijkse missies gevonden.</p>
            ) : (
              dailyMissions.map((m) => (
                <ChildMissionCard key={m.id} mission={m} />
              ))
            )}
          </div>

          <section style={{ marginTop: "48px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h2 style={{ margin: 0, fontFamily: "Nunito, sans-serif", fontSize: "20px", lineHeight: "31px", fontWeight: 700, color: "#000" }}>
                Maandelijkse missie
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#F05D5E", fontWeight: 700, fontSize: "13px" }}>
                <img src="/images/Clock.svg" alt="" style={{ width: "16px", height: "16px" }} />
                <span>{getDaysLeftInMonth()} DAGEN</span>
              </div>
            </div>

            {monthlyMission ? (
              <ChildMissionCard mission={monthlyMission} />
            ) : (
              <p style={{ color: "#888", fontSize: "14px" }}>Geen maandelijkse missie beschikbaar.</p>
            )}
          </section>
        </section>

        <aside className="childRightPanel" style={{ paddingTop: "34px" }}>
          <ChildStatsRow
            stats={[
              { label: "Voltooid", value: totalCompleted, icon: "/images/wins-stat.png", background: "#F8AE49" },
              { label: "XP", value: completedTodayXp, icon: "/images/xp-stat.png", background: "#84C5ED" },
              { label: "Streak", value: currentStreak, icon: "/images/streak-stat.png", background: "#B388FF" },
            ]}
          />

          <WeekStreak scheduledExercises={scheduledExercises} />
        </aside>
      </main>
    </div>
  );
}