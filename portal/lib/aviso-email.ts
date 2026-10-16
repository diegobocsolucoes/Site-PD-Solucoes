import "server-only";

import {montarAviso, type Aviso} from "./aviso-texto";

// Envia pelo Resend. Nunca lança: a solicitação já está salva quando chegamos aqui.
export async function enviarAviso(a: Aviso): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  const para = (process.env.PD_NOTIFY_EMAIL || "").split(",").map(s => s.trim()).filter(Boolean);
  const de = process.env.PD_NOTIFY_FROM;
  if (!chave || !para.length || !de) {
    console.warn("Aviso por e-mail não configurado (RESEND_API_KEY, PD_NOTIFY_EMAIL, PD_NOTIFY_FROM).");
    return false;
  }
  const { assunto, texto } = montarAviso(a);
  try {
    const resposta = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST", cache: "no-store",
      headers: { Authorization: "Bearer " + chave, "Content-Type": "application/json" },
      body: JSON.stringify({ from: de, to: para, subject: assunto, text: texto }),
      signal: AbortSignal.timeout(6000)
    });
    if (!resposta.ok) { console.error("Resend recusou o aviso:", resposta.status); return false; }
    return true;
  } catch (e) {
    console.error("Falha ao enviar aviso:", e instanceof Error ? e.message : "erro");
    return false;
  }
}
