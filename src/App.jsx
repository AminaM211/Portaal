import { Routes, Route, Link } from "react-router-dom"
import { useEffect } from "react"
import { supabase } from "./supabase"

import HomeScreen from "./HomeScreen"
import ChildScreen from "./ChildScreen"
import KineScreen from "./KineScreen"
import PatientDetails from "./PatientDetails"
import PoseDemo from "./PoseDemo"

function App() {
  useEffect(() => {
    const checkConnection = async () => {
      const { error } = await supabase
        .from("users")
        .select("id")
        .limit(1)

      if (error) {
        console.error("Supabase connectie fout:", error.message)
      } else {
        console.log("Supabase verbonden ✅")
      }
    }

    checkConnection()
  }, [])

  return (
    <>
      {/* tijdelijke dev navigatie */}
      <nav style={{ padding: "1rem", display: "flex", gap: "1rem" }}>
        <Link to="/">Home</Link>
        <Link to="/kind">Kind</Link>
        <Link to="/kinesist">Kinesist</Link>
        <Link to="/pose-demo">Pose demo</Link>
      </nav>

      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/kind" element={<ChildScreen />} />
        <Route path="/kinesist" element={<KineScreen />} />
        <Route path="/kinesist/patient/:id" element={<PatientDetails />} />
        <Route path="/pose-demo" element={<PoseDemo />} />
      </Routes>
    </>
  )
}

export default App