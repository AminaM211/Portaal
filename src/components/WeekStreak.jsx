import { useMemo } from "react";
import { normalizeDateKey } from "../utils/childDashboard";
import "./WeekStreak.css";

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export default function WeekStreak({ scheduledExercises }) {
  const todayKey = formatDateKey(new Date());
  const weekDates = useMemo(() => getWeekDates(), []);

  const weekStatus = useMemo(() => {
    return weekDates.map((date) => {
      const key = formatDateKey(date);
      const items = scheduledExercises.filter((item) => normalizeDateKey(item.scheduled_date) === key);
  
      const isToday = key === todayKey;
      const completedCount = items.filter((item) => item.is_completed).length;
      const isDone = items.length > 0 && completedCount === items.length;

      if (isDone) {
        return { key, type: "done" };
      }
      if (isToday) {
        return { key, type: "today" };
      }
      
      const isSunday = date.getDay() === 0;
      if (isSunday) {
        return { key, type: "sunday" };
      }
  
      if (items.length === 0) {
        return { key, type: "empty" };
      }
  
      const isPast = key < todayKey;
      return { key, type: isPast ? "missed" : "pending" };
    });
  }, [weekDates, scheduledExercises, todayKey]);

  return (
    <div className="parentWeekCard">
      <h2>Weekoverzicht</h2>
      <div className="parentWeekRow">
        {weekStatus.map((item, index) => (
          <div key={item.key} className="parentWeekDay">
            <div className={`weekCircle ${item.type}`}>
              {item.type === "done" && (
                <img src="/images/check-weekoverzicht.svg" alt="Done" />
              )}
              {item.type === "missed" && (
                <img src="/images/cross-weekoverzicht.svg" alt="missed" />
              )}
              {item.type === "today" && (
                <img src="/images/target-today.svg" alt="today" />
              )}
              {item.type === "sunday" && (
                <img src="/images/present-streakday.svg" alt="Present" />
              )}
            </div>
            <span>{getWeekdayLabel(index)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
