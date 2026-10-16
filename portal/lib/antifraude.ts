import "server-only";

export async function verificarTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Em produção, nunca aceitar formulário sem proteção antifraude.
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  try {
    const form = new URLSearchParams({ secret, response: token, remoteip: ip });
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: form, cache: "no-store", signal: AbortSignal.timeout(7000)
    });
    const data = await response.json();
    return response.ok && data.success === true;
  } catch { return false; }
}
