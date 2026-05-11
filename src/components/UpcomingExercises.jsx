import React from "react";
import { useNavigate } from "react-router-dom";
import ExerciseCard from "./ExerciseCard";
import "./UpcomingExercises.css";

export default function UpcomingExercises({ exercises, todayKey, onItemClick }) {
  const navigate = useNavigate();
  const handleClick = onItemClick ?? (() => navigate("/ouder/oefenplanning"));

  return (
    <div className="parentSideSection">
      <h3>Aankomende oefeningen</h3>
      <div className="parentUpcomingList">
        {exercises.length === 0 ? (
          <div className="parentEmptyState side">
            <strong>Geen aankomende oefeningen</strong>
            <p>Nieuwe oefeningen verschijnen hier.</p>
          </div>
        ) : (
          exercises.map((item) => (
            <ExerciseCard
              key={item.id}
              item={item}
              todayKey={todayKey}
              onClick={() => handleClick(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}
