import "server-only";
import {NextResponse} from "next/server";
import {validarAdmin} from "@/lib/supabase-server";

export const json = (body: object, status = 200) =>
  NextResponse.json(body, {status, headers:{"Cache-Control":"no-store"}});

/**
 * Barreira comum das rotas do painel: administrador autenticado com MFA e,
 * nas alterações, origem do site autorizada. Devolve a resposta de recusa ou null.
 */
export async function exigirAdmin(request: Request, alteracao: boolean) {
  if (!(await validarAdmin(request)))
    return json({erro:"Acesso restrito ao administrador com MFA."}, 403);
  if (alteracao) {
    const esperado = process.env.PD_SITE_ORIGIN || new URL(request.url).origin;
    if (request.headers.get("origin") !== esperado)
      return json({erro:"Origem não autorizada."}, 403);
  }
  return null;
}

/** Lê o corpo JSON com limite de tamanho. */
export async function lerJson(request: Request, max = 4000):
  Promise<{ok:true;corpo:Record<string,unknown>} | {ok:false;resposta:Response}> {
  try {
    const bruto = await request.text();
    if (bruto.length > max) return {ok:false, resposta:json({erro:"Dados grandes demais."}, 413)};
    const corpo = JSON.parse(bruto);
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo))
      return {ok:false, resposta:json({erro:"Dados inválidos."}, 422)};
    return {ok:true, corpo:corpo as Record<string,unknown>};
  } catch {
    return {ok:false, resposta:json({erro:"Dados inválidos."}, 400)};
  }
}
