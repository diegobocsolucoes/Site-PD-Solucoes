import {validar} from "./validation.ts";
function expect(ok:boolean,message:string){if(!ok)throw Error(message);}
const base={
 tipo:"servico",nome:"Maria de Teste",whatsapp:"(31) 9 1234-5678",
 equipamento:"notebook",servico:"lento",modalidade:"presencial",
 cep:"32000-000",descricao:"Meu notebook está muito lento ao iniciar o Windows.",
 turnstileToken:"teste-unitario-somente"
};
Deno.test("valida e normaliza atendimento",()=>{
 const r=validar(base);expect(r.ok,"deveria aceitar dados válidos");
 if(r.ok){expect(r.data.whatsapp==="31912345678","WhatsApp normalizado");
   expect(r.data.cep==="32000000","CEP normalizado");}
});
Deno.test("orçamento por entrega sem CEP",()=>{
 const r=validar({...base,tipo:"orcamento",modalidade:"entrega",cep:""});
 expect(r.ok,"orçamento deveria passar");
 if(r.ok)expect(r.data.cep===null,"CEP deve ser nulo");
});
Deno.test("WhatsApp inválido recusado",()=>{
 expect(!validar({...base,whatsapp:"123"}).ok,"WhatsApp inválido");
});
Deno.test("serviço inválido recusado",()=>{
 expect(!validar({...base,servico:"servico-inventado"}).ok,"serviço inválido");
});
Deno.test("visita exige CEP",()=>{
 expect(!validar({...base,cep:""}).ok,"CEP obrigatório");
});
Deno.test("campo isca bloqueia bots",()=>{
 expect(!validar({...base,site_url:"spam"}).ok,"campo isca");
});
Deno.test("token Turnstile obrigatório",()=>{
 expect(!validar({...base,turnstileToken:""}).ok,"token ausente");
});
Deno.test("descrição curta rejeitada",()=>{
 expect(!validar({...base,descricao:"defeito"}).ok,"descrição curta");
});
Deno.test("entrada não estruturada rejeitada",()=>{
 expect(!validar("mensagem").ok,"entrada não estruturada");
});
