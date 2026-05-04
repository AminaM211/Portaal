import React from "react";

export default function StatsBlock({ stats }) {
  return (
    <section className="kineDashStats">
      {stats.map((stat, index) => (
        <div key={index} className="kineStat">
          <div>
            {stat.icon && <img src={stat.icon} alt={`${stat.label} icoon`} />}
            <strong>{stat.value}</strong>
          </div>
          <span>{stat.label}</span>
        </div>
      ))}
    </section>
  );
}
