import React from "react";
import {
  formatDate,
  getCategoryClass,
  getDifficultyIcon,
} from "../utils/helpers";
import ExerciseMediaThumb from "./ExerciseMediaThumb";
import "./ExerciseCard.css";

export default function ExerciseCard({ item, todayKey, onClick }) {
  return (
    <button
      key={item.id}
      type="button"
      className="parentUpcomingCard"
      onClick={onClick}
    >
      <ExerciseMediaThumb
        src={item.exercise?.image_url || item.exercise?.thumbnail_url || item.exercise?.media_url}
        alt={item.exercise?.title || "Oefening"}
        className="parentUpcomingThumb"
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
  );
}
