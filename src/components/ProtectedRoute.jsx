import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ProtectedRoute({ children, allowedRole }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      setAllowed(profile.role === allowedRole);
      setLoading(false);
    }

    checkAccess();
  }, [allowedRole]);

  if (loading) {
    return (
      <div className="kineDashLoading">
        <img src="/images/monkey-load.png" style={{ width: "100px" }} alt="" />
        <p>laden . . .</p>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}