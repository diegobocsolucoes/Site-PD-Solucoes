export type Aviso = {
  protocolo: string; titulo: string; nome: string; whatsapp: string; linhas: string[];
};

const limpaLinha = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export function linkWhatsapp(whatsapp: string): string {
  const n = whatsapp.replace(/\D/g, "");
  return "https://wa.me/" + (n.startsWith("55") && n.length >= 12 ? n : "55" + n);
}

// Texto simples (sem HTML): nada digitado pelo cliente é interpretado.
export function montarAviso(a: Aviso): { assunto: string; texto: string } {
  return {
    assunto: limpaLinha(`[PD] ${a.titulo} — ${a.nome} (${a.protocolo})`).slice(0, 180),
    texto: [
      `Nova solicitação pelo site — ${a.titulo}`,
      `Protocolo: ${a.protocolo}`,
      `Cliente: ${a.nome}`,
      `WhatsApp: ${a.whatsapp}`,
      `Responder no WhatsApp: ${linkWhatsapp(a.whatsapp)}`,
      "",
      "DADOS DO PEDIDO",
      ...a.linhas,
      "",
      "Esta mensagem foi gerada automaticamente. A solicitação também está salva no Painel PD."
    ].join("\n")
  };
}

