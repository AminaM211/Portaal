export default function ChildStatsRow({ stats, className = "" }) {
  return (
    <div className={`childTopStatsRow ${className}`.trim()}>
      {stats.map((stat) => (
        <div key={stat.label} className="childStatItem">
          <div
            className="childStatIcon"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "999px",
              background: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img src={stat.icon} alt="" style={{ width: "40px", height: "40px" }} />
          </div>
          <span className="childStatNumber">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}
