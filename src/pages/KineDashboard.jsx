import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function KineDashboard() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        navigate("/");
        return;
      }

      if (profile.role !== "kinesist") {
        navigate("/ouder/dashboard");
        return;
      }

      setFullName(profile.full_name || "");
    }

    loadProfile();
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div style={{ padding: "40px", fontFamily: "Nunito, sans-serif" }}>
      <h1>Kinesisten dashboard</h1>
      <p>Welkom {fullName || "kinesist"}.</p>

      <button onClick={handleLogout}>Uitloggen</button>
    </div>
  );
}