export const SERVICOS=[
  "formatacao","lento","nao-liga","limpeza","windows","ssd","checkup",
  "virus","travamentos","superaquecimento","programas","backup","wifi",
  "hardware","novo-pc","otimizacao","tela-azul","atualizacoes",
  "transferencia","recuperacao","audio","usb","montagem","outro"
] as const;
export type Pedido={
 tipo:"servico"|"orcamento";nome:string;whatsapp:string;
 equipamento:"desktop"|"notebook";servico:typeof SERVICOS[number];
 modalidade:"presencial"|"entrega";cep:string|null;descricao:string;turnstileToken:string;
};
export type Validacao={ok:true;data:Pedido}|{ok:false;erro:string};
const clean=(v:unknown)=>typeof v==="string"?v.trim():"";
export function validar(raw:unknown):Validacao{
 if(!raw||Array.isArray(raw)||typeof raw!=="object")return {ok:false,erro:"Dados inválidos."};
 const r=raw as Record<string,unknown>;
 if(clean(r.site_url))return {ok:false,erro:"Solicitação inválida."};
 const tipo=clean(r.tipo),nome=clean(r.nome).replace(/\s+/g," ");
 const whatsapp=clean(r.whatsapp).replace(/\D/g,"");
 const equipamento=clean(r.equipamento),servico=clean(r.servico);
 const modalidade=clean(r.modalidade),cep=clean(r.cep).replace(/\D/g,"");
 const descricao=clean(r.descricao),turnstileToken=clean(r.turnstileToken);
 if(tipo!=="servico"&&tipo!=="orcamento")
   return {ok:false,erro:"Selecione atendimento ou orçamento."};
 if(nome.length<2||nome.length>100)return {ok:false,erro:"Informe seu nome (2 a 100 caracteres)."};
 if(!/^(?:\d{10,11}|55\d{10,11})$/.test(whatsapp))
   return {ok:false,erro:"Informe um WhatsApp válido com DDD."};
 if(equipamento!=="desktop"&&equipamento!=="notebook")
   return {ok:false,erro:"Escolha desktop ou notebook."};
 if(!SERVICOS.includes(servico as Pedido["servico"]))
   return {ok:false,erro:"Selecione o serviço."};
 if(modalidade!=="presencial"&&modalidade!=="entrega")
   return {ok:false,erro:"Selecione a modalidade de atendimento."};
 if(modalidade==="presencial"&&!/^\d{8}$/.test(cep))
   return {ok:false,erro:"Para visita, informe o CEP com 8 números."};
 if(cep&&!/^\d{8}$/.test(cep))return {ok:false,erro:"CEP inválido."};
 if(descricao.length<10||descricao.length>500)
   return {ok:false,erro:"Descreva o problema (10 a 500 caracteres)."};
 if(turnstileToken.length<10||turnstileToken.length>2048)
   return {ok:false,erro:"Conclua a verificação de segurança."};
 return {ok:true,data:{tipo,nome,whatsapp,equipamento,
   servico:servico as Pedido["servico"],modalidade,cep:cep||null,descricao,turnstileToken}};
}
