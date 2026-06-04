import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dumbbell, KeyRound, LogIn, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { GlowPanel } from "../components/ui/GlowPanel";
import { apiFetch } from "../lib/api";

/** Pagina di login condivisa admin/cliente. Reindirizza in base al ruolo. */
export default function Login() {
  const { user, login, refetch } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const inviteToken = params.get("invite");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Se già loggato, vai alla tua area
  useEffect(() => {
    if (user) navigate(user.role === "admin" ? "/dashboard" : "/area-cliente", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (inviteToken && password !== passwordConfirm) {
      setError("Le password non coincidono");
      return;
    }
    setLoading(true);
    try {
      const u = inviteToken
        ? (await apiFetch("/api/auth/set-password", {
            method: "POST",
            body: { token: inviteToken, password },
          })).user
        : await login(email.trim(), password);
      if (inviteToken) await refetch();
      navigate(u.role === "admin" ? "/dashboard" : "/area-cliente", { replace: true });
    } catch (err) {
      setError(err.message || "Accesso non riuscito");
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-12 text-text">
      <GlowPanel className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 font-display text-lg font-bold uppercase">
          <Dumbbell size={22} className="text-accent" /> Gianluigi <span className="text-accent">PT</span>
        </div>
        <h1 className="font-display text-2xl font-extrabold uppercase">
          {inviteToken ? "Imposta password" : "Accedi"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {inviteToken ? "Crea la tua password per entrare nell'area cliente." : "Area riservata clienti e coach."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          {!inviteToken && (
            <div>
              <label htmlFor="login-email" className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Email</label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@esempio.it"
              />
            </div>
          )}
          <div>
            <label htmlFor="login-password" className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Password</label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {inviteToken && (
            <div>
              <label htmlFor="login-password-confirm" className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Conferma password</label>
              <Input
                id="login-password-confirm"
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <p className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Attendi…</>
            ) : inviteToken ? (
              <><KeyRound size={18} /> Imposta ed entra</>
            ) : (
              <><LogIn size={18} /> Entra</>
            )}
          </Button>
        </form>
      </GlowPanel>
    </main>
  );
}
