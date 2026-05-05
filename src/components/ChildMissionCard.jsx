import { getMissionIcon } from "../utils/childDashboard";

export default function ChildMissionCard({ mission, showChest = true, chestOpenIcon = "/images/chest-open.png", chestClosedIcon = "/images/chest-closed.png" }) {
  const target = mission?.missions?.target || 1;
  const progress = Number(mission?.progress || 0);
  const pct = Math.min(100, Math.round((progress / target) * 100));
  const missionIcon = getMissionIcon(mission);

  return (
    <div className={`dagmissieCard`} style={{ border: mission.is_completed ? "2px solid #2DC07F" : `2px solid ${missionIcon.background}`, background: mission.is_completed ? "#E8F8F4" : "white" }}>
      <div className="missieIconCircle">
        <img src={missionIcon.src} alt={missionIcon.alt} />
      </div>
      <div className="missieInfoText">
        <h4>{mission.missions?.title || "Onbekende missie"}</h4>
        <div className="missieProgressRow">
          <span>{progress}/{target}</span>
          <div className="missieBarTrack">
            <div className="missieBarFill" style={{ width: mission.is_completed ? "100%" : `${pct}%`, background: mission.is_completed ? "#2DC07F" : "#F8AE49" }} />
          </div>
        </div>
      </div>
      {showChest && (
        <div className="missieChestIcon">
          <img
            src={mission.is_completed ? chestOpenIcon : chestClosedIcon}
            alt={mission.is_completed ? "Open chest" : "Closed chest"}
          />
        </div>
      )}
    </div>
  );
}
