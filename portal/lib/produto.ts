export const STATUS_PRODUTO = ["disponivel","poucas_unidades","indisponivel"] as const;
export type StatusProduto = typeof STATUS_PRODUTO[number];
export const ROTULO_STATUS: Record<StatusProduto,string> = {
  disponivel:"DISPONÍVEL", poucas_unidades:"POUCAS UNIDADES", indisponivel:"INDISPONÍVEL"
};
export const TAMANHO_MAX_FOTO = 2 * 1024 * 1024;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CamposProduto = {
  nome: string;
  categoria: string;
  descricao: string;
  preco_centavos: number | null;
  quantidade: number;
  status: StatusProduto;
  ativo: boolean;
  destaque: boolean;
  ordem: number;
  observacao_interna: string | null;
};

// Linha completa como vem do banco (uso interno do painel).
export type LinhaProduto = CamposProduto & {
  id: string;
  foto_path: string | null;
  criado_em: string;
  atualizado_em: string;
};

// O que a loja pública recebe: sem estoque exato nem observação interna.
export type ProdutoPublico = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  preco_centavos: number | null;
  status: StatusProduto;
  destaque: boolean;
  foto_url: string | null;
};

type Resultado<T> = { ok: true; data: T } | { ok: false; erro: string };

const objeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown): string =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
const inteiro = (v: unknown, padrao: number, min: number, max: number): number | null => {
  if (v === undefined || v === null || v === "") return padrao;
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
};

/**
 * Valida os dados de um produto vindos do painel.
 * parcial=false: criação (nome e categoria obrigatórios, demais com padrão).
 * parcial=true: edição (só valida os campos enviados; exige ao menos um).
 */
export function validarProduto(raw: unknown, parcial = false): Resultado<Partial<CamposProduto>> {
  if (!objeto(raw)) return { ok: false, erro: "Dados inválidos." };
  const d: Partial<CamposProduto> = {};
  const enviar = (campo: string) => !parcial || Object.prototype.hasOwnProperty.call(raw, campo);

  if (enviar("nome")) {
    const nome = texto(raw.nome);
    if (nome.length < 2 || nome.length > 80)
      return { ok: false, erro: "Informe o nome do produto (2 a 80 caracteres)." };
    d.nome = nome;
  }
  if (enviar("categoria")) {
    const categoria = texto(raw.categoria);
    if (categoria.length < 2 || categoria.length > 40)
      return { ok: false, erro: "Informe a categoria (2 a 40 caracteres)." };
    d.categoria = categoria;
  }
  if (enviar("descricao")) {
    const descricao = texto(raw.descricao);
    if (descricao.length > 240)
      return { ok: false, erro: "A descrição aceita até 240 caracteres." };
    d.descricao = descricao;
  }
  if (enviar("preco_centavos")) {
    const v = raw.preco_centavos;
    if (v === undefined || v === null || v === "") d.preco_centavos = null;
    else if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100000000)
      d.preco_centavos = v;
    else return { ok: false, erro: "Preço inválido." };
  }
  if (enviar("quantidade")) {
    const q = inteiro(raw.quantidade, 0, 0, 100000);
    if (q === null) return { ok: false, erro: "Quantidade inválida (0 a 100000)." };
    d.quantidade = q;
  }
  if (enviar("status")) {
    const s = raw.status === undefined ? "disponivel" : raw.status;
    if (typeof s !== "string" || !STATUS_PRODUTO.includes(s as StatusProduto))
      return { ok: false, erro: "Status inválido." };
    d.status = s as StatusProduto;
  }
  for (const campo of ["ativo", "destaque"] as const) {
    if (!enviar(campo)) continue;
    const v = raw[campo] === undefined ? campo === "ativo" : raw[campo];
    if (typeof v !== "boolean") return { ok: false, erro: "Valor inválido em " + campo + "." };
    d[campo] = v;
  }
  if (enviar("ordem")) {
    const o = inteiro(raw.ordem, 0, 0, 100000);
    if (o === null) return { ok: false, erro: "Ordem inválida (0 a 100000)." };
    d.ordem = o;
  }
  if (enviar("observacao_interna")) {
    const v = typeof raw.observacao_interna === "string" ? raw.observacao_interna.trim() : "";
    if (v.length > 500)
      return { ok: false, erro: "A observação interna aceita até 500 caracteres." };
    d.observacao_interna = v || null;
  }
  if (parcial && Object.keys(d).length === 0)
    return { ok: false, erro: "Nenhum campo para atualizar." };
  return { ok: true, data: d };
}

/** Lê preço digitado em reais ("29,90", "1.299,90", "R$ 15"). Vazio = a confirmar. */
export function lerPreco(entrada: string): { ok: true; centavos: number | null } | { ok: false } {
  const t = entrada.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!t) return { ok: true, centavos: null };
  let normal: string;
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(t)) normal = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d+([.,]\d{1,2})?$/.test(t)) normal = t.replace(",", ".");
  else return { ok: false };
  const centavos = Math.round(Number(normal) * 100);
  if (!Number.isFinite(centavos) || centavos < 0 || centavos > 100000000) return { ok: false };
  return { ok: true, centavos };
}

export function formatarPreco(centavos: number | null): string {
  if (centavos === null || centavos === undefined) return "A CONFIRMAR";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

export function centavosParaCampo(centavos: number | null): string {
  return centavos === null || centavos === undefined
    ? "" : (centavos / 100).toFixed(2).replace(".", ",");
}

/** Identifica a imagem pelos primeiros bytes; não confia no nome nem no tipo informado. */
export function detectarTipoImagem(b: Uint8Array): "webp" | "jpg" | "png" | null {
  const igual = (inicio: number, bytes: number[]) =>
    bytes.every((x, i) => b[inicio + i] === x);
  if (b.length >= 8 && igual(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (b.length >= 3 && igual(0, [0xff, 0xd8, 0xff])) return "jpg";
  if (b.length >= 12 && igual(0, [0x52, 0x49, 0x46, 0x46]) && igual(8, [0x57, 0x45, 0x42, 0x50]))
    return "webp";
  return null;
}

export function produtoPublico(
  linha: Pick<LinhaProduto, "id" | "nome" | "categoria" | "descricao" | "preco_centavos"
    | "status" | "destaque" | "foto_path">,
  urlFoto: (caminho: string | null) => string | null
): ProdutoPublico {
  return {
    id: linha.id, nome: linha.nome, categoria: linha.categoria, descricao: linha.descricao,
    preco_centavos: linha.preco_centavos, status: linha.status, destaque: linha.destaque,
    foto_url: urlFoto(linha.foto_path)
  };
}
