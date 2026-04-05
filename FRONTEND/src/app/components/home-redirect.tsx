import { Navigate } from "react-router";
import { useAuth } from "../auth/auth-context";

export function HomeRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "owner") {
    return <Navigate to="/owner" replace />;
  }

  if (user.role === "admin") {
    return <Navigate to="/super-admin" replace />;
  }

  return <Navigate to="/player/home" replace />;
}
