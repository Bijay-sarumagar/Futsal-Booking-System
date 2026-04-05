import { Navigate, Outlet } from "react-router";
import { useAuth } from "./auth-context";

export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function RequireRole({ roles }: { roles: Array<"player" | "owner" | "admin"> }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function RequirePlayer() {
  return <RequireRole roles={["player"]} />;
}

export function RequireOwner() {
  return <RequireRole roles={["owner"]} />;
}

export function RequireAdmin() {
  return <RequireRole roles={["admin"]} />;
}
