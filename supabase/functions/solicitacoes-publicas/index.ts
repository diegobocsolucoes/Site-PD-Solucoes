/** Endpoint público somente após ativar Turnstile e sal no Supabase.
 * CORS não autentica: desafio válido e limitação no PostgreSQL são obrigatórios.
 */
import {validar} from "./validation.ts";
const SITE_ORIGIN="https://diegobocsolucoes.github.io";
const encoder=new TextEncoder();
const allowed=(origin:string|null)=>origin===SITE_ORIGIN||
 (!!Deno.env.get("PD_ALLOWED_ORIGIN")&&origin===Deno.env.get("PD_ALLOWED_ORIGIN"));
function cors(origin:string|null):Record<string,string>{
 return allowed(origin)?{
   "Access-Control-Allow-Origin":origin!,
   "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
   "Access-Control-Allow-Headers":"content-type",
   "Access-Control-Max-Age":"3600","Vary":"Origin"
 }:{"Vary":"Origin"};
}
function json(body:object,status=200,origin:string|null=null){
 return new Response(JSON.stringify(body),{status,headers:{
   "Content-Type":"application/json; charset=utf-8",
   "Cache-Control":"no-store",
   "X-Content-Type-Options":"nosniff",...cors(origin)}});
}
const ready=()=>{
 const salt=Deno.env.get("PD_RATE_LIMIT_SALT");
 return Boolean(Deno.env.get("TURNSTILE_SECRET_KEY")&&salt&&salt.length>=24
   &&Deno.env.get("SUPABASE_URL")&&Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
};
async function originHash(req:Request):Promise<string>{
 const ip=(req.headers.get("cf-connecting-ip")||
   req.headers.get("x-forwarded-for")||req.headers.get("x-real-ip")||"sem-ip")
   .split(",")[0].trim().slice(0,90);
 const key=await crypto.subtle.importKey("raw",
   encoder.encode(Deno.env.get("PD_RATE_LIMIT_SALT")!),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=await crypto.subtle.sign("HMAC",key,encoder.encode(ip));
 return Array.from(new Uint8Array(sig)).map(n=>n.toString(16).padStart(2,"0")).join("");
}
async function turnstile(req:Request,token:string):Promise<boolean>{
 const secret=Deno.env.get("TURNSTILE_SECRET_KEY");
 if(!secret)return false;
 const ip=(req.headers.get("cf-connecting-ip")||
   req.headers.get("x-forwarded-for")||"").split(",")[0].trim();
 const form=new URLSearchParams({secret,response:token});
 if(ip)form.set("remoteip",ip);
 try{
   const r=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
     method:"POST",body:form,cache:"no-store",signal:AbortSignal.timeout(7000)
   });
   if(!r.ok)return false;
   const checked=await r.json() as {success?:boolean;hostname?:string};
   const expected=Deno.env.get("PD_TURNSTILE_HOSTNAME")||"diegobocsolucoes.github.io";
   return checked.success===true&&checked.hostname===expected;
 }catch{return false;}
}
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin");
 if(req.method==="GET"&&new URL(req.url).pathname.endsWith("/health"))
   return json({servico:"PD homologação",ativo:ready()},200,origin);
 if(req.method==="OPTIONS"){
   if(!allowed(origin))return json({erro:"Origem não autorizada."},403);
   return new Response(null,{status:204,headers:cors(origin)});
 }
 if(req.method!=="POST")return json({erro:"Método não permitido."},405,origin);
 if(!allowed(origin))return json({erro:"Origem não autorizada."},403);
 if(!req.headers.get("content-type")?.startsWith("application/json"))
   return json({erro:"Envie dados em JSON."},415,origin);
 if(!ready())return json({erro:"Formulário em homologação. Use o WhatsApp."},503,origin);
 if(Number(req.headers.get("content-length")||"0")>8192)
   return json({erro:"Solicitação muito grande."},413,origin);
 let raw:unknown;
 try{
   const body=await req.text();
   if(body.length>8192)return json({erro:"Solicitação muito grande."},413,origin);
   raw=JSON.parse(body);
 }catch{return json({erro:"JSON inválido."},400,origin);}
 const parsed=validar(raw);
 if(!parsed.ok)return json({erro:parsed.erro},422,origin);
 if(!await turnstile(req,parsed.data.turnstileToken))
   return json({erro:"Verificação de segurança não concluída."},422,origin);
 try{
   const d=parsed.data,hash=await originHash(req);
   const url=Deno.env.get("SUPABASE_URL")!.replace(/\/$/,"");
   const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
   const response=await fetch(url+"/rest/v1/rpc/pd_criar_solicitacao",{
     method:"POST",signal:AbortSignal.timeout(10000),headers:{
       "apikey":key,"Authorization":"Bearer "+key,
       "Content-Type":"application/json","Accept":"application/json"
     },body:JSON.stringify({
       p_tipo:d.tipo,p_nome:d.nome,p_whatsapp:d.whatsapp,
       p_equipamento:d.equipamento,p_servico:d.servico,
       p_modalidade:d.modalidade,p_cep:d.cep,p_descricao:d.descricao,p_origem_hash:hash
     })
   });
   const content=await response.json();
   if(!response.ok){
     if(content?.message==="LIMITE_DE_SOLICITACOES")
       return json({erro:"Limite temporário de solicitações. Tente mais tarde."},429,origin);
     console.error("Falha RPC PD",response.status,String(content?.code||"erro").slice(0,25));
     return json({erro:"Não foi possível registrar a solicitação."},503,origin);
   }
   const result=Array.isArray(content)?content[0]:content;
   if(!result?.protocolo||!result?.id)throw Error("RPC_SEM_RETORNO");
   return json({protocolo:result.protocolo,resumo:{
     tipo:d.tipo,equipamento:d.equipamento,servico:d.servico,
     modalidade:d.modalidade,cep:d.cep,
     whatsapp:"••••••"+d.whatsapp.slice(-4)
   },aviso:"Solicitação recebida. O atendimento depende de confirmação da PD."},201,origin);
 }catch(e){
   console.error("Falha infraestrutura PD",e instanceof Error?e.name:"erro");
   return json({erro:"Serviço indisponível. Nenhum protocolo foi confirmado."},503,origin);
 }
});
