import {NextResponse} from "next/server";
import {consultaPrivada, validarAdmin} from "@/lib/supabase-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const CAMPOS="id,protocolo,tipo,status,nome,whatsapp,equipamento,servico,modalidade,cep,descricao,criado_em,atualizado_em";
const STATUS=[
  "novo","aguardando_contato","cliente_contatado","orcamento_enviado",
  "aguardando_cliente","agendado","em_atendimento","aguardando_peca_cliente",
  "concluido","cancelado","nao_convertido"
];
const json=(body:object,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function GET(request: Request) {
  if(!(await validarAdmin(request))) return json({erro:"Acesso restrito ao administrador com MFA."},403);
  const limit=Number(new URL(request.url).searchParams.get("limit")||"30");
  const size=Number.isFinite(limit)?Math.min(50,Math.max(1,Math.floor(limit))):30;
  try{
    const res=await consultaPrivada("pd_solicitacoes?select="+CAMPOS+
      "&order=criado_em.desc&limit="+size);
    if(!res.ok)throw Error("LEITURA_FALHOU");
    return json({solicitacoes:await res.json()});
  }catch{return json({erro:"Não foi possível consultar as solicitações."},503);}
}

export async function PATCH(request:Request) {
  if(!(await validarAdmin(request)))return json({erro:"Acesso restrito ao administrador com MFA."},403);
  const expected=process.env.PD_SITE_ORIGIN||new URL(request.url).origin;
  if(request.headers.get("origin")!==expected)return json({erro:"Origem não autorizada."},403);
  let body:unknown;
  try{
    const raw=await request.text();
    if(raw.length>400) return json({erro:"Dados inválidos."},413);
    body=JSON.parse(raw);
  }catch{return json({erro:"Dados inválidos."},400);}
  if(!body||typeof body!=="object")return json({erro:"Dados inválidos."},422);
  const {id,status}=body as Record<string,unknown>;
  if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||
     typeof status!=="string"||!STATUS.includes(status))
    return json({erro:"Solicitação ou status inválido."},422);
  // O ID do administrador é definido no servidor, não no JSON do navegador.
  try{
    const res=await consultaPrivada(
      "pd_solicitacoes?id=eq."+encodeURIComponent(id)+"&select="+CAMPOS,{
        method:"PATCH",headers:{"Prefer":"return=representation"},
        body:JSON.stringify({status,atualizado_por:process.env.PD_ADMIN_USER_ID})
      });
    if(!res.ok)throw Error("ATUALIZACAO_FALHOU");
    const rows=await res.json();
    if(!Array.isArray(rows)||!rows.length)return json({erro:"Solicitação não encontrada."},404);
    return json({solicitacao:rows[0]});
  }catch{return json({erro:"Não foi possível atualizar o status."},503);}
}
