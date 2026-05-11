import React from "react";
import { formatShortDateTime } from "../utils/helpers";
import "./RecentExercises.css";

export default function RecentExercises({
  exercises,
  dateField = "created_at",
  emptyTitle = "Nog geen recente oefeningen",
  emptyDescription = "Voltooide oefeningen verschijnen hier.",
}) {
  return (
    <div className="parentSideSection">
      <h3>Recente oefeningen</h3>
      <div className="parentRecentList">
        {exercises.length === 0 ? (
          <div className="parentEmptyState side">
            <strong>{emptyTitle}</strong>
            <p>{emptyDescription}</p>
          </div>
        ) : (
          exercises.map((item) => (
            <div key={item.id} className="parentRecentCard">
              <div className="parentRecentLeft">
                <span className="parentRecentCheck">✓</span>
                <div className="parentRecentInfo">
                  <strong>{item.exercise?.title || "Oefening"}</strong>
                  <p>{formatShortDateTime(item[dateField])}</p>
                </div>
              </div>
              <span className="parentXpTag">+100 XP</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
