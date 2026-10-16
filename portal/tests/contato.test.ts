import {test} from "node:test";
import {strict as assert} from "node:assert";
import {validarContato} from "../lib/contato";
import {montarAviso, linkWhatsapp} from "../lib/aviso-texto";

const ok = {
  assunto:"orcamento-empresarial", nome:"Ana Souza", whatsapp:"(31) 99999-1234",
  linhas:["ORÇAMENTO EMPRESARIAL","Empresa: ACME","Necessidade: trocar a rede do escritório"],
  turnstileToken:"t"
};

test("aceita contato válido e normaliza o WhatsApp", () => {
  const r = validarContato(ok);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.data.whatsapp, "31999991234");
});
test("recusa assunto desconhecido, WhatsApp ruim e campo-isca", () => {
  assert.equal(validarContato({...ok, assunto:"qualquer"}).ok, false);
  assert.equal(validarContato({...ok, whatsapp:"123"}).ok, false);
  assert.equal(validarContato({...ok, site_url:"http://spam"}).ok, false);
  assert.equal(validarContato({...ok, linhas:[]}).ok, false);
  assert.equal(validarContato(null).ok, false);
});
test("limita linhas e remove quebras/controle dentro de cada linha", () => {
  assert.equal(validarContato({...ok, linhas:Array(26).fill("linha de teste")}).ok, false);
  const r = validarContato({...ok, nome:"Ana\r\nBcc: x@y.com"});
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(/[\r\n]/.test(r.data.nome), false);
});
test("e-mail de aviso: assunto em uma linha, texto puro e link do WhatsApp", () => {
  const m = montarAviso({protocolo:"PD-CT-2026-0001", titulo:"Parceria", nome:"Ana\nBcc: x",
    whatsapp:"31999991234", linhas:["Empresa: ACME"]});
  assert.equal(/[\r\n]/.test(m.assunto), false);
  assert.ok(m.texto.includes("https://wa.me/5531999991234"));
  assert.ok(m.texto.includes("PD-CT-2026-0001") && m.texto.includes("Empresa: ACME"));
  assert.equal(linkWhatsapp("5531999991234"), "https://wa.me/5531999991234");
});
