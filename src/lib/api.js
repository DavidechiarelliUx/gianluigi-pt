/**
 * Wrapper fetch per le API interne.
 * Invia sempre i cookie (credentials: "include") per l'auth httpOnly.
 * Lancia un Error con .status e .data in caso di risposta non ok.
 */
export async function apiFetch(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // risposta senza JSON
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Errore ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
