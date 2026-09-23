export function BottomTabBar({ tabs = [], activeHref, onNavigate, hidden = false }) {
  if (hidden) return null;

  return (
    <nav className="client-tab-bar" aria-label="Navigazione principale">
      <ul>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.href === activeHref;
          return (
            <li key={t.href}>
              <button
                onClick={() => onNavigate?.(t.href)}
                className={(active ? "active " : "") + (t.central ? "central" : "")}
                aria-current={active ? "page" : undefined}
                aria-label={t.central ? "Apri allenamento" : t.label}
              >
                <span className="client-tab-icon">{Icon && <Icon size={t.central ? 25 : 21} strokeWidth={t.central ? 2.4 : 2} />}</span>
                <span>{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
