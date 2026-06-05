/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App.jsx"; // marketing: eager (è la landing)

// Aree non-marketing: lazy → fuori dal bundle del sito pubblico
const Login = lazy(() => import("./pages/Login.jsx"));
const AppPlatform = lazy(() => import("./pages/AppPlatform.jsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"));
const Packages = lazy(() => import("./pages/Packages.jsx"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess.jsx"));
const InstallApp = lazy(() => import("./pages/InstallApp.jsx"));
const Styleguide = lazy(() => import("./styleguide/Styleguide.jsx"));
const DashboardLayout = lazy(() =>
  import("./pages/dashboard/DashboardLayout.jsx").then((m) => ({ default: m.DashboardLayout }))
);
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard.jsx"));
const Clients = lazy(() => import("./pages/dashboard/Clients.jsx"));
const Workouts = lazy(() => import("./pages/dashboard/Workouts.jsx"));
const Live = lazy(() => import("./pages/dashboard/Live.jsx"));
const ClientLayout = lazy(() =>
  import("./pages/client/ClientLayout.jsx").then((m) => ({ default: m.ClientLayout }))
);
const MyWorkout = lazy(() => import("./pages/client/MyWorkout.jsx"));
const ClientHistory = lazy(() => import("./pages/client/ClientHistory.jsx"));
const ClientProfile = lazy(() => import("./pages/client/ClientProfile.jsx"));
const ClientLive = lazy(() => import("./pages/client/ClientLive.jsx"));

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
  { path: "/app", element: wrap(<AppPlatform />) },
  { path: "/chi-sono", element: wrap(<AboutPage />) },
  { path: "/contatti", element: wrap(<ContactPage />) },
  { path: "/pacchetti", element: wrap(<Packages />) },
  { path: "/checkout/success", element: wrap(<CheckoutSuccess />) },
  { path: "/installa-app", element: wrap(<InstallApp />) },
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
      { path: "schede", element: wrap(<Workouts />) },
      { path: "live", element: wrap(<Live />) },
    ],
  },
  {
    path: "/area-cliente",
    element: wrap(
      <RoleRoute role="client">
        <ClientLayout />
      </RoleRoute>
    ),
    children: [
      { index: true, element: wrap(<MyWorkout />) },
      { path: "storico", element: wrap(<ClientHistory />) },
      { path: "profilo", element: wrap(<ClientProfile />) },
      { path: "live", element: wrap(<ClientLive />) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
