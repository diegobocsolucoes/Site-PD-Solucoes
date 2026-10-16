import {consultaPrivada, armazenamentoPrivado, urlFotoPublica} from "@/lib/supabase-server";
import {exigirAdmin, json, lerJson} from "@/lib/admin-api";
import {detectarTipoImagem, TAMANHO_MAX_FOTO, UUID, type LinhaProduto} from "@/lib/produto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CAMPOS = "id,nome,categoria,descricao,preco_centavos,quantidade,status,ativo,destaque,ordem,"
  + "foto_path,observacao_interna,criado_em,atualizado_em";
const TIPOS = {webp:"image/webp", jpg:"image/jpeg", png:"image/png"} as const;

async function definirFoto(id: string, caminho: string | null) {
  const res = await consultaPrivada("pd_produtos?id=eq." + encodeURIComponent(id) +
    "&select=" + CAMPOS, {
    method:"PATCH", headers:{Prefer:"return=representation"},
    body: JSON.stringify({foto_path: caminho, atualizado_por: process.env.PD_ADMIN_USER_ID})
  });
  if (!res.ok) throw new Error("ATUALIZACAO_FALHOU");
  const linhas = await res.json() as LinhaProduto[];
  return linhas[0] ? {...linhas[0], foto_url: urlFotoPublica(linhas[0].foto_path)} : null;
}
const removerObjeto = (caminho: string) =>
  armazenamentoPrivado("object/produtos/" + caminho, {method:"DELETE"}).catch(() => undefined);

// Envia ou troca a foto principal: multipart com "id" e "arquivo".
export async function POST(request: Request) {
  const negado = await exigirAdmin(request, true);
  if (negado) return negado;
  const tamanho = Number(request.headers.get("content-length") || "0");
  if (tamanho > TAMANHO_MAX_FOTO + 64 * 1024) return json({erro:"Foto maior que 2 MB."}, 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return json({erro:"Envio inválido."}, 400); }
  const id = form.get("id");
  const arquivo = form.get("arquivo");
  if (typeof id !== "string" || !UUID.test(id)) return json({erro:"Produto inválido."}, 422);
  if (!(arquivo instanceof File)) return json({erro:"Selecione uma foto."}, 422);
  if (arquivo.size === 0 || arquivo.size > TAMANHO_MAX_FOTO)
    return json({erro:"A foto deve ter até 2 MB."}, 413);
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const tipo = detectarTipoImagem(bytes);
  if (!tipo) return json({erro:"Use uma foto WEBP, JPG ou PNG."}, 415);
  try {
    const atual = await consultaPrivada("pd_produtos?id=eq." + encodeURIComponent(id) +
      "&select=foto_path");
    if (!atual.ok) throw new Error("LEITURA_FALHOU");
    const linhas = await atual.json() as {foto_path:string|null}[];
    if (!linhas.length) return json({erro:"Produto não encontrado."}, 404);
    const antiga = linhas[0].foto_path;
    const caminho = id.toLowerCase() + "/" + Date.now() + "." + tipo;
    const envio = await armazenamentoPrivado("object/produtos/" + caminho, {
      method:"POST", headers:{"Content-Type":TIPOS[tipo], "x-upsert":"false"}, body:bytes
    });
    if (!envio.ok) throw new Error("ENVIO_FALHOU");
    let produto;
    try { produto = await definirFoto(id, caminho); }
    catch { await removerObjeto(caminho); throw new Error("ATUALIZACAO_FALHOU"); }
    if (antiga) await removerObjeto(antiga);
    return json({produto});
  } catch { return json({erro:"Não foi possível salvar a foto."}, 503); }
}

// Remove a foto do produto (o produto continua cadastrado).
export async function DELETE(request: Request) {
  const negado = await exigirAdmin(request, true);
  if (negado) return negado;
  const lido = await lerJson(request, 200);
  if (!lido.ok) return lido.resposta;
  const id = lido.corpo.id;
  if (typeof id !== "string" || !UUID.test(id)) return json({erro:"Produto inválido."}, 422);
  try {
    const atual = await consultaPrivada("pd_produtos?id=eq." + encodeURIComponent(id) +
      "&select=foto_path");
    if (!atual.ok) throw new Error("LEITURA_FALHOU");
    const linhas = await atual.json() as {foto_path:string|null}[];
    if (!linhas.length) return json({erro:"Produto não encontrado."}, 404);
    const produto = await definirFoto(id, null);
    if (linhas[0].foto_path) await removerObjeto(linhas[0].foto_path);
    return json({produto});
  } catch { return json({erro:"Não foi possível remover a foto."}, 503); }
}
