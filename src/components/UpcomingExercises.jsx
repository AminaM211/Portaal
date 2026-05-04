import React from "react";
import { useNavigate } from "react-router-dom";
import { getCategoryClass, getDifficultyIcon, formatDate } from "../utils/helpers";

export default function UpcomingExercises({ exercises, todayKey }) {
  const navigate = useNavigate();

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
                  <span className={`exerciseTag ${getCategoryClass(item.exercise?.category)}`}>
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
            </button>
          ))
        )}
      </div>
    </div>
  );
}
