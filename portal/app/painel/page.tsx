"use client";

import {createClient, type SupabaseClient} from "@supabase/supabase-js";
import {useState, type FormEvent} from "react";

type Pedido={
  id:string;protocolo:string;tipo:string;status:string;nome:string;
  whatsapp:string;equipamento:string;servico:string;modalidade:string;
  cep:string|null;descricao:string;criado_em:string;atualizado_em:string
};
const STATUSES=[
 ["novo","NOVO"],["aguardando_contato","AGUARDANDO CONTATO"],
 ["cliente_contatado","CLIENTE CONTATADO"],["orcamento_enviado","ORÇAMENTO ENVIADO"],
 ["aguardando_cliente","AGUARDANDO CLIENTE"],["agendado","AGENDADO"],
 ["em_atendimento","EM ATENDIMENTO"],["aguardando_peca_cliente","AGUARDANDO PEÇA/CLIENTE"],
 ["concluido","CONCLUÍDO"],["cancelado","CANCELADO"],["nao_convertido","NÃO CONVERTIDO"]
];
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"";
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
let client:SupabaseClient|null=null;
function authClient(){
 if(!url||!key)return null;
 if(!client)client=createClient(url,key);
 return client;
}
export default function Painel(){
 const [email,setEmail]=useState("");
 const [senha,setSenha]=useState("");
 const [codigo,setCodigo]=useState("");
 const [factor,setFactor]=useState("");
 const [qr,setQr]=useState("");
 const [secret,setSecret]=useState("");
 const [modo,setModo]=useState<"login"|"mfa"|"enroll"|"lista">("login");
 const [erro,setErro]=useState("");
 const [carregando,setCarregando]=useState(false);
 const [itens,setItens]=useState<Pedido[]>([]);
 const [selecionado,setSelecionado]=useState<string>("");
 const [pesquisa,setPesquisa]=useState("");

 async function carregar(){
   const sb=authClient();
   if(!sb)throw Error("Supabase não configurado.");
   const session=await sb.auth.getSession();
   const token=session.data.session?.access_token;
   if(!token)throw Error("Sessão expirada. Entre novamente.");
   const r=await fetch("/api/admin/solicitacoes",{
     cache:"no-store",headers:{Authorization:"Bearer "+token}
   });
   const data=await r.json();
   if(!r.ok)throw Error(data.erro||"Erro de acesso.");
   setItens(data.solicitacoes||[]);setModo("lista");
 }
 async function entrar(e:FormEvent){
   e.preventDefault();setErro("");setCarregando(true);
   try{
     const sb=authClient();if(!sb)throw Error("Configure a conexão Supabase.");
     const result=await sb.auth.signInWithPassword({email,password:senha});
     if(result.error)throw result.error;
     setSenha("");
     const factors=await sb.auth.mfa.listFactors();
     if(factors.error)throw factors.error;
     const totp=factors.data.totp.find(x=>x.status==="verified");
     if(totp){setFactor(totp.id);setModo("mfa");}
     else{
       const enroll=await sb.auth.mfa.enroll({factorType:"totp"});
       if(enroll.error)throw enroll.error;
       setFactor(enroll.data.id);
       setQr(enroll.data.totp.qr_code);
       setSecret(enroll.data.totp.secret);
       setModo("enroll");
     }
   }catch(ex){setErro(ex instanceof Error?ex.message:"Não foi possível entrar.");}
   finally{setCarregando(false);}
 }
 async function verificar(e:FormEvent){
   e.preventDefault();setErro("");setCarregando(true);
   try{
     const sb=authClient();if(!sb)throw Error("Supabase indisponível.");
     const res=await sb.auth.mfa.challengeAndVerify({factorId:factor,code:codigo.trim()});
     if(res.error)throw res.error;
     setCodigo("");setSecret("");setQr("");
     await carregar();
   }catch(ex){setErro(ex instanceof Error?ex.message:"Falha na verificação MFA.");}
   finally{setCarregando(false);}
 }
 async function mudar(id:string,status:string){
   setErro("");
   try{
     const sb=authClient();if(!sb)throw Error("Supabase indisponível.");
     const session=await sb.auth.getSession();
     const token=session.data.session?.access_token;
     if(!token)throw Error("Sessão expirada.");
     const r=await fetch("/api/admin/solicitacoes",{
       method:"PATCH",
       headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
       body:JSON.stringify({id,status})
     });
     const data=await r.json();if(!r.ok)throw Error(data.erro||"Não foi possível atualizar.");
     setItens(previous=>previous.map(x=>x.id===id?data.solicitacao:x));
   }catch(ex){setErro(ex instanceof Error?ex.message:"Erro ao atualizar.");}
 }
 async function sair(){
   await authClient()?.auth.signOut();
   setItens([]);setModo("login");setSelecionado("");setErro("");
 }
 const filtrados=itens.filter(x=>{
   const q=pesquisa.trim().toLowerCase();
   return !q||[x.protocolo,x.nome,x.whatsapp,x.servico,x.status]
     .some(value=>value?.toLowerCase().includes(q));
 });
 const atual=filtrados.find(x=>x.id===selecionado) || filtrados[0];
 return <main className="pd-admin">
   <div className="pd-admin-top">
     <div><span>PD SOLUÇÕES DIGITAIS</span><h1>PAINEL PD — SOLICITAÇÕES</h1></div>
     {modo==="lista"&&<button onClick={sair}>SAIR</button>}
   </div>
   {erro&&<p className="pd-admin-error" role="alert">{erro}</p>}
   {modo==="login"&&<form onSubmit={entrar} className="pd-admin-auth">
     <h2>ACESSO RESTRITO</h2>
     <p>Apenas o administrador autorizado com autenticação de dois fatores.</p>
     <label>E-MAIL<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
     <label>SENHA<input type="password" required value={senha} onChange={e=>setSenha(e.target.value)}/></label>
     <button disabled={carregando}>ENTRAR</button>
   </form>}
   {(modo==="mfa"||modo==="enroll")&&<form onSubmit={verificar} className="pd-admin-auth">
     <h2>VERIFICAÇÃO EM DUAS ETAPAS</h2>
     {modo==="enroll"&&<><p>Cadastre o autenticador. Guarde a chave em local seguro.</p>
       {qr&&<img src={qr} alt="QR Code para cadastrar o autenticador" width={200} height={200}/>}
       <code style={{overflowWrap:"anywhere"}}>{secret}</code></>}
     <label>CÓDIGO DO AUTENTICADOR<input required inputMode="numeric" minLength={6}
       maxLength={8} value={codigo} onChange={e=>setCodigo(e.target.value)}/></label>
     <button disabled={carregando}>VERIFICAR</button>
   </form>}
   {modo==="lista"&&<div className="pd-admin-cols">
     <section>
       <div className="pd-admin-tools">
         <label>BUSCAR POR PROTOCOLO, NOME OU WHATSAPP
           <input value={pesquisa} onChange={e=>setPesquisa(e.target.value)}/>
         </label>
         <button onClick={()=>void carregar()}>ATUALIZAR FILA</button>
       </div>
       <div role="table" aria-label="Solicitações recebidas">
         <div role="row" className="pd-admin-head"><span>PROTOCOLO</span><span>CLIENTE</span><span>STATUS</span></div>
         {filtrados.length===0&&<p>NENHUMA SOLICITAÇÃO ENCONTRADA.</p>}
         {filtrados.map(x=><button type="button" className={"pd-admin-row "+(x.id===atual?.id?"selected":"")}
           key={x.id} onClick={()=>setSelecionado(x.id)}>
           <strong>{x.protocolo}</strong><span>{x.nome}</span>
           <span>{STATUSES.find(([v])=>v===x.status)?.[1]||x.status}</span>
         </button>)}
       </div>
     </section>
     <aside className="pd-admin-detail">
       {atual?<><h2>{atual.protocolo}</h2>
         <p><strong>{atual.nome}</strong> — {atual.equipamento.toUpperCase()}</p>
         <p>{atual.tipo.toUpperCase()} • {atual.servico} • {atual.modalidade}</p>
         <p>{atual.descricao}</p>
         <p>CEP: {atual.cep||"A COMBINAR"}</p>
         <a href={"https://wa.me/"+(atual.whatsapp.startsWith("55")?atual.whatsapp:"55"+atual.whatsapp)}
           rel="noopener" target="_blank">CONTATAR PELO WHATSAPP ↗</a>
         <label>STATUS
           <select value={atual.status} onChange={e=>void mudar(atual.id,e.target.value)}>
             {STATUSES.map(([value,label])=><option key={value} value={value}>{label}</option>)}
           </select>
         </label>
         <small>Recebido em {new Date(atual.criado_em).toLocaleString("pt-BR")}</small>
       </>:<p>Selecione uma solicitação.</p>}
     </aside>
   </div>}
   <p className="pd-admin-foot">FILA FUNCIONAL INICIAL. A IDENTIDADE VISUAL DEFINITIVA DO PAINEL V2 ESTÁ PRESERVADA EM APPROVED-UI.</p>
 </main>;
}
