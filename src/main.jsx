import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.jsx";
import { ToastProvider } from "./components/app/Toast";
import { AuthProvider } from "./hooks/AuthProvider";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

// Styleguide interna: caricata in lazy SOLO con hash #styleguide
// (non viene inclusa nel bundle del sito pubblico).
const isStyleguide =
  typeof window !== "undefined" && window.location.hash.startsWith("#styleguide");
// eslint-disable-next-line react-refresh/only-export-components
const Styleguide = lazy(() => import("./styleguide/Styleguide.jsx"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          {isStyleguide ? (
            <Suspense fallback={null}>
              <Styleguide />
            </Suspense>
          ) : (
            <App />
          )}
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>
);
