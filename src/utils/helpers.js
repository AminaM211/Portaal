export function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateAge(birthDate) {
  if (!birthDate) return "-";
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

export function getCategoryClass(category) {
  if (category === "Mobiliteit") return "exerciseTag--yellow";
  if (category === "Flexibiliteit") return "exerciseTag--pink";
  if (category === "Balans") return "exerciseTag--blue";
  if (category === "Kracht") return "exerciseTag--green";
  return "exerciseTag--yellow"; // Fallback
}

export function getDifficultyIcon(difficulty) {
  if (difficulty === "Makkelijk") return "/images/difficulty-easy.svg";
  if (difficulty === "Gemiddeld") return "/images/difficulty-medium.svg";
  if (difficulty === "Moeilijk") return "/images/difficulty-hard.svg";
  return "/images/difficulty-easy.svg"; // Fallback
}

export function formatDateForInput(dateValue) {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
}

export function getDaysBetween(start, end) {
    const dates = [];
    const current = new Date(start);
  
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  
    return dates;
}

export function generateScheduledDates(startDateStr, endDateStr, repeat) {
    if (!startDateStr) return [];
  
    const start = new Date(startDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date(startDateStr);
  
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
  
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    if (end < start) return [];
  
    const allDates = getDaysBetween(start, end);
  
    if (repeat === "Nooit") {
      return allDates.map((date) => formatDateKey(date));
    }
  
    if (repeat === "Wekelijks") {
      const dates = [];
      const current = new Date(start);
      while (current <= end) {
        dates.push(formatDateKey(current));
        current.setDate(current.getDate() + 7);
      }
      return dates.length > 0 ? dates : [formatDateKey(start)];
    }
  
    const allowedWeekdaysMap = {
      "2x per week": [1, 4], // Ma, Do
      "3x per week": [1, 3, 5], // Ma, Wo, Vr
      "4x per week": [1, 2, 4, 5], // Ma, Di, Do, Vr
      "5x per week": [1, 2, 3, 4, 5], // Ma-Vr
      "6x per week": [1, 2, 3, 4, 5, 6], // Ma-Za
    };
  
    const allowedWeekdays = allowedWeekdaysMap[repeat] || [];
  
    const matchingDates = allDates
      .filter((date) => allowedWeekdays.includes((date.getDay() + 6) % 7)) // Maandag = 0
      .map((date) => formatDateKey(date));
  
    return matchingDates.length > 0
      ? matchingDates
      : allDates.map((date) => formatDateKey(date));
}
