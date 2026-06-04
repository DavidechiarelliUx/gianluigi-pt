import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
      Caricamento…
    </div>
  );
}

/** Richiede autenticazione; altrimenti redirect a /login (conserva la destinazione). */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/** Richiede un ruolo specifico; reindirizza alla home del ruolo corretto o a /login. */
export function RoleRoute({ role, children }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    // utente loggato ma ruolo errato → mandalo alla sua area
    return <Navigate to={user.role === "admin" ? "/dashboard" : "/area-cliente"} replace />;
  }
  return children;
}
