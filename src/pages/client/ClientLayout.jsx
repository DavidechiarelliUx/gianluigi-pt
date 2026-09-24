import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Plus, TrendingUp, UserRound, Video } from "lucide-react";
import { BottomTabBar } from "../../components/app/BottomTabBar";
import { ClientLayoutContext } from "./ClientLayoutContext";
import "./client-app.css";

const TABS = [
  { label: "Home", icon: Home, href: "/area-cliente" },
  { label: "Progressi", icon: TrendingUp, href: "/area-cliente/storico" },
  { label: "Allenamento", icon: Plus, href: "/area-cliente/allenamento", central: true },
  { label: "Live", icon: Video, href: "/area-cliente/live" },
  { label: "Profilo", icon: UserRound, href: "/area-cliente/profilo" },
];
const THEME_KEY = "gianluigi-pt:client-theme-v2";

export function ClientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tabBarHidden, setTabBarHidden] = useState(false);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; }
    catch { return "dark"; }
  });
  const activeHref = location.pathname.startsWith("/area-cliente/profilo") ||
    ["/supporto", "/privacy", "/contatta", "/installa-app", "/abbonamenti"].some((path) => location.pathname.startsWith(`/area-cliente${path}`))
    ? "/area-cliente/profilo"
    : location.pathname.startsWith("/area-cliente/scheda") ? "/area-cliente/allenamento" : location.pathname;

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); }
    catch { /* The app still works without local storage. */ }
  }, [theme]);

  return (
    <ClientLayoutContext.Provider value={{ setTabBarHidden, theme, setTheme }}>
      <div className="client-app" data-theme={theme}>
        <main className="client-main">
          <Outlet />
        </main>
        <BottomTabBar
          tabs={TABS}
          activeHref={activeHref}
          onNavigate={(href) => navigate(href)}
          hidden={tabBarHidden}
        />
      </div>
    </ClientLayoutContext.Provider>
  );
}
