import { clearCookie } from "../../server/lib/auth.js";

/** POST /api/auth/logout → cancella il cookie di sessione. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Metodo non consentito" });
  }
  res.setHeader("Set-Cookie", clearCookie());
  return res.status(200).json({ ok: true });
}
