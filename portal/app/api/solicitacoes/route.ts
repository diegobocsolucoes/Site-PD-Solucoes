import {createHmac} from "node:crypto";
import {NextResponse} from "next/server";
import {consultaPrivada, ambienteServidor} from "@/lib/supabase-server";
import {validarSolicitacao, mascararWhatsapp} from "@/lib/solicitacao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(data: object, status = 200) {
  return NextResponse.json(data, {
    status, headers: {"Cache-Control":"no-store"}
  });
}

async function verificarTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Em produção, nunca aceitar formulário sem proteção antifraude.
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  try {
    const form = new URLSearchParams({
      secret,response:token,remoteip:ip
    });
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"POST",body:form,cache:"no-store",
      signal:AbortSignal.timeout(7000)
    });
    const data = await response.json();
    return response.ok && data.success === true;
  } catch { return false; }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.PD_SITE_ORIGIN || new URL(request.url).origin;
  if (!origin || origin !== allowed) return json({erro:"Origem não autorizada."},403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({erro:"Envie os dados em JSON."},415);
  const len = Number(request.headers.get("content-length") || "0");
  if (len > 8192) return json({erro:"Solicitação muito grande."},413);
  const config = ambienteServidor();
  const salt = process.env.PD_RATE_LIMIT_SALT;
  if (!config || !salt || salt.length < 24 ||
      (process.env.NODE_ENV === "production" && !process.env.TURNSTILE_SECRET_KEY))
    return json({erro:"Atendimento temporariamente indisponível."},503);
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 8192) return json({erro:"Solicitação muito grande."},413);
    raw = JSON.parse(body);
  } catch {return json({erro:"JSON inválido."},400);}
  const parsed = validarSolicitacao(raw);
  if (!parsed.ok) return json({erro:parsed.erro},422);
  const data = parsed.data;
  // Configurar proxy confiável (Vercel/servidor próprio) antes da publicação.
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sem-ip";
  if (!(await verificarTurnstile(data.turnstileToken,ip)))
    return json({erro:"Conclua a verificação de segurança."},422);
  const hash = createHmac("sha256",salt).update(ip).digest("hex");
  const params = {
    p_tipo:data.tipo,p_nome:data.nome,p_whatsapp:data.whatsapp,
    p_equipamento:data.equipamento,p_servico:data.servico,
    p_modalidade:data.modalidade,p_cep:data.cep,
    p_descricao:data.descricao,p_origem_hash:hash
  };
  try {
    const result = await consultaPrivada("rpc/pd_criar_solicitacao",{
      method:"POST", body:JSON.stringify(params)
    });
    const output = await result.json();
    if (!result.ok) {
      if (output.message === "LIMITE_DE_SOLICITACOES")
        return json({erro:"Limite temporário de solicitações. Tente novamente mais tarde."},429);
      console.error("Falha ao registrar solicitação:",output.code || result.status);
      return json({erro:"Não foi possível salvar sua solicitação."},503);
    }
    const saved = Array.isArray(output) ? output[0] : output;
    if (!saved?.protocolo || !saved?.id) throw new Error("RPC_SEM_RETORNO");
    return json({
      protocolo:saved.protocolo,
      resumo:{
        tipo:data.tipo,equipamento:data.equipamento,servico:data.servico,
        modalidade:data.modalidade,cep:data.cep,
        whatsapp:mascararWhatsapp(data.whatsapp)
      },
      aviso:"Recebemos a solicitação. O atendimento dependerá de confirmação pelo WhatsApp."
    },201);
  } catch (error) {
    console.error("Falha de conexão com Supabase:",error instanceof Error?error.message:"erro");
    return json({erro:"Serviço indisponível. Nenhum protocolo foi confirmado."},503);
  }
}
