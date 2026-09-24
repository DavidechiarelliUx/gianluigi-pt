import { createContext, useContext } from "react";

/**
 * Permette ai figli di ClientLayout di controllare la visibilità
 * della BottomTabBar (es. quando un bottom sheet è aperto).
 */
export const ClientLayoutContext = createContext({
  setTabBarHidden: () => {},
  theme: "dark",
  setTheme: () => {},
});

export function useClientLayout() {
  return useContext(ClientLayoutContext);
}
