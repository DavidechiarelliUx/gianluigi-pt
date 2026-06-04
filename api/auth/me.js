import { prisma } from "../../server/lib/prisma.js";
import { getAuth } from "../../server/lib/guards.js";

/** GET /api/auth/me → utente corrente dal cookie, o 401. */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Metodo non consentito" });
  }

  const auth = getAuth(req);
  if (!auth) return res.status(401).json({ ok: false, error: "Non autenticato" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { client: true },
    });
    if (!user) return res.status(401).json({ ok: false, error: "Non autenticato" });
    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        clientId: user.client?.id || null,
      },
    });
  } catch (err) {
    console.error("Errore me:", err);
    return res.status(500).json({ ok: false, error: "Errore interno" });
  }
}
