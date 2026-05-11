export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeDateKey(value) {
  if (!value) return "";

  if (value instanceof Date) {
    return formatDateKey(value);
  }

  const text = String(value).trim();
  if (!text) return "";

  return text.slice(0, 10);
}

export function getExerciseXp(item) {
  if (!item) return 0;
  return Number(item.exercises?.xp_reward || item.exercises?.xp || 10);
}

export function getConsecutiveDayStreak(scheduledExercises) {
  const completedDates = new Set(
    scheduledExercises
      .filter((item) => item.is_completed)
      .map((item) => normalizeDateKey(item.scheduled_date))
  );

  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = formatDateKey(cursor);
    if (!completedDates.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function getHoursUntilReset() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setDate(now.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);

  return Math.max(0, Math.ceil((nextMidnight - now) / (60 * 60 * 1000)));
}

export function getDaysLeftInMonth() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diff = endOfMonth.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function getMissionIcon(mission) {
  const type = mission?.missions?.type;

  if (type === "xp" || type === "xp_weekly") {
    return {
      src: "/images/star-blue.svg",
      alt: "XP missie",
    //   background: "#D8ECFB",
    };
  }

  if (type === "complete_exercise" || type === "complete_daily_missions") {
    return {
      src: "/images/target.svg",
      alt: "Voltooiingsmissie",
    //   background: "#F7D2D2",
    };
  }

  if (type === "streak") {
    return {
      src: "/images/streak.svg",
      alt: "Streak missie",
    //   background: "#E0D4FF",
    };
  }

  return {
    src: "/images/target.svg",
    alt: "Missie",
    // background: "#E5E7EB",
  };
}
