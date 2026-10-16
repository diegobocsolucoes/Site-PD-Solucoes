import {consultaPrivada, armazenamentoPrivado, urlFotoPublica} from "@/lib/supabase-server";
import {exigirAdmin, json, lerJson} from "@/lib/admin-api";
import {validarProduto, UUID, type LinhaProduto} from "@/lib/produto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CAMPOS = "id,nome,categoria,descricao,preco_centavos,quantidade,status,ativo,destaque,ordem,"
  + "foto_path,observacao_interna,criado_em,atualizado_em";
const comFoto = (linha: LinhaProduto) => ({...linha, foto_url: urlFotoPublica(linha.foto_path)});

export async function GET(request: Request) {
  const negado = await exigirAdmin(request, false);
  if (negado) return negado;
  try {
    const res = await consultaPrivada("pd_produtos?select=" + CAMPOS +
      "&order=ordem.asc,nome.asc&limit=500");
    if (!res.ok) throw new Error("LEITURA_FALHOU");
    return json({produtos: (await res.json() as LinhaProduto[]).map(comFoto)});
  } catch { return json({erro:"Não foi possível consultar os produtos."}, 503); }
}

export async function POST(request: Request) {
  const negado = await exigirAdmin(request, true);
  if (negado) return negado;
  const lido = await lerJson(request);
  if (!lido.ok) return lido.resposta;
  const valido = validarProduto(lido.corpo, false);
  if (!valido.ok) return json({erro:valido.erro}, 422);
  try {
    const res = await consultaPrivada("pd_produtos?select=" + CAMPOS, {
      method:"POST", headers:{Prefer:"return=representation"},
      // O ID do administrador é definido no servidor, não no JSON do navegador.
      body: JSON.stringify({...valido.data, atualizado_por: process.env.PD_ADMIN_USER_ID})
    });
    if (!res.ok) throw new Error("CRIACAO_FALHOU");
    const linhas = await res.json() as LinhaProduto[];
    return json({produto: comFoto(linhas[0])}, 201);
  } catch { return json({erro:"Não foi possível cadastrar o produto."}, 503); }
}

export async function PATCH(request: Request) {
  const negado = await exigirAdmin(request, true);
  if (negado) return negado;
  const lido = await lerJson(request);
  if (!lido.ok) return lido.resposta;
  const {id, ...campos} = lido.corpo;
  if (typeof id !== "string" || !UUID.test(id)) return json({erro:"Produto inválido."}, 422);
  const valido = validarProduto(campos, true);
  if (!valido.ok) return json({erro:valido.erro}, 422);
  try {
    const res = await consultaPrivada("pd_produtos?id=eq." + encodeURIComponent(id) +
      "&select=" + CAMPOS, {
      method:"PATCH", headers:{Prefer:"return=representation"},
      body: JSON.stringify({...valido.data, atualizado_por: process.env.PD_ADMIN_USER_ID})
    });
    if (!res.ok) throw new Error("ATUALIZACAO_FALHOU");
    const linhas = await res.json() as LinhaProduto[];
    if (!Array.isArray(linhas) || !linhas.length) return json({erro:"Produto não encontrado."}, 404);
    return json({produto: comFoto(linhas[0])});
  } catch { return json({erro:"Não foi possível atualizar o produto."}, 503); }
}

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
    const res = await consultaPrivada("pd_produtos?id=eq." + encodeURIComponent(id),
      {method:"DELETE"});
    if (!res.ok) throw new Error("REMOCAO_FALHOU");
    // A foto é removida em seguida; uma falha aqui não desfaz a exclusão do produto.
    if (linhas[0].foto_path)
      await armazenamentoPrivado("object/produtos/" + linhas[0].foto_path, {method:"DELETE"})
        .catch(() => undefined);
    return json({ok:true});
  } catch { return json({erro:"Não foi possível excluir o produto."}, 503); }
}
