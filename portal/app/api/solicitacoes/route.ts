import {createHmac} from "node:crypto";
import {NextResponse} from "next/server";
import {consultaPrivada, ambienteServidor} from "@/lib/supabase-server";
import {validarSolicitacao, mascararWhatsapp} from "@/lib/solicitacao";
import {verificarTurnstile} from "@/lib/antifraude";
import {enviarAviso} from "@/lib/aviso-email";
import {cabecalhosCors, origemPermitida} from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {status: 204,
    headers: cabecalhosCors(request.headers.get("origin"), origemPermitida(request))});
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = origemPermitida(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, {status, headers: cabecalhosCors(origin, allowed)});
  if (!origin || origin !== allowed) return json({erro:"Origem não autorizada."},403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return json({erro:"Envie os dados em JSON."},415);
  const len = Number(request.headers.get("content-length") || "0");
  if (len > 8192) return json({erro:"Solicitação muito grande."},413);
  const config = ambienteServidor();
  const salt = process.env.PD_RATE_LIMIT_SALT;
  if (!config || !salt || salt.length < 24 ||
      (process.env.NODE_ENV === "production" &&
        (!process.env.TURNSTILE_SECRET_KEY || !process.env.PD_SITE_ORIGIN)))
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
    await enviarAviso({
      protocolo:saved.protocolo,
      titulo:data.tipo==="orcamento"?"Orçamento particular":"Atendimento particular",
      nome:data.nome, whatsapp:data.whatsapp,
      linhas:[
        "Equipamento: "+data.equipamento, "Serviço: "+data.servico,
        "Modalidade: "+(data.modalidade==="presencial"?"No endereço":"Entrega agendada"),
        ...(data.cep?["CEP: "+data.cep]:[]), "Problema: "+data.descricao
      ]
    });
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
