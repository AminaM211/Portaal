import React from "react";
import { formatShortDateTime } from "../utils/helpers";

export default function RecentExercises({ exercises }) {
  return (
    <div className="parentSideSection">
      <h3>Recente oefeningen</h3>
      <div className="parentRecentList">
        {exercises.length === 0 ? (
          <div className="parentEmptyState side">
            <strong>Nog geen recente oefeningen</strong>
            <p>Voltooide oefeningen verschijnen hier.</p>
          </div>
        ) : (
          exercises.map((item) => (
            <div key={item.id} className="parentRecentCard">
              <div className="parentRecentLeft">
                <span className="parentRecentCheck">✓</span>
                <div className="parentRecentInfo">
                  <strong>{item.exercise?.title || "Oefening"}</strong>
                  <p>{formatShortDateTime(item.created_at)}</p>
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
