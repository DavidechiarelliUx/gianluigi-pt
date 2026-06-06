import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Dumbbell, Home, User, Video } from "lucide-react";
import { BottomTabBar } from "../../components/app/BottomTabBar";

const TABS = [
  { label: "Home", icon: Home, href: "/area-cliente" },
  { label: "Allenati", icon: Dumbbell, href: "/area-cliente/allenamento" },
  { label: "Live", icon: Video, href: "/area-cliente/live" },
  { label: "Profilo", icon: User, href: "/area-cliente/profilo" },
];

/** Shell area cliente (mobile-first): contenuto + bottom tab bar. */
export function ClientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div className="min-h-screen bg-bg pb-20 text-text">
      <main className="mx-auto max-w-md px-4 py-6">
        <Outlet />
      </main>
      <BottomTabBar tabs={TABS} activeHref={location.pathname} onNavigate={(href) => navigate(href)} />
    </div>
  );
}
