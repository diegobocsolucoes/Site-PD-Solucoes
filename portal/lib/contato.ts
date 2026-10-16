export const ASSUNTOS = ["orcamento-empresarial","chamado-empresarial","parceria","loja-rapida"] as const;
export type Assunto = typeof ASSUNTOS[number];

export const ROTULO_ASSUNTO: Record<Assunto,string> = {
  "orcamento-empresarial":"Orçamento empresarial",
  "chamado-empresarial":"Chamado empresarial",
  "parceria":"Proposta de parceria",
  "loja-rapida":"Consulta da Loja Rápida"
};

export type Contato = {
  assunto: Assunto; nome: string; whatsapp: string;
  linhas: string[]; turnstileToken: string;
};

const texto = (v: unknown) => typeof v === "string" ? v.trim() : "";
// Remove caracteres de controle (evita quebra de linha injetada em e-mail/log).
const limpar = (s: string) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();

export function validarContato(raw: unknown):
  { ok: true; data: Contato } | { ok: false; erro: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return { ok:false, erro:"Dados inválidos." };
  const r = raw as Record<string, unknown>;
  if (texto(r.site_url)) return { ok:false, erro:"Solicitação inválida." };
  const assunto = texto(r.assunto);
  if (!ASSUNTOS.includes(assunto as Assunto)) return { ok:false, erro:"Assunto inválido." };
  const nome = limpar(texto(r.nome));
  if (nome.length < 2 || nome.length > 100) return { ok:false, erro:"Informe o nome (2 a 100 caracteres)." };
  const whatsapp = texto(r.whatsapp).replace(/\D/g, "");
  if (!/^(?:\d{10,11}|55\d{10,11})$/.test(whatsapp)) return { ok:false, erro:"Informe um WhatsApp válido com DDD." };
  if (!Array.isArray(r.linhas) || r.linhas.length < 1 || r.linhas.length > 25)
    return { ok:false, erro:"Dados do pedido ausentes." };
  const linhas = r.linhas.map(l => limpar(typeof l === "string" ? l : "").slice(0, 400)).filter(Boolean);
  const resumo = linhas.join("\n");
  if (linhas.length < 1 || resumo.length < 10 || resumo.length > 2500)
    return { ok:false, erro:"Dados do pedido inválidos." };
  const turnstileToken = texto(r.turnstileToken);
  if (turnstileToken.length > 2048) return { ok:false, erro:"Verificação inválida." };
  return { ok:true, data:{ assunto: assunto as Assunto, nome, whatsapp, linhas, turnstileToken } };
}
