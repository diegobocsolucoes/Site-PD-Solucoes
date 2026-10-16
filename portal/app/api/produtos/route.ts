import {NextResponse} from "next/server";
import {ambienteServidor, consultaPrivada, urlFotoPublica} from "@/lib/supabase-server";
import {produtoPublico, type LinhaProduto} from "@/lib/produto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Somente campos públicos de produtos ativos: nunca estoque exato nem observação interna.
const CAMPOS = "id,nome,categoria,descricao,preco_centavos,status,destaque,foto_path";

export async function GET() {
  // Sem banco configurado, a loja mostra "catálogo em montagem".
  if (!ambienteServidor()) return NextResponse.json({produtos:[]}, {headers:{"Cache-Control":"no-store"}});
  try {
    const res = await consultaPrivada("pd_produtos?select=" + CAMPOS +
      "&ativo=eq.true&order=destaque.desc,ordem.asc,nome.asc&limit=200");
    if (!res.ok) throw new Error("LEITURA_FALHOU");
    const linhas = await res.json() as LinhaProduto[];
    return NextResponse.json(
      {produtos: linhas.map(linha => produtoPublico(linha, urlFotoPublica))},
      {headers:{"Cache-Control":"public, s-maxage=30, stale-while-revalidate=120"}}
    );
  } catch {
    return NextResponse.json({produtos:[], erro:"Catálogo indisponível no momento."},
      {status:503, headers:{"Cache-Control":"no-store"}});
  }
}
