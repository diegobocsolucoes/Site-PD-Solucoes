import {createHmac} from "node:crypto";
import {NextResponse} from "next/server";
import {consultaPrivada, ambienteServidor} from "@/lib/supabase-server";
import {validarContato, ROTULO_ASSUNTO} from "@/lib/contato";
import {verificarTurnstile} from "@/lib/antifraude";
import {enviarAviso} from "@/lib/aviso-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O site estático (GitHub Pages) chama esta API de outro domínio: libera só a origem oficial.
function cabecalhos(origem: string | null, permitida: string) {
  const h: Record<string,string> = {"Cache-Control":"no-store", "Vary":"Origin"};
  if (origem && origem === permitida) {
    h["Access-Control-Allow-Origin"] = permitida;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}

export async function OPTIONS(request: Request) {
  const permitida = process.env.PD_SITE_ORIGIN || new URL(request.url).origin;
  return new NextResponse(null, {status: 204, headers: cabecalhos(request.headers.get("origin"), permitida)});
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const permitida = process.env.PD_SITE_ORIGIN || new URL(request.url).origin;
  const resp = (data: object, status = 200) =>
    NextResponse.json(data, {status, headers: cabecalhos(origin, permitida)});
  if (!origin || origin !== permitida) return resp({erro:"Origem não autorizada."},403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return resp({erro:"Envie os dados em JSON."},415);
  const config = ambienteServidor();
  const salt = process.env.PD_RATE_LIMIT_SALT;
  if (!config || !salt || salt.length < 24 ||
      (process.env.NODE_ENV === "production" &&
        (!process.env.TURNSTILE_SECRET_KEY || !process.env.PD_SITE_ORIGIN)))
    return resp({erro:"Atendimento temporariamente indisponível."},503);
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 12000) return resp({erro:"Solicitação muito grande."},413);
    raw = JSON.parse(body);
  } catch { return resp({erro:"JSON inválido."},400); }
  const parsed = validarContato(raw);
  if (!parsed.ok) return resp({erro:parsed.erro},422);
  const data = parsed.data;
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "sem-ip";
  if (!(await verificarTurnstile(data.turnstileToken, ip)))
    return resp({erro:"Conclua a verificação de segurança."},422);
  const hash = createHmac("sha256", salt).update(ip).digest("hex");
  try {
    const result = await consultaPrivada("rpc/pd_criar_contato", {
      method:"POST",
      body: JSON.stringify({
        p_assunto:data.assunto, p_nome:data.nome, p_whatsapp:data.whatsapp,
        p_resumo:data.linhas.join("\n"), p_origem_hash:hash
      })
    });
    const output = await result.json();
    if (!result.ok) {
      if (output.message === "LIMITE_DE_SOLICITACOES")
        return resp({erro:"Limite temporário de solicitações. Tente novamente mais tarde."},429);
      console.error("Falha ao registrar contato:", output.code || result.status);
      return resp({erro:"Não foi possível salvar sua solicitação."},503);
    }
    const saved = Array.isArray(output) ? output[0] : output;
    if (!saved?.protocolo || !saved?.id) throw new Error("RPC_SEM_RETORNO");
    // Avisa o dono por e-mail. Falha no e-mail não perde o pedido: ele fica no Painel.
    const enviado = await enviarAviso({
      protocolo: saved.protocolo, titulo: ROTULO_ASSUNTO[data.assunto],
      nome: data.nome, whatsapp: data.whatsapp, linhas: data.linhas
    });
    if (enviado) {
      await consultaPrivada("pd_contatos?id=eq." + encodeURIComponent(saved.id), {
        method:"PATCH", body: JSON.stringify({aviso_enviado:true})
      }).catch(() => undefined);
    }
    return resp({
      protocolo: saved.protocolo,
      aviso:"Recebemos a sua solicitação. A PD retorna pelo WhatsApp informado para confirmar."
    },201);
  } catch (error) {
    console.error("Falha de conexão com Supabase:", error instanceof Error ? error.message : "erro");
    return resp({erro:"Serviço indisponível. Nenhum protocolo foi confirmado."},503);
  }
}
