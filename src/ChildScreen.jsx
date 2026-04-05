// src/ChildScreen.jsx
import "./assets/css/ChildScreen.css"
import Sidebar from "./components/ChildSidebar"

export default function ChildScreen() {
  const stats = [
    { icon: "🏆", value: "3" },
    { icon: "⭐", value: "12" },
    { icon: "⚡", value: "20 days" }
  ]

  const missions = [
    { title: "Compleet 1 oefening", progress: 100, meta: "1/1", reward: "+20 XP" },
    { title: "Verdien 15 PX", progress: 0, meta: "0/15", reward: "+20 XP" },
    { title: "Compleet al je dagmissies", progress: 20, meta: "1/5", reward: "+200 XP" }
  ]

  const week = [
    { day: "Zo", status: "fail" },
    { day: "Ma", status: "ok" },
    { day: "Di", status: "ok" },
    { day: "Wo", status: "today" },
    { day: "Do", status: "empty" },
    { day: "Vr", status: "empty" },
    { day: "Za", status: "empty" }
  ]

  const track = [
    { label: "MA", type: "warn" },
    { label: "DI", type: "check" },
    { label: "VANDAAG", type: "star" },
    { label: "DO", type: "moon" },
    { label: "VR", type: "moon" },
    { label: "ZA", type: "lock" }
  ]

  return (
    <div className="child">
      <Sidebar variant="child" active="oefeningen" />

      <main className="childMain">
        <section className="childTop">
          <div className="weekCard">
            <div className="weekTitle">WEEKOVERZICHT</div>
            <div className="weekRow">
              {week.map((w) => (
                <div key={w.day} className={`weekItem ${w.status}`}>
                  <div className="weekDot" />
                  <div className="weekLbl">{w.day}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="childStats">
            {stats.map((s, i) => (
              <div key={i} className="statPill">
                <span className="statIcon">{s.icon}</span>
                <span className="statVal">{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="childGrid">
          <div className="trackWrap">
            <div className="track">
              {track.map((t, i) => (
                <div key={i} className="trackNode">
                  <div className={`nodeIcon ${t.type}`}>
                  {t.type === "warn" && (<img src="/images/onvoltooid-icon.svg" alt="" />)}                    
                  {t.type === "check" && (<img src="/images/voltooid-icon.svg" alt="" />)}
                    {t.type === "star" && (<img src="/images/huidige-dag-icon.svg" alt="" />)}
                    {t.type === "moon" && (<img src="/images/rust-icon.svg" alt="" />)}
                    {t.type === "lock" && (<img src="/images/onvoltooid-icon.svg" alt="" />)}
                  </div>
                  <div className="nodeLbl">{t.label}</div>
                </div>
              ))}
            </div>

            <div className="month">December</div>
          </div>

          <aside className="missionsCard">
            <div className="missionsTop">
              <h3>Dagmissies</h3>
              <button className="linkBtn">view all</button>
            </div>
            <p className="missionsSub">
              Voltooi alle missies van vandaag en krijg 200 PX!
            </p>

            <div className="missionsList">
              {missions.map((m) => (
                <div key={m.title} className="missionRow">
                  <div className="missionTitle">{m.title}</div>

                  <div className="missionBarRow">
                    <div className="missionBar">
                      <div className="missionFill" style={{ width: `${m.progress}%` }} />
                    </div>
                    <div className="missionMeta">{m.meta}</div>
                    <div className="missionReward">{m.reward}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div className="monkeyWrap">
            <img className="monkey" src="/images/child-monkey.png" alt="Nimbli" />
          </div>
        </section>
      </main>
    </div>
  )
}