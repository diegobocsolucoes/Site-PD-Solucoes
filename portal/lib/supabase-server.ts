import "server-only";

export function ambienteServidor() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !/^https:\/\//.test(url)) return null;
  return { url:url.replace(/\/$/,""), key };
}

export async function consultaPrivada(
  path: string, opts: RequestInit = {}
): Promise<Response> {
  const config = ambienteServidor();
  if (!config) throw new Error("SUPABASE_NAO_CONFIGURADO");
  return fetch(config.url + "/rest/v1/" + path, {
    ...opts, cache:"no-store",
    headers:{
      apikey: config.key,
      Authorization: "Bearer " + config.key,
      "Content-Type":"application/json",
      ...opts.headers
    }
  });
}

export async function validarAdmin(request: Request): Promise<boolean> {
  const config = ambienteServidor();
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminId = process.env.PD_ADMIN_USER_ID;
  const auth = request.headers.get("authorization") || "";
  if (!config || !publicKey || !adminId || !/^Bearer [\w.\-]+$/.test(auth))
    return false;
  const jwt = auth.slice(7);
  try {
    // O servidor de Auth valida a assinatura e identifica o usuário.
    const response = await fetch(config.url + "/auth/v1/user", {
      headers: {apikey:publicKey,Authorization:auth},
      cache:"no-store"
    });
    if (!response.ok) return false;
    const user = await response.json();
    // Interpretação de claims somente APÓS validação remota do MESMO JWT.
    const claims = JSON.parse(Buffer.from(jwt.split(".")[1] || "","base64url").toString());
    return user.id === adminId && claims.sub === user.id && claims.aal === "aal2";
  } catch { return false; }
}
