import {test} from "node:test";
import {strict as assert} from "node:assert";
import {validarSolicitacao,mascararWhatsapp} from "../lib/solicitacao";

const valid = {
 tipo:"servico",nome:"Maria Teste",whatsapp:"(31) 9 1234-5678",
 equipamento:"notebook",servico:"lento",modalidade:"presencial",
 cep:"32000000",descricao:"Notebook muito lento durante o trabalho.",
 turnstileToken:"token_de_teste"
};
test("normaliza e valida atendimento",()=>{
 const r=validarSolicitacao(valid);assert.equal(r.ok,true);
 if(r.ok){assert.equal(r.data.whatsapp,"31912345678");assert.equal(r.data.cep,"32000000");}
});
test("não aceita solicitação sem WhatsApp ou serviço",()=>{
 assert.equal(validarSolicitacao({...valid,whatsapp:"000"}).ok,false);
 assert.equal(validarSolicitacao({...valid,servico:"qualquer"}).ok,false);
});
test("CEP obrigatório no presencial, não na entrega",()=>{
 assert.equal(validarSolicitacao({...valid,cep:""}).ok,false);
 assert.equal(validarSolicitacao({...valid,cep:"",modalidade:"entrega"}).ok,true);
});
test("não aceita honeypot preenchido nem descrição vazia",()=>{
 assert.equal(validarSolicitacao({...valid,site_url:"spam"}).ok,false);
 assert.equal(validarSolicitacao({...valid,descricao:"curto"}).ok,false);
});
test("orçamento usa mesma validação e WhatsApp mascarado",()=>{
 assert.equal(validarSolicitacao({...valid,tipo:"orcamento"}).ok,true);
 assert.equal(mascararWhatsapp("31912345678"),"••••••5678");
});
