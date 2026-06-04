/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App.jsx"; // marketing: eager (è la landing)

// Aree non-marketing: lazy → fuori dal bundle del sito pubblico
const Login = lazy(() => import("./pages/Login.jsx"));
const Styleguide = lazy(() => import("./styleguide/Styleguide.jsx"));
const DashboardLayout = lazy(() =>
  import("./pages/dashboard/DashboardLayout.jsx").then((m) => ({ default: m.DashboardLayout }))
);
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard.jsx"));
const Clients = lazy(() => import("./pages/dashboard/Clients.jsx"));
const ClientLayout = lazy(() =>
  import("./pages/client/ClientLayout.jsx").then((m) => ({ default: m.ClientLayout }))
);
const MyWorkout = lazy(() => import("./pages/client/MyWorkout.jsx"));

import { RoleRoute } from "./components/RouteGuards.jsx";

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-text-muted">
      Caricamento…
    </div>
  );
}
const wrap = (node) => <Suspense fallback={<Loader />}>{node}</Suspense>;

export const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/styleguide", element: wrap(<Styleguide />) },
  { path: "/login", element: wrap(<Login />) },
  {
    path: "/dashboard",
    element: wrap(
      <RoleRoute role="admin">
        <DashboardLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: wrap(<Dashboard />) },
      { path: "clienti", element: wrap(<Clients />) },
    ],
  },
  {
    path: "/area-cliente",
    element: wrap(
      <RoleRoute role="client">
        <ClientLayout />
      </RoleRoute>
    ),
    children: [{ index: true, element: wrap(<MyWorkout />) }],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
