export const SERVICOS = [
  "formatacao","lento","nao-liga","limpeza","windows","ssd","checkup",
  "virus","travamentos","superaquecimento","programas","backup","wifi",
  "hardware","novo-pc","otimizacao","tela-azul","atualizacoes",
  "transferencia","recuperacao","audio","usb","montagem","outro"
] as const;

export type Solicitacao = {
  tipo: "servico" | "orcamento";
  nome: string;
  whatsapp: string;
  equipamento: "desktop" | "notebook";
  servico: typeof SERVICOS[number];
  modalidade: "presencial" | "entrega";
  cep: string | null;
  descricao: string;
  turnstileToken: string;
};

const object = (v: unknown): v is Record<string,unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => typeof v === "string" ? v.trim() : "";

export function validarSolicitacao(raw: unknown):
  { ok: true; data: Solicitacao } | { ok: false; erro: string } {
  if (!object(raw)) return { ok:false, erro:"Dados inválidos." };
  // Campo-isca: bots que preenchem inputs ocultos são rejeitados.
  if (str(raw.site_url)) return { ok:false, erro:"Solicitação inválida." };
  const tipo = str(raw.tipo);
  const nome = str(raw.nome).replace(/\s+/g, " ");
  const whatsapp = str(raw.whatsapp).replace(/\D/g, "");
  const equipamento = str(raw.equipamento);
  const servico = str(raw.servico);
  const modalidade = str(raw.modalidade);
  const cep = str(raw.cep).replace(/\D/g, "");
  const descricao = str(raw.descricao);
  const turnstileToken = str(raw.turnstileToken);
  if (tipo !== "servico" && tipo !== "orcamento")
    return {ok:false,erro:"Selecione atendimento ou orçamento."};
  if (nome.length < 2 || nome.length > 100)
    return {ok:false,erro:"Informe seu nome (2 a 100 caracteres)."};
  if (!/^(?:\d{10,11}|55\d{10,11})$/.test(whatsapp))
    return {ok:false,erro:"Informe um WhatsApp válido com DDD."};
  if (equipamento !== "desktop" && equipamento !== "notebook")
    return {ok:false,erro:"Selecione desktop ou notebook."};
  if (!SERVICOS.includes(servico as Solicitacao["servico"]))
    return {ok:false,erro:"Escolha o serviço desejado."};
  if (modalidade !== "presencial" && modalidade !== "entrega")
    return {ok:false,erro:"Selecione a modalidade de atendimento."};
  if (modalidade === "presencial" && !/^\d{8}$/.test(cep))
    return {ok:false,erro:"Para atendimento no endereço, informe o CEP."};
  if (cep && !/^\d{8}$/.test(cep))
    return {ok:false,erro:"CEP inválido."};
  if (descricao.length < 10 || descricao.length > 500)
    return {ok:false,erro:"Descreva o problema (10 a 500 caracteres)."};
  if (turnstileToken.length > 2048)
    return {ok:false,erro:"Verificação inválida."};
  return {ok:true,data:{
    tipo,nome,whatsapp,equipamento,
    servico:servico as Solicitacao["servico"],
    modalidade,cep:cep || null,descricao,turnstileToken
  }};
}

export const mascararWhatsapp = (numero: string): string =>
  "••••••" + numero.slice(-4);
