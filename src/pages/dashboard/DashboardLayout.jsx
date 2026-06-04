import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, ClipboardList, Video, LogOut } from "lucide-react";
import { Sidebar } from "../../components/app/Sidebar";
import { Topbar } from "../../components/app/Topbar";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";

const NAV = [
  { label: "Panoramica", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Clienti", icon: Users, href: "/dashboard/clienti" },
  { label: "Schede", icon: ClipboardList, href: "/dashboard/schede" },
  { label: "Live", icon: Video, href: "/dashboard/live" },
];

const TITLES = {
  "/dashboard": "Panoramica",
  "/dashboard/clienti": "Clienti",
  "/dashboard/schede": "Schede",
  "/dashboard/live": "Sessioni Live",
};

/** Shell dell'area admin: Sidebar + Topbar + contenuto. */
export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const onLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <Sidebar
        items={NAV}
        activeHref={location.pathname}
        onNavigate={(href) => navigate(href)}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        footer={
          <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
            <LogOut size={18} /> Esci
          </Button>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={TITLES[location.pathname] || "Dashboard"}
          user={user ? { name: user.fullName } : null}
          onToggleSidebar={() => setDrawerOpen(true)}
          onLogout={onLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
