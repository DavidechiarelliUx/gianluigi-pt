import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { AuthContext } from "./auth-context";

const ME_KEY = ["auth", "me"];

/**
 * Provider auth: espone user, isLoading, login(), logout(), refetch().
 * Lo stato utente deriva da GET /api/auth/me (cookie httpOnly).
 */
export function AuthProvider({ children }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        return res.user;
      } catch (e) {
        if (e.status === 401) return null; // non autenticato = stato valido
        throw e;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const login = async (email, password) => {
    const res = await apiFetch("/api/auth/login", { method: "POST", body: { email, password } });
    await qc.invalidateQueries({ queryKey: ME_KEY });
    return res.user;
  };

  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    await qc.cancelQueries();
    qc.clear();
    qc.setQueryData(ME_KEY, null);
  };

  const value = {
    user: data ?? null,
    isAuthenticated: !!data,
    isLoading,
    login,
    logout,
    refetch: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
