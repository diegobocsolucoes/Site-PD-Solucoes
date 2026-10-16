import {test} from "node:test";
import {strict as assert} from "node:assert";
import {
  validarProduto, lerPreco, formatarPreco, centavosParaCampo,
  detectarTipoImagem, produtoPublico
} from "../lib/produto";

test("cria produto só com nome e categoria, com padrões seguros", () => {
  const r = validarProduto({nome:"  Cabo   HDMI 2 m ", categoria:"Cabos"});
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.nome, "Cabo HDMI 2 m");
    assert.equal(r.data.status, "disponivel");
    assert.equal(r.data.ativo, true);
    assert.equal(r.data.destaque, false);
    assert.equal(r.data.quantidade, 0);
    assert.equal(r.data.preco_centavos, null);
  }
});

test("recusa nome curto, status e números inválidos", () => {
  assert.equal(validarProduto({nome:"x", categoria:"Cabos"}).ok, false);
  assert.equal(validarProduto({nome:"Mouse", categoria:""}).ok, false);
  assert.equal(validarProduto({nome:"Mouse", categoria:"Periféricos", status:"em_estoque"}).ok, false);
  assert.equal(validarProduto({nome:"Mouse", categoria:"Periféricos", preco_centavos:-1}).ok, false);
  assert.equal(validarProduto({nome:"Mouse", categoria:"Periféricos", preco_centavos:12.5}).ok, false);
  assert.equal(validarProduto({nome:"Mouse", categoria:"Periféricos", quantidade:-2}).ok, false);
  assert.equal(validarProduto({nome:"Mouse", categoria:"Periféricos", ativo:"sim"}).ok, false);
  assert.equal(validarProduto({nome:"Mouse", categoria:"Periféricos", descricao:"a".repeat(241)}).ok, false);
  assert.equal(validarProduto("texto").ok, false);
  assert.equal(validarProduto(null).ok, false);
});

test("edição parcial valida só o enviado e exige algum campo", () => {
  assert.equal(validarProduto({}, true).ok, false);
  const r = validarProduto({ativo:false}, true);
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.data, {ativo:false});
  assert.equal(validarProduto({status:"qualquer"}, true).ok, false);
  const s = validarProduto({preco_centavos:null, quantidade:3}, true);
  assert.equal(s.ok, true);
  if (s.ok) assert.deepEqual(s.data, {preco_centavos:null, quantidade:3});
});

test("lê preço em reais no formato brasileiro", () => {
  const casos: [string, number | null][] = [
    ["29,90", 2990], ["29.90", 2990], ["1.299,90", 129990], ["R$ 15", 1500],
    ["29,9", 2990], ["1000", 100000], ["", null], ["  ", null]
  ];
  for (const [entrada, esperado] of casos) {
    const r = lerPreco(entrada);
    assert.equal(r.ok, true, entrada);
    if (r.ok) assert.equal(r.centavos, esperado, entrada);
  }
  for (const ruim of ["abc", "-5", "10,999", "1,2,3", "99999999999"])
    assert.equal(lerPreco(ruim).ok, false, ruim);
});

test("formata preço e usa A CONFIRMAR quando não há valor", () => {
  assert.equal(formatarPreco(2990).replace(/\s/g, " "), "R$ 29,90");
  assert.equal(formatarPreco(null), "A CONFIRMAR");
  assert.equal(centavosParaCampo(129990), "1299,90");
  assert.equal(centavosParaCampo(null), "");
});

test("identifica imagem pelos bytes, não pelo nome", () => {
  const webp = new Uint8Array([0x52,0x49,0x46,0x46,1,2,3,4,0x57,0x45,0x42,0x50,0,0]);
  const jpg = new Uint8Array([0xff,0xd8,0xff,0xe0,0,0]);
  const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0]);
  assert.equal(detectarTipoImagem(webp), "webp");
  assert.equal(detectarTipoImagem(jpg), "jpg");
  assert.equal(detectarTipoImagem(png), "png");
  assert.equal(detectarTipoImagem(new TextEncoder().encode("<svg onload=alert(1)>")), null);
  assert.equal(detectarTipoImagem(new TextEncoder().encode("MZ executavel.exe")), null);
  assert.equal(detectarTipoImagem(new Uint8Array([])), null);
});

test("a loja pública nunca recebe estoque exato nem observação interna", () => {
  const linha = {
    id:"11111111-1111-1111-1111-111111111111", nome:"Mouse", categoria:"Periféricos",
    descricao:"", preco_centavos:4990, status:"disponivel" as const, destaque:true,
    foto_path:"11111111-1111-1111-1111-111111111111/1760000000000.webp",
    quantidade:7, observacao_interna:"comprado no atacado", ativo:true
  };
  const publico = produtoPublico(linha, p => p ? "https://exemplo.test/" + p : null);
  assert.equal("quantidade" in publico, false);
  assert.equal("observacao_interna" in publico, false);
  assert.equal("ativo" in publico, false);
  assert.equal(publico.foto_url, "https://exemplo.test/" + linha.foto_path);
  assert.equal(produtoPublico({...linha, foto_path:null}, () => null).foto_url, null);
});
