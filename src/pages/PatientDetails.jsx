import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import KineSidebar from "../components/KineSidebar";
import "../components/ExerciseCard.css";
import "../assets/css/exercises.css";
import "../assets/css/patient-details.css";
import "../assets/css/kine-dashboard.css";

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPastOrCompleted(dateString, isCompleted) {
  if (isCompleted) return true;

  const today = startOfToday();
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

function formatDateForInput(dateValue) {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function getMonthLabel(date) {
  return date.toLocaleDateString("nl-BE", {
    month: "long",
    year: "numeric",
  });
}

function getCalendarDays(currentMonth) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];

  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function calculateAge(birthDate) {
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

function formatDisplayDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("nl-BE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return (
    date.toLocaleDateString("nl-BE", {
      day: "2-digit",
      month: "short",
    }) +
    " · " +
    date.toLocaleTimeString("nl-BE", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

function getCategoryClass(category) {
  if (category === "Mobiliteit") return "exerciseTag--yellow";
  if (category === "Flexibiliteit") return "exerciseTag--pink";
  if (category === "Kracht") return "exerciseTag--blue";
  if (category === "Balans") return "exerciseTag--green";
  return "exerciseTag--blue";
}

function getDifficultyIcon(difficulty) {
  if (difficulty === "Makkelijk") return "/images/difficulty-easy.svg";
  if (difficulty === "Gemiddeld") return "/images/difficulty-medium.svg";
  if (difficulty === "Moeilijk") return "/images/difficulty-hard.svg";
  return "/images/difficulty-easy.svg";
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDaysBetween(start, end) {
  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function generateScheduledDates(startDateStr, endDateStr, repeat) {
  if (!startDateStr) return [];

  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : new Date(startDateStr);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (end < start) return [];

  const allDates = getDaysBetween(start, end);

  // "Nooit" = elke dag tussen start en einde
  if (repeat === "Nooit") {
    return allDates.map((date) => formatDateKey(date));
  }

  // "Wekelijks" = zelfde weekdag als startdatum, elke 7 dagen
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
    "2x per week": [1, 4],
    "3x per week": [1, 3, 5],
    "4x per week": [1, 2, 4, 5],
    "5x per week": [1, 2, 3, 4, 5],
    "6x per week": [1, 2, 3, 4, 5, 6],
  };

  const allowedWeekdays = allowedWeekdaysMap[repeat] || [1];

  const matchingDates = allDates
    .filter((date) => allowedWeekdays.includes(date.getDay()))
    .map((date) => formatDateKey(date));

  return matchingDates.length > 0
    ? matchingDates
    : allDates.map((date) => formatDateKey(date));
}

function detectRepeatFromDates(dates) {
  if (!dates || dates.length <= 1) return "Nooit";

  const sortedDates = [...dates]
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b);

  if (sortedDates.length <= 1) return "Nooit";

  const weekdayCounts = {};

  for (const date of sortedDates) {
    const weekday = date.getDay();
    weekdayCounts[weekday] = (weekdayCounts[weekday] || 0) + 1;
  }

  const usedWeekdays = Object.keys(weekdayCounts).length;

  if (usedWeekdays === 1) return "Wekelijks";
  if (usedWeekdays === 2) return "2x per week";
  if (usedWeekdays === 3) return "3x per week";
  if (usedWeekdays === 4) return "4x per week";
  if (usedWeekdays === 5) return "5x per week";
  if (usedWeekdays >= 6) return "6x per week";

  return "Nooit";
}

export default function PatientDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState([]);
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);


  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [noteTitle, setNoteTitle] = useState("");

  const [activeTab, setActiveTab] = useState("overzicht");

  const [editingPatient, setEditingPatient] = useState(null);
  const [editName, setEditName] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [archivePatient, setArchivePatient] = useState(null);
  const [archiving, setArchiving] = useState(false);
  
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [myExercises, setMyExercises] = useState([]);
  const [addExerciseStep, setAddExerciseStep] = useState(1);
  const [exerciseTab, setExerciseTab] = useState("bibliotheek");
  const [exerciseCategory, setExerciseCategory] = useState("Alles");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [assignmentStartDate, setAssignmentStartDate] = useState("");
  const [assignmentEndDate, setAssignmentEndDate] = useState("");
  const [assignmentRepeat, setAssignmentRepeat] = useState("Elke dag");
  const [applyToAllExercises, setApplyToAllExercises] = useState(true);
  const [savingExercise, setSavingExercise] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);

  const [scheduledExercises, setScheduledExercises] = useState([]);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [deletingExercise, setDeletingExercise] = useState(false);

  const [openProgramMenuId, setOpenProgramMenuId] = useState(null);
  const [editingProgramExercise, setEditingProgramExercise] = useState(null);
  const [programStartDate, setProgramStartDate] = useState("");
  const [programEndDate, setProgramEndDate] = useState("");
  const [programRepeat, setProgramRepeat] = useState("Nooit");
  const [savingProgramEdit, setSavingProgramEdit] = useState(false);

  const [notesEnabled, setNotesEnabled] = useState(true);
  const [notes, setNotes] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);

  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));

  const calendarDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);

  useEffect(() => {
    initializePage();
  }, [id]);

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }

    if (location.state?.selectedDate) {
      setSelectedDate(location.state.selectedDate);
      const date = new Date(location.state.selectedDate);
      if (!Number.isNaN(date.getTime())) {
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    }
  }, [location.state]);

  useEffect(() => {
    if (userId) {
      loadNotesSafe(userId);
    }
  }, [profile, userId]);

  useEffect(() => {
    setOpenProgramMenuId(null);
  }, [selectedDate, activeTab]);

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

      setUserId(user.id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData || profileData.role !== "kinesist") {
        navigate("/");
        return;
      }

      setProfile(profileData);

      await Promise.all([
        loadPatient(user.id),
        loadPatientExercises(),
        loadExerciseLibrary(user.id),
        loadNotesSafe(user.id),
        loadFavorites(user.id),
      ]);
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt kon niet geladen worden.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPatient(currentUserId) {
    const authUserId = currentUserId || userId;

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .eq("kinesist_id", authUserId)
      .single();

    if (error) throw error;

    setPatient(data || null);
  }

  async function toggleFavorite(exerciseId) {
    if (!userId || !exerciseId) return;
  
    try {
      setFavoriteLoadingId(exerciseId);
      setErrorMessage("");
  
      const { data: existingFavorite, error: checkError } = await supabase
        .from("favorite_exercises")
        .select("id")
        .eq("user_id", userId)
        .eq("exercise_id", exerciseId)
        .maybeSingle();
  
      if (checkError) throw checkError;
  
      if (existingFavorite) {
        const { error: deleteError } = await supabase
          .from("favorite_exercises")
          .delete()
          .eq("user_id", userId)
          .eq("exercise_id", exerciseId);
  
        if (deleteError) throw deleteError;
  
        setFavoriteExerciseIds((prev) =>
          prev.filter((id) => id !== exerciseId)
        );
      } else {
        const { error: insertError } = await supabase
          .from("favorite_exercises")
          .insert({
            user_id: userId,
            exercise_id: exerciseId,
          });
  
        if (insertError) throw insertError;
  
        setFavoriteExerciseIds((prev) => [...prev, exerciseId]);
      }
    } catch (error) {
      console.error(error);
      setErrorMessage("Favoriet aanpassen is mislukt.");
    } finally {
      setFavoriteLoadingId(null);
    }
  }

  async function loadFavorites(currentUserId) {
    const authUserId = currentUserId || userId;
    if (!authUserId) return;
  
    const { data, error } = await supabase
      .from("favorite_exercises")
      .select("exercise_id")
      .eq("user_id", authUserId);
  
    if (error) throw error;
  
    setFavoriteExerciseIds((data || []).map((item) => item.exercise_id));
  }

  async function loadPatientExercises() {
    const { data, error } = await supabase
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
      .eq("patient_id", id)
      .order("scheduled_date", { ascending: true });

    if (error) throw error;

    setScheduledExercises(data || []);
  }

  async function loadExerciseLibrary(currentUserId) {
    const authUserId = currentUserId || userId;

    const [libraryRes, myRes] = await Promise.all([
      supabase
        .from("exercises")
        .select("*")
        .eq("is_public", true)
        .order("title", { ascending: true }),
      supabase
        .from("exercises")
        .select("*")
        .eq("created_by", authUserId)
        .order("created_at", { ascending: false }),
    ]);

    if (libraryRes.error) throw libraryRes.error;
    if (myRes.error) throw myRes.error;

    setExerciseLibrary(libraryRes.data || []);
    setMyExercises(myRes.data || []);
  }

  const activeExerciseDataset = useMemo(() => {
    return exerciseTab === "bibliotheek" ? exerciseLibrary : myExercises;
  }, [exerciseTab, exerciseLibrary, myExercises]);

  const filteredExercises = useMemo(() => {
    const normalizedSearch = exerciseSearch.trim().toLowerCase();

    return activeExerciseDataset.filter((exercise) => {
      const title = (exercise.title || "").toLowerCase();
      const description = (exercise.description || "").toLowerCase();
      const matchesSearch =
        normalizedSearch === "" ||
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch);
      const matchesCategory =
        exerciseCategory === "Alles" || exercise.category === exerciseCategory;

      return matchesSearch && matchesCategory;
    });
  }, [activeExerciseDataset, exerciseSearch, exerciseCategory]);

  async function loadNotesSafe(currentUserId) {
    const authUserId = currentUserId || userId;

    try {
      const { data, error } = await supabase
        .from("patient_notes")
        .select("id, patient_id, author_id, title, note, created_at")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("patient_notes load error:", error);
        throw error;
      }

      setNotesEnabled(true);

      const notesWithAuthor = (data || []).map((item) => ({
        ...item,
        author: {
          full_name:
            item.author_id === authUserId
              ? profile?.full_name || "Jij"
              : "Kinesist",
        },
      }));

      setNotes(notesWithAuthor);
    } catch (error) {
      console.error("loadNotesSafe unexpected error:", error);
      setNotesEnabled(true);
      setNotes([]);
      setErrorMessage("Logboek kon niet geladen worden.");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  function openEditModal() {
    if (!patient) return;

    setEditingPatient(patient);
    setEditName(patient.name || "");
    setEditParentName(patient.parent_name || "");
    setEditGoal(patient.goal || "");
    setEditBirthDate(patient.birth_date || "");
    setEditEmail(patient.parent_email || "");
    setEditPhone(patient.parent_phone || "");
  }

  function closeEditModal() {
    setEditingPatient(null);
    setEditName("");
    setEditParentName("");
    setEditGoal("");
    setEditBirthDate("");
    setEditEmail("");
    setEditPhone("");
  }

  function openAddExerciseModal() {
    const startDate = selectedDate || formatDateKey(new Date());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);

    setAddExerciseStep(1);
    setExerciseTab("bibliotheek");
    setExerciseCategory("Alles");
    setExerciseSearch("");
    setSelectedExercises([]);
    setAssignmentStartDate(startDate);
    setAssignmentEndDate(formatDateKey(endDate));
    setAssignmentRepeat("Elke dag");
    setApplyToAllExercises(true);
    setShowAddExerciseModal(true);
  }

  function closeAddExerciseModal() {
    setShowAddExerciseModal(false);
    setAddExerciseStep(1);
    setExerciseTab("bibliotheek");
    setExerciseCategory("Alles");
    setExerciseSearch("");
    setSelectedExercises([]);
    setAssignmentStartDate("");
    setAssignmentEndDate("");
    setAssignmentRepeat("Elke dag");
    setApplyToAllExercises(true);
  }

  function toggleExerciseSelection(exercise) {
    setSelectedExercises((prev) => {
      const exists = prev.some((item) => item.id === exercise.id);

      if (exists) {
        return prev.filter((item) => item.id !== exercise.id);
      }

      return [...prev, exercise];
    });
  }

  function handleAddExerciseNext() {
    if (selectedExercises.length === 0) {
      setErrorMessage("Selecteer minstens één oefening.");
      return;
    }

    setErrorMessage("");
    setAddExerciseStep(2);
  }

  function handleAddExerciseBack() {
    if (addExerciseStep === 2) {
      setAddExerciseStep(1);
      return;
    }

    closeAddExerciseModal();
  }

  function openNoteModal(note = null) {
    setEditingNote(note);
    setNoteText(note?.note || "");
    setNoteTitle(note?.title || "");
    setShowNoteModal(true);
  }

  function closeNoteModal() {
    setEditingNote(null);
    setNoteTitle("");
    setNoteText("");
    setShowNoteModal(false);
  }

  function openProgramEditModal(item) {
    const relatedDates = scheduledExercises
      .filter((exerciseItem) => exerciseItem.exercise_id === item.exercise_id)
      .map((exerciseItem) => exerciseItem.scheduled_date)
      .sort();

    const start = relatedDates[0] || item.originalScheduledDate;
    const end = relatedDates[relatedDates.length - 1] || item.originalScheduledDate;
    const detectedRepeat = detectRepeatFromDates(relatedDates);

    setEditingProgramExercise(item);
    setProgramStartDate(formatDateForInput(start));
    setProgramEndDate(formatDateForInput(end));
    setProgramRepeat(detectedRepeat);
    setOpenProgramMenuId(null);
  }

  function closeProgramEditModal() {
    setEditingProgramExercise(null);
    setProgramStartDate("");
    setProgramEndDate("");
    setProgramRepeat("Nooit");
  }

  async function handleAddExercise(e) {
    e.preventDefault();

    if (selectedExercises.length === 0) {
      setErrorMessage("Selecteer minstens één oefening.");
      return;
    }

    if (!assignmentStartDate || !assignmentEndDate) {
      setErrorMessage("Vul een start- en einddatum in.");
      return;
    }

    const scheduledDates = generateScheduledDates(
      assignmentStartDate,
      assignmentEndDate,
      assignmentRepeat
    );

    if (scheduledDates.length === 0) {
      setErrorMessage("Er konden geen oefendagen gegenereerd worden.");
      return;
    }

    try {
      setSavingExercise(true);
      setErrorMessage("");

      const exercisesToAssign = applyToAllExercises
        ? selectedExercises
        : selectedExercises.slice(0, 1);

      const rows = exercisesToAssign.flatMap((exercise) =>
        scheduledDates.map((date) => ({
          patient_id: id,
          exercise_id: exercise.id,
          scheduled_date: date,
          is_completed: false,
        }))
      );

      const { error } = await supabase.from("patient_exercises").insert(rows);

      if (error) throw error;

      await loadPatientExercises();
      setSelectedDate(assignmentStartDate);
      closeAddExerciseModal();
      setActiveTab("programma");
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefening toevoegen is mislukt.");
    } finally {
      setSavingExercise(false);
    }
  }

  async function handleSaveProgramEdit() {
    if (!editingProgramExercise) return;
  
    try {
      setSavingProgramEdit(true);
      setErrorMessage("");
  
      if (!programStartDate || !programEndDate) {
        setErrorMessage("Vul een start- en einddatum in.");
        return;
      }
  
      if (new Date(programEndDate) < new Date(programStartDate)) {
        setErrorMessage("De einddatum mag niet voor de startdatum liggen.");
        return;
      }
  
      const scheduledDates = generateScheduledDates(
        programStartDate,
        programEndDate,
        programRepeat
      );
  
      if (scheduledDates.length === 0) {
        setErrorMessage("Er konden geen oefendagen gegenereerd worden.");
        return;
      }
  
      // Eerst volledig bestaand programma van deze oefening verwijderen
      const { error: deleteError } = await supabase
        .from("patient_exercises")
        .delete()
        .eq("patient_id", id)
        .eq("exercise_id", editingProgramExercise.exercise_id);
  
      if (deleteError) throw deleteError;
  
      // Daarna nieuw schema toevoegen
      const rows = scheduledDates.map((date) => ({
        patient_id: id,
        exercise_id: editingProgramExercise.exercise_id,
        scheduled_date: date,
        is_completed: false,
      }));
  
      const { error: insertError } = await supabase
        .from("patient_exercises")
        .insert(rows);
  
      if (insertError) throw insertError;
  
      await loadPatientExercises();
  
      setSelectedDate(programStartDate);
      setCurrentMonth(
        new Date(
          new Date(programStartDate).getFullYear(),
          new Date(programStartDate).getMonth(),
          1
        )
      );
  
      setActiveTab("programma");
      closeProgramEditModal();
    } catch (error) {
      console.error(error);
      setErrorMessage("Programma aanpassen is mislukt.");
    } finally {
      setSavingProgramEdit(false);
    }
  }

  async function handleRemoveExerciseFromProgram(exerciseItem) {
    try {
      setDeletingExercise(true);
      setErrorMessage("");
  
      const { error } = await supabase
        .from("patient_exercises")
        .delete()
        .eq("patient_id", id)
        .eq("exercise_id", exerciseItem.exercise_id);
  
      if (error) throw error;
  
      await loadPatientExercises();
      setProgramToDelete(null);
      setOpenProgramMenuId(null);
    } catch (error) {
      console.error(error);
      setErrorMessage("Volledig programma verwijderen is mislukt.");
    } finally {
      setDeletingExercise(false);
    }
  }

  async function handleDeleteExercise(itemId) {
    try {
      setDeletingExercise(true);
      setErrorMessage("");
  
      const { error } = await supabase
        .from("patient_exercises")
        .delete()
        .eq("id", itemId);
  
      if (error) throw error;
  
      await loadPatientExercises();
      setExerciseToDelete(null);
      setOpenProgramMenuId(null);
    } catch (error) {
      console.error(error);
      setErrorMessage("Oefening verwijderen is mislukt.");
    } finally {
      setDeletingExercise(false);
    }
  }

  async function handleUpdatePatient(e) {
    e.preventDefault();

    if (!editingPatient) return;

    try {
      setSavingEdit(true);
      setErrorMessage("");

      const trimmedName = editName.trim();
      const trimmedGoal = editGoal.trim();
      const trimmedParentName = editParentName.trim();
      const trimmedEmail = editEmail.trim();
      const trimmedPhone = editPhone.trim();

      if (!trimmedName) {
        setErrorMessage("Naam is verplicht.");
        setSavingEdit(false);
        return;
      }

      const { error } = await supabase
        .from("patients")
        .update({
          name: trimmedName,
          goal: trimmedGoal || null,
          birth_date: editBirthDate || null,
          parent_name: trimmedParentName || null,
          parent_email: trimmedEmail || null,
          parent_phone: trimmedPhone || null,
        })
        .eq("id", editingPatient.id);

      if (error) throw error;

      await loadPatient(userId);
      closeEditModal();
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt bewerken is mislukt.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleArchivePatient() {
    if (!archivePatient) return;

    try {
      setArchiving(true);
      setErrorMessage("");

      const { error } = await supabase
        .from("patients")
        .update({ is_archived: true })
        .eq("id", archivePatient.id);

      if (error) throw error;

      navigate("/kinesist/dashboard");
    } catch (error) {
      console.error(error);
      setErrorMessage("Patiënt archiveren is mislukt.");
    } finally {
      setArchiving(false);
    }
  }

  async function handleSaveNote(e) {
    e.preventDefault();
  
    const trimmedTitle = noteTitle.trim();
    const trimmedText = noteText.trim();
  
    if (!trimmedTitle) {
      setErrorMessage("Een titel is verplicht.");
      return;
    }
  
    if (!trimmedText) {
      setErrorMessage("Een notitie mag niet leeg zijn.");
      return;
    }
  
    if (!notesEnabled) {
      setErrorMessage("De tabel patient_notes bestaat nog niet.");
      return;
    }
  
    try {
      setSavingNote(true);
      setErrorMessage("");
  
      if (editingNote) {
        const { error } = await supabase
          .from("patient_notes")
          .update({
            title: trimmedTitle,
            note: trimmedText,
          })
          .eq("id", editingNote.id);
  
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("patient_notes")
          .insert({
            patient_id: id,
            author_id: userId,
            title: trimmedTitle,
            note: trimmedText,
          });
  
        if (error) throw error;
      }
  
      await loadNotesSafe(userId);
      closeNoteModal();
    } catch (error) {
      console.error("handleSaveNote error:", error);
      setErrorMessage(error.message || "Notitie opslaan is mislukt.");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      setDeletingNoteId(noteId);
      setErrorMessage("");
  
      const { error } = await supabase
        .from("patient_notes")
        .delete()
        .eq("id", noteId);
  
      if (error) throw error;
  
      await loadNotesSafe(userId);
  
      setNoteToDelete(null);
      setShowNoteModal(false);
      setEditingNote(null);
      setNoteText("");
    } catch (error) {
      console.error(error);
      setErrorMessage("Notitie verwijderen is mislukt.");
    } finally {
      setDeletingNoteId(null);
    }
  }

  const exerciseSchedule = useMemo(() => {
    const grouped = {};

    for (const item of scheduledExercises) {
      const dateKey = item.scheduled_date;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push({
        id: item.id,
        exercise_id: item.exercise_id,
        originalScheduledDate: item.scheduled_date,
        title: item.exercise?.title || "",
        category: item.exercise?.category || "",
        difficulty: item.exercise?.difficulty || "Makkelijk",
        duration: item.exercise?.duration_minutes
          ? `${item.exercise.duration_minutes} min`
          : "-",
        reps: item.exercise?.repetitions
          ? `${item.exercise.repetitions} herhalingen`
          : "-",
        image: item.exercise?.image_url || "/images/exercise-1.png",
        tagClass: getCategoryClass(item.exercise?.category),
        is_completed: !!item.is_completed,
        is_past: new Date(item.scheduled_date) < startOfToday(),
        is_locked: isPastOrCompleted(item.scheduled_date, item.is_completed),
      });
    }

    return grouped;
  }, [scheduledExercises]);

  const selectedDayExercises = useMemo(() => {
    return exerciseSchedule[selectedDate] || [];
  }, [exerciseSchedule, selectedDate]);

  const visibleMonthLabel = useMemo(
    () => getMonthLabel(currentMonth),
    [currentMonth]
  );

  const stats = useMemo(() => {
    const todayKey = formatDateKey(new Date());
    const weekStart = startOfWeekMonday();
    const weekStartKey = formatDateKey(weekStart);

    const todayItems = scheduledExercises.filter(
      (item) => item.scheduled_date === todayKey
    );
    const todayCompleted = todayItems.filter((item) => item.is_completed).length;

    const totalAssigned = scheduledExercises.length;
    const totalCompleted = scheduledExercises.filter(
      (item) => item.is_completed
    ).length;

    const thisWeekItems = scheduledExercises.filter(
      (item) => item.scheduled_date >= weekStartKey && item.scheduled_date <= todayKey
    );

    const completedDates = Array.from(
      new Set(
        scheduledExercises
          .filter((item) => item.is_completed)
          .map((item) => item.scheduled_date)
      )
    ).sort((a, b) => new Date(b) - new Date(a));

    let streak = 0;
    let cursor = startOfToday();

    while (true) {
      const key = formatDateKey(cursor);
      if (completedDates.includes(key)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    const weeklyCompletion =
      thisWeekItems.length > 0
        ? Math.round(
            (thisWeekItems.filter((item) => item.is_completed).length /
              thisWeekItems.length) *
              100
          )
        : 0;

    return {
      todayCompleted,
      todayTotal: todayItems.length,
      totalAssigned,
      totalCompleted,
      streak,
      weeklyCompletion,
    };
  }, [scheduledExercises]);

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

    return Object.values(map)
      .map((entry) => ({
        ...entry,
        percentage:
          entry.total > 0
            ? Math.round((entry.completed / entry.total) * 100)
            : 0,
        progressClass:
          entry.category === "Balans"
            ? "progressBlue"
            : entry.category === "Kracht"
            ? "progressGreen"
            : entry.category === "Motoriek"
            ? "progressYellow"
            : entry.category === "Flexibiliteit"
            ? "progressPink"
            : "progressBlue",
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }, [scheduledExercises]);

  const recentCompletedExercises = useMemo(() => {
    return [...scheduledExercises]
      .filter((item) => item.is_completed)
      .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))
      .slice(0, 6);
  }, [scheduledExercises]);

  if (loading) {
    return (
      <div className="kineDash">
        <KineSidebar onLogout={handleLogout} />
        <main className="kineDashMain">
          <div className="kineDashLoading">
            <img src="/images/monkey-load.png" style={{ width: "100px", height: "100px" }} alt="" />
            <p>laden . . .</p>
          </div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="kineDashLoading">
        <p>{errorMessage || "Patiënt niet gevonden."}</p>
      </div>
    );
  }

  return (
    <div className="kineDash">
      <KineSidebar onLogout={handleLogout} />

      <main className="patientDetailsMain">
        <div className="patientDetailsTopbar">
          <button
            type="button"
            className="patientBack"
            onClick={() => navigate("/kinesist/dashboard")}
          >
            <img src="/images/back-icon.svg" alt="back" />
            <span>Terug naar overzicht</span>
          </button>

          <div className="patientTopActions">
            <button
              type="button"
              className="btn-primary-small"
              onClick={openEditModal}
            >
              <img src="/images/edit.svg" alt="" />
              <span>Bewerken</span>
            </button>

            <button
              type="button"
              className="patientArchiveBtn"
              onClick={() => setArchivePatient(patient)}
            >
              <img src="/images/archive.svg" alt="" />
              <span>Archiveren</span>
            </button>
          </div>
        </div>

        {errorMessage && <p className="kineError">{errorMessage}</p>}

        <section className="patientHeroCard">
          <div className="patientHeroTop">
            <div className="patientHeroLeft">
              <div className="patientAvatarBig">{getInitials(patient.name)}</div>

              <div className="patientHeroInfo">
                <div className="patientHeroNameRow">
                  <h1>{patient.name}</h1>
                  <span>{calculateAge(patient.birth_date)} jaar</span>
                </div>

                <p>Startdatum: {formatDisplayDate(patient.created_at)}</p>
                <p>{patient.goal || "-"}</p>
              </div>
            </div>

            <div className="patientHeroQr">
              <div className="patientQrBox">
                {patient.activation_code || "—"}
              </div>
            </div>
          </div>

          <div className="patientHeroBottom">
            <div>
              <strong>{patient.parent_name || "Geen ouder ingevuld"}</strong>
              <span>Ouder/verzorger</span>
            </div>

            <div className="patientContactInfo">
              <span>{patient.parent_phone || "-"}</span>
              <span>{patient.parent_email || "-"}</span>
            </div>
          </div>
        </section>

        <button
          type="button"
          className="patientAddExerciseBtn"
          onClick={() => navigate(`/patient/${id}/oefening-toevoegen`)}
        >
          Oefening toevoegen
          <img src="/images/plus.svg" alt="" />
        </button>

        <section className="patientStatsSection">
          <div className="patientStatsHeader">
            <h2>Status</h2>
            <button type="button" className="patientFilterBtn">
              deze week
            </button>
          </div>

          <div className="patientStatsGrid">
            <div className="patientStatItem">
              <div className="statFlex">
                <img src="/images/streak.svg" alt="" />
                <strong>{stats.streak}</strong>
              </div>
              <span>Streak</span>
            </div>

            <div className="patientStatItem">
              <div className="statFlex">
                <img src="/images/task.svg" alt="" />
                <strong>
                  {stats.todayCompleted}/{stats.todayTotal}
                </strong>
              </div>
              <span>Vandaag voltooid</span>
            </div>

            <div className="patientStatItem">
              <div className="statFlex">
                <img src="/images/progress.svg" alt="" />
                <strong>
                  {stats.totalCompleted}/{stats.totalAssigned}
                </strong>
              </div>
              <span>Totaal voltooid</span>
            </div>
          </div>
        </section>

        <section className="patientTabs">
          <button
            className={activeTab === "overzicht" ? "is-active" : ""}
            onClick={() => setActiveTab("overzicht")}
          >
            Overzicht
          </button>
          <button
            className={activeTab === "programma" ? "is-active" : ""}
            onClick={() => setActiveTab("programma")}
          >
            Programma
          </button>
          <button
            className={activeTab === "logboek" ? "is-active" : ""}
            onClick={() => setActiveTab("logboek")}
          >
            Logboek
          </button>
        </section>

        {activeTab === "overzicht" && (
          <>
            <section className="patientProgressSection">
              <div className="patientSectionHeader">
                <h3>Voortgang per categorie</h3>
                <button type="button" className="patientFilterBtn">
                  live data
                </button>
              </div>

              <div className="patientProgressList">
                {categoryProgress.length === 0 ? (
                  <div className="programEmptyState">
                    <strong>Nog geen categoriegegevens</strong>
                    <p>Koppel eerst oefeningen aan deze patiënt.</p>
                  </div>
                ) : (
                  categoryProgress.map((item) => (
                    <div key={item.category} className="patientProgressItem">
                      <div className="patientProgressTop">
                        <span>{item.category}</span>
                        <div className="patientProgressMeta">
                          <small>
                            {item.completed}/{item.total} voltooid
                          </small>
                          <strong>{item.percentage}%</strong>
                        </div>
                      </div>
                      <div className={`progressBar ${item.progressClass}`}>
                        <div style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="patientExercisesSection">
              <div className="patientSectionHeader">
                <h3>Recent voltooide oefeningen</h3>
                <button type="button" className="patientFilterBtn">
                  laatste 6
                </button>
              </div>

              <div className="exerciseCardList">
                {recentCompletedExercises.length === 0 ? (
                  <div className="programEmptyState">
                    <strong>Nog geen voltooide oefeningen</strong>
                    <p>
                      Zodra oefeningen voltooid worden, verschijnen ze hier.
                    </p>
                  </div>
                ) : (
                  recentCompletedExercises.map((item) => (
                    <div key={item.id} className="exerciseCard">
                      <img
                        src={item.exercise?.image_url || "/images/exercise-1.png"}
                        alt=""
                      />
                      <div>
                        <strong>{item.exercise?.title || "Oefening"}</strong>
                        <span>{item.exercise?.category || "Overig"}</span>
                        <p>
                          {item.exercise?.duration_minutes
                            ? `${item.exercise.duration_minutes} min`
                            : "-"}{" "}
                          ·{" "}
                          {item.exercise?.repetitions
                            ? `${item.exercise.repetitions} herhalingen`
                            : "-"}
                        </p>
                        <small>Voltooid op {formatDisplayDate(item.scheduled_date)}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === "programma" && (
          <section className="patientProgramSection">
            <div className="patientProgramHeader">
              <h3>Actief oefenprogramma</h3>

              <div className="patientProgramMonth">
                <img src="/images/calendar-blue.svg" alt="" />
                <span>{visibleMonthLabel}</span>
              </div>
            </div>

            <div className="patientProgramGrid">
              <div className="programCalendarCard">
                <div className="programCalendarTop">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() - 1,
                          1
                        )
                      )
                    }
                  >
                    <img src="/images/arrowSL.svg" alt="" />
                  </button>

                  <h4>{visibleMonthLabel}</h4>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() + 1,
                          1
                        )
                      )
                    }
                  >
                    <img src="/images/arrowSR.svg" alt="" />
                    </button>
                </div>

                <div className="programCalendarWeekdays">
                  <span>M</span>
                  <span>D</span>
                  <span>W</span>
                  <span>D</span>
                  <span>V</span>
                  <span>Z</span>
                  <span>Z</span>
                </div>

                <div className="programCalendarGrid">
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="calendarDay is-empty"
                        ></div>
                      );
                    }

                    const dateKey = formatDateKey(date);
                    const isSelected = selectedDate === dateKey;
                    const isToday = dateKey === formatDateKey(today);
                    const dayExercises = exerciseSchedule[dateKey] || [];

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        className={`calendarDay ${isSelected ? "is-active" : ""} ${
                          isToday ? "is-today" : ""
                        }`}
                        onClick={() => setSelectedDate(dateKey)}
                      >
                        <span>{date.getDate()}</span>

                        {dayExercises.length > 0 && (
                          <div className="calendarDots">
                            {dayExercises.map((_, i) => (
                              <i key={i}></i>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="programExerciseList">
                {selectedDayExercises.length === 0 ? (
                  <div className="programEmptyState">
                    <strong>Geen oefeningen gepland</strong>
                    <p>Er zijn geen oefeningen gekoppeld aan deze dag.</p>
                  </div>
                ) : (
                  selectedDayExercises.map((exercise) => (
                    <div
                        key={exercise.id}
                        className={`programExerciseCard ${
                          exercise.is_past ? "is-past" : ""
                        } ${exercise.is_completed ? "is-completed" : ""} ${
                          exercise.is_locked ? "is-disabled" : ""
                        }`}                        
                        onClick={() => {
                          if (exercise.is_locked) return;

                          navigate(
                            `/kinesist/oefeningen/${exercise.exercise_id}?patientId=${id}`
                          );
                        }}
                      >
                        {exercise.is_completed && (
                        <div className="exerciseCompletedBadge">
                          <p>✓</p> 
                          <p>Voltooid</p>
                        </div>
                      )}
                      <img
                        className="programExerciseThumb"
                        src={exercise.image}
                        alt={exercise.title}
                      />

                      <div className="programExerciseContent">
                        <div className="programExerciseTopRow">
                          <strong>{exercise.title}</strong>

                          <div
                            className="programExerciseTopActions"
                            onClick={(e) => e.stopPropagation()}
                          >
                           <button
                                  type="button"
                                  className="exerciseIconBtn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (exercise.is_locked) return;
                                    toggleFavorite(exercise.exercise_id);
                                  }}
                                  disabled={favoriteLoadingId === exercise.exercise_id || exercise.is_locked}
                                  title={
                                    exercise.is_locked
                                      ? "Deze oefening kan niet meer aangepast worden"
                                      : "Favoriet"
                                  }
                                >
                              <img
                                src={
                                  favoriteExerciseIds.includes(exercise.exercise_id)
                                    ? "/images/favorite-filled.svg"
                                    : "/images/favorite.svg"
                                }
                                alt="Favoriet"
                              />
                            </button>
                            <div className="programMenuWrap">
                            <button
                                type="button"
                                className="programDotsBtn"
                                onClick={() => {
                                  if (exercise.is_locked) return;

                                  setOpenProgramMenuId((prev) =>
                                    prev === exercise.id ? null : exercise.id
                                  );
                                }}
                                disabled={exercise.is_locked}
                                title={
                                  exercise.is_locked
                                    ? "Deze oefening kan niet meer aangepast worden"
                                    : "Meer acties"
                                }
                              > 
                                ⋯
                              </button>

                              {openProgramMenuId === exercise.id && !exercise.is_locked && (
                                <div className="programDropdownMenu">
                                  <button
                                    type="button"
                                    onClick={() => openProgramEditModal(exercise)}
                                  >
                                    <span>✏️</span>
                                    <span>Programma aanpassen</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExerciseToDelete(exercise)}
                                  >
                                    <span>🗑️</span>
                                    <span> Oefening verwijderen</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setProgramToDelete(exercise)}
                                  >
                                    <span>❌</span>
                                    <span> Volledig programma verwijderen</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="programExerciseMetaRow">
                          <span className={`exerciseTag ${exercise.tagClass}`}>
                            {exercise.category}
                          </span>

                          <img
                            className="programDifficultyIcon"
                            src={getDifficultyIcon(exercise.difficulty)}
                            alt={exercise.difficulty}
                          />
                        </div>

                        <p>
                          {exercise.duration} · {exercise.reps}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "logboek" && (
          <section className="patientLogbookSection">
            <div className="patientLogbookTop">
              <div>
                <h3>Notities & observaties</h3>
                <p>
                  Deze notities zijn uitsluitend bedoeld voor intern gebruik en
                  zijn niet zichtbaar voor patiënten.
                </p>
              </div>

              {notesEnabled && (
                <button
                  type="button"
                  className="patientNewNoteBtn"
                  onClick={() => openNoteModal()}
                >
                  Nieuwe notitie +
                </button>
              )}
            </div>

            {!notesEnabled ? (
              <div className="programEmptyState">
                <strong>Logboek nog niet geactiveerd</strong>
                <p>
                  Maak eerst een tabel <code>patient_notes</code> in Supabase.
                </p>
              </div>
            ) : notes.length === 0 ? (
              <div className="programEmptyState">
                <strong>Nog geen notities</strong>
                <p>Voeg een eerste observatie toe voor deze patiënt.</p>
              </div>
            ) : (
              <div className="logbookList">
                {notes.map((note) => (
                  <div key={note.id} className="logbookCard">
                    <div
                      className="logbookEdit"
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <button
                        type="button"
                        onClick={() => openNoteModal(note)}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                        }}
                      >
                        <img src="/images/edit-pink.svg" alt="" />
                      </button>
                    </div>

                    <small>{formatDateTime(note.created_at)}</small>
                    <strong>{note.title || "Notitie"}</strong>
                    <p>{note.note}</p>                    
                    <div className="logbookFooter">
                      {note.author?.full_name || profile?.full_name || "Kinesist"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {editingPatient && (
        <div className="kineModalOverlay" onClick={closeEditModal}>
          <div
            className="kineModal kineModal--large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kineModalHeader">
              <h3>Patiënt bewerken</h3>
              <button
                type="button"
                className="kineModalClose"
                onClick={closeEditModal}
              >
                ×
              </button>
            </div>

            <div className="kineModalBody">
              <div className="kineEditIntro">
                <div className="kineEditAvatar">{getInitials(editName)}</div>
                <span>{editName || "Naam patiënt"}</span>
              </div>

              <form className="kineEditForm" onSubmit={handleUpdatePatient}>
                <div className="kineField">
                  <label>Naam van het kind</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="kineField">
                  <label>Naam van de ouder</label>
                  <input
                    type="text"
                    value={editParentName}
                    onChange={(e) => setEditParentName(e.target.value)}
                  />
                </div>

                <div className="kineField kineField--small">
                  <label>Geboortedatum</label>
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                  />
                </div>

                <div className="kineField">
                  <label>Behandeldoel</label>
                  <input
                    type="text"
                    value={editGoal}
                    onChange={(e) => setEditGoal(e.target.value)}
                  />
                </div>

                <div className="kineField">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>

                <div className="kineField">
                  <label>Telefoonnummer</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="kineModalFooter">
                  <button
                    type="button"
                    className="kineTextAction"
                    onClick={closeEditModal}
                  >
                    Annuleren
                  </button>

                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={savingEdit}
                  >
                    {savingEdit ? "Opslaan..." : "Opslaan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {archivePatient && (
        <div
          className="kineModalOverlay"
          onClick={() => setArchivePatient(null)}
        >
          <div
            className="kineModal kineModal--archive"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kineModalHeader">
              <h3>Patiënt archiveren</h3>
              <button
                type="button"
                className="kineModalClose"
                onClick={() => setArchivePatient(null)}
              >
                ×
              </button>
            </div>

            <div className="kineModalBody">
              <p className="kineArchiveText">
                De patiënt wordt gearchiveerd en blijft bewaard in het systeem.
                Je kan deze later altijd terug bekijken of herstellen.
              </p>

              <div className="kineArchiveActions">
                <button
                  type="button"
                  className="kineTextAction"
                  onClick={() => setArchivePatient(null)}
                >
                  Annuleren
                </button>

                <button
                  type="button"
                  className="btn-archive"
                  onClick={handleArchivePatient}
                  disabled={archiving}
                >
                  {archiving ? "Archiveren..." : "Archiveren"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddExerciseModal && (
        <div className="kineModalOverlay" onClick={closeAddExerciseModal}>
          <div
            className="kineModal kineModal--addExercise kineModal--exerciseWizard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kineModalHeader">
              <h3>Oefening toewijzen</h3>
              <button
                type="button"
                className="kineModalClose"
                onClick={handleAddExerciseBack}
              >
                ×
              </button>
            </div>

            <div className="kineModalBody">
              <form onSubmit={handleAddExercise}>
                <div className="schemeTopbar">
                  <button type="button" className="patientBack" onClick={handleAddExerciseBack}>
                    <img src="/images/back-icon.svg" alt="" />
                    <span>Terug</span>
                  </button>

                  <div className="schemeStepBlock">
                    <span className="schemeStepLabel">Stap {addExerciseStep} van 2</span>
                    <div className="schemeProgressBar">
                      <div className={`schemeProgressSegment ${addExerciseStep >= 1 ? "is-active" : ""}`} />
                      <div className={`schemeProgressSegment ${addExerciseStep >= 2 ? "is-active" : ""}`} />
                    </div>
                  </div>
                </div>

                <h1 className="schemeBuilderHeading">Oefening toewijzen</h1>

                {errorMessage && <p className="kineError">{errorMessage}</p>}

                {addExerciseStep === 1 && (
                  <section className="schemeLibrarySection">
                    <div className="exerciseSearchBar">
                      <img src="/images/search-icon.svg" alt="" />
                      <input
                        type="text"
                        placeholder="Zoek oefeningen..."
                        className="searchbar"
                        value={exerciseSearch}
                        onChange={(e) => setExerciseSearch(e.target.value)}
                      />
                    </div>

                    <div className="exerciseCategoryFilters">
                      {["Alles", "Balans", "Mobiliteit", "Kracht"].map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={`exerciseCategoryBtn ${exerciseCategory === item ? "is-active" : ""}`}
                          onClick={() => setExerciseCategory(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    <div className="exerciseTabsRow">
                      <div className="exerciseTabs">
                        <button
                          type="button"
                          className={exerciseTab === "bibliotheek" ? "is-active" : ""}
                          onClick={() => setExerciseTab("bibliotheek")}
                        >
                          Bibliotheek
                        </button>

                        <button
                          type="button"
                          className={exerciseTab === "jouw-oefeningen" ? "is-active" : ""}
                          onClick={() => setExerciseTab("jouw-oefeningen")}
                        >
                          Jouw oefeningen
                        </button>
                      </div>
                    </div>

                    <div className="exerciseLibraryGrid">
                      {filteredExercises.map((exercise) => {
                        const isSelected = selectedExercises.some((item) => item.id === exercise.id);

                        return (
                          <div key={exercise.id} className="schemeLibraryCardWrap">
                            <button
                              type="button"
                              className={`exerciseLibraryCard schemeSelectableCard ${isSelected ? "is-selected" : ""}`}
                              onClick={() => toggleExerciseSelection(exercise)}
                            >
                              <img
                                className="exerciseLibraryThumb"
                                src={exercise.image_url || "/images/exercise-1.png"}
                                alt={exercise.title}
                              />

                              <div className="exerciseLibraryInfo">
                                <strong>{exercise.title}</strong>

                                <div className="exerciseCardMetaRow">
                                  <span className={`exerciseTag ${getCategoryClass(exercise.category)}`}>
                                    {exercise.category}
                                  </span>

                                  <img
                                    src={getDifficultyIcon(exercise.difficulty)}
                                    alt={exercise.difficulty || "Makkelijk"}
                                    className="exerciseDifficultyIcon"
                                  />
                                </div>

                                <p>
                                  {exercise.duration_minutes || 0} min · {exercise.repetitions || 0} herhalingen
                                </p>
                              </div>

                              <button type="button" className="schemeDotsBtn" tabIndex={-1}>
                                <img src="/images/dots.svg" alt="" />
                              </button>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="schemeNextRow">
                      <button
                        type="button"
                        className="schemePrimaryBtn"
                        onClick={handleAddExerciseNext}
                        disabled={selectedExercises.length === 0}
                      >
                        Volgende
                      </button>
                    </div>
                  </section>
                )}

                {addExerciseStep === 2 && (
                  <section className="schemeBuilderLayout patientExerciseWizardLayout">
                    <div className="schemeBuilderLeft">
                      <div className="schemeFormGroup">
                        <label>Patiënt</label>
                        <input type="text" value={patient?.name || "-"} disabled />
                      </div>

                      <div className="schemeFormGroup">
                        <label htmlFor="assignmentStartDate">Start</label>
                        <input
                          id="assignmentStartDate"
                          type="date"
                          value={assignmentStartDate}
                          onChange={(e) => setAssignmentStartDate(e.target.value)}
                        />
                      </div>

                      <div className="schemeFormGroup">
                        <label htmlFor="assignmentEndDate">Einde</label>
                        <input
                          id="assignmentEndDate"
                          type="date"
                          value={assignmentEndDate}
                          onChange={(e) => setAssignmentEndDate(e.target.value)}
                        />
                      </div>

                      <div className="schemeFormGroup">
                        <label htmlFor="assignmentRepeat">Herhaal</label>
                        <select
                          id="assignmentRepeat"
                          value={assignmentRepeat}
                          onChange={(e) => setAssignmentRepeat(e.target.value)}
                        >
                          <option value="Elke dag">Elke dag</option>
                          <option value="Wekelijks">Wekelijks</option>
                          <option value="2x per week">2x per week</option>
                          <option value="3x per week">3x per week</option>
                          <option value="4x per week">4x per week</option>
                          <option value="5x per week">5x per week</option>
                          <option value="6x per week">6x per week</option>
                        </select>
                      </div>

                      <label className="schemeCheckboxRow">
                        <input
                          type="checkbox"
                          checked={applyToAllExercises}
                          onChange={(e) => setApplyToAllExercises(e.target.checked)}
                        />
                        <span>Voor alle oefeningen</span>
                      </label>

                      <div className="schemeActionRow">
                        <button
                          type="button"
                          className="schemeCancelBtn"
                          onClick={handleAddExerciseBack}
                        >
                          annuleer
                        </button>

                        <button
                          type="submit"
                          className="schemePrimaryBtn"
                          disabled={savingExercise}
                        >
                          {savingExercise ? "Aanmaken..." : "Toewijzen"}
                        </button>
                      </div>
                    </div>

                    <div className="schemeBuilderRight">
                      <h3 className="schemeAssignedTitle">
                        Toegewezen ({selectedExercises.length} oefeningen):
                      </h3>

                      <div className="schemeAssignedList">
                        {selectedExercises.map((exercise) => (
                          <div key={exercise.id} className="schemeAssignedCard">
                            <div className="exerciseLibraryCard">
                              <img
                                className="exerciseLibraryThumb"
                                src={exercise.image_url || "/images/exercise-1.png"}
                                alt={exercise.title}
                              />

                              <div className="exerciseLibraryInfo">
                                <strong>{exercise.title}</strong>

                                <div className="exerciseCardMetaRow">
                                  <span className={`exerciseTag ${getCategoryClass(exercise.category)}`}>
                                    {exercise.category}
                                  </span>

                                  <img
                                    src={getDifficultyIcon(exercise.difficulty)}
                                    alt={exercise.difficulty || "Makkelijk"}
                                    className="exerciseDifficultyIcon"
                                  />
                                </div>

                                <p>
                                  {exercise.duration_minutes || 0} min · {exercise.repetitions || 0} herhalingen
                                </p>
                              </div>

                              <button type="button" className="schemeDotsBtn" tabIndex={-1}>
                                <img src="/images/dots.svg" alt="" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {editingProgramExercise && (
        <div className="kineModalOverlay" onClick={closeProgramEditModal}>
          <div
            className="kineModal kineModal--programEdit"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kineModalHeader">
              <h3>{editingProgramExercise.title}</h3>
              <button
                type="button"
                className="kineModalClose"
                onClick={closeProgramEditModal}
              >
                ×
              </button>
            </div>

            <div className="kineModalBody">
              <div className="kineEditFormGrid">
                <div className="kineField kineField--half">
                  <label>Start</label>
                  <input
                    type="date"
                    value={programStartDate}
                    onChange={(e) => setProgramStartDate(e.target.value)}
                  />
                </div>

                <div className="kineField kineField--half">
                  <label>Einde</label>
                  <input
                    type="date"
                    value={programEndDate}
                    onChange={(e) => setProgramEndDate(e.target.value)}
                  />
                </div>

                <div className="kineField kineField--full">
                  <label>Herhaal</label>
                  <select
                    className="kineSelect"
                    value={programRepeat}
                    onChange={(e) => setProgramRepeat(e.target.value)}
                  >
                    <option value="Nooit">Nooit</option>
                    <option value="Wekelijks">Wekelijks</option>
                    <option value="2x per week">2x per week</option>
                    <option value="3x per week">3x per week</option>
                    <option value="4x per week">4x per week</option>
                    <option value="5x per week">5x per week</option>
                    <option value="6x per week">6x per week</option>
                  </select>
                </div>
              </div>

              <div className="kineModalFooter">
                <button
                  type="button"
                  className="kineTextAction"
                  onClick={closeProgramEditModal}
                >
                  Annuleren
                </button>

                <button
                  type="button"
                  className="btn-primary-large"
                  onClick={handleSaveProgramEdit}
                  disabled={savingProgramEdit}
                >
                  {savingProgramEdit ? "Opslaan..." : "Opslaan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNoteModal && (
        <div className="kineModalOverlay" onClick={closeNoteModal}>
          <div
            className="kineModal kineModal--note"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kineModalHeader">
              <h3>{editingNote ? "Notitie bewerken" : "Nieuwe notitie"}</h3>
              <button
                type="button"
                className="kineModalClose"
                onClick={closeNoteModal}
              >
                ×
              </button>
            </div>

            <div className="kineModalBody">
              <form className="kineEditForm" onSubmit={handleSaveNote}>
                <div className="kineField">
                  <label>Titel</label>
                  <input
                    type="text"
                    className="noteTitle"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Geef je notitie een titel"
                  />
                  <label>Beschrijving</label>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={7}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      padding: 14,
                      border: "1px solid #d8d8d8",
                      resize: "vertical",
                    }}
                    placeholder="Schrijf hier je observatie of sessienotitie..."
                  />
                </div>

                <div className="kineModalFooter">
                  {editingNote ? (
                    <button
                      type="button"
                      className="kineTextAction"
                      onClick={() => setNoteToDelete(editingNote)}
                      disabled={deletingNoteId === editingNote.id}
                    >
                      {deletingNoteId === editingNote.id ? "Verwijderen..." : "Verwijderen"}
                      
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="kineTextAction"
                      onClick={closeNoteModal}
                    >
                      Annuleren
                    </button>
                  )}

                  <button
                    type="submit"
                    className="btn-primary-large"
                    disabled={savingNote}
                  >
                    {savingNote ? "Opslaan..." : "Opslaan"}
                  </button>
                </div>              
                </form>
            </div>
          </div>
        </div>
      )}
      {noteToDelete && (
  <div
    className="kineModalOverlay"
    onClick={() => setNoteToDelete(null)}
  >
    <div
      className="kineModal kineModal--confirm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="kineModalHeader">
        <h3>Verwijder notitie</h3>
        <button
          type="button"
          className="kineModalClose"
          onClick={() => setNoteToDelete(null)}
        >
          ×
        </button>
      </div>

      <div className="kineModalBody">
        <p style={{ marginBottom: 24 }}>
          Ben je zeker dat je deze notitie wil verwijderen?
        </p>

        <div className="kineModalFooter">
          <button
            type="button"
            className="kineTextAction"
            onClick={() => setNoteToDelete(null)}
          >
            Annuleren
          </button>

          <button
            type="button"
            className="btn-danger"
            onClick={() => handleDeleteNote(noteToDelete.id)}
            disabled={deletingNoteId === noteToDelete.id}
          >
            {deletingNoteId === noteToDelete.id
              ? "Verwijderen..."
              : "Verwijderen"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
{exerciseToDelete && (
  <div
    className="kineModalOverlay"
    onClick={() => setExerciseToDelete(null)}
  >
    <div
      className="kineModal kineModal--confirm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="kineModalHeader">
        <h3>Oefening verwijderen</h3>
        <button
          type="button"
          className="kineModalClose"
          onClick={() => setExerciseToDelete(null)}
        >
          ×
        </button>
      </div>

      <div className="kineModalBody">
        <p style={{ marginBottom: 24 }}>
          Ben je zeker dat je deze oefening wil verwijderen?
        </p>

        <div className="kineModalFooter">
          <button
            type="button"
            className="kineTextAction"
            onClick={() => setExerciseToDelete(null)}
          >
            Annuleren
          </button>

          <button
            type="button"
            className="btn-danger"
            onClick={() => handleDeleteExercise(exerciseToDelete.id)}
            disabled={deletingExercise}
          >
            {deletingExercise ? "Verwijderen..." : "Verwijderen"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
{programToDelete && (
  <div
    className="kineModalOverlay"
    onClick={() => setProgramToDelete(null)}
  >
    <div
      className="kineModal kineModal--confirm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="kineModalHeader">
        <h3>Volledig programma verwijderen</h3>
        <button
          type="button"
          className="kineModalClose"
          onClick={() => setProgramToDelete(null)}
        >
          ×
        </button>
      </div>

      <div className="kineModalBody">
        <p style={{ marginBottom: 24 }}>
          Ben je zeker dat je alle ingeplande momenten van deze oefening wil verwijderen?
        </p>

        <div className="kineModalFooter">
          <button
            type="button"
            className="kineTextAction"
            onClick={() => setProgramToDelete(null)}
          >
            Annuleren
          </button>

          <button
            type="button"
            className="btn-danger"
            onClick={() => handleRemoveExerciseFromProgram(programToDelete)}
            disabled={deletingExercise}
          >
            {deletingExercise ? "Verwijderen..." : "Verwijderen"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}