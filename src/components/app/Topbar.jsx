import { useState } from "react";
import { Menu, LogOut, ChevronDown } from "lucide-react";
import { Avatar } from "./Avatar";
import { cn } from "../../lib/utils";

/**
 * Topbar dashboard admin. Mostra titolo, azioni opzionali, avatar+menu (logout).
 * onToggleSidebar apre il drawer su mobile.
 */
export function Topbar({ title, actions, user, onToggleSidebar, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-bg px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-md p-2 text-text hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
          aria-label="Apri menu"
        >
          <Menu size={22} />
        </button>
        {title && <h1 className="font-display text-lg font-bold uppercase">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        {user && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-2"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <span className="hidden text-sm sm:block">{user.name}</span>
              <ChevronDown size={16} className="text-text-muted" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-44 rounded-md border border-border bg-surface py-1 shadow-base"
                role="menu"
              >
                <button
                  onClick={onLogout}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm text-text-muted",
                    "transition-colors hover:bg-surface-2 hover:text-danger"
                  )}
                  role="menuitem"
                >
                  <LogOut size={16} /> Esci
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
