"use client";

import {useEffect, useMemo, useRef, useState, type FormEvent} from "react";
import {
  ROTULO_STATUS, STATUS_PRODUTO, TAMANHO_MAX_FOTO, centavosParaCampo,
  formatarPreco, lerPreco, type LinhaProduto, type StatusProduto
} from "@/lib/produto";

type Produto = LinhaProduto & {foto_url: string | null};
type Form = {
  nome: string; categoria: string; descricao: string; preco: string;
  quantidade: string; status: StatusProduto; ordem: string;
  ativo: boolean; destaque: boolean; observacao: string;
};
const VAZIO: Form = {
  nome:"", categoria:"", descricao:"", preco:"", quantidade:"0",
  status:"disponivel", ordem:"0", ativo:true, destaque:false, observacao:""
};
const paraForm = (p: Produto): Form => ({
  nome:p.nome, categoria:p.categoria, descricao:p.descricao,
  preco:centavosParaCampo(p.preco_centavos), quantidade:String(p.quantidade),
  status:p.status, ordem:String(p.ordem), ativo:p.ativo, destaque:p.destaque,
  observacao:p.observacao_interna || ""
});

async function chamar(
  obterToken: () => Promise<string>, caminho: string,
  metodo: "GET" | "POST" | "PATCH" | "DELETE", corpo?: object | FormData
) {
  const headers: Record<string,string> = {Authorization:"Bearer " + await obterToken()};
  let body: BodyInit | undefined;
  if (corpo instanceof FormData) body = corpo;
  else if (corpo) { headers["Content-Type"] = "application/json"; body = JSON.stringify(corpo); }
  const r = await fetch(caminho, {method:metodo, headers, body, cache:"no-store"});
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.erro || "Não foi possível concluir.");
  return data;
}

// Reduz e converte para WEBP no navegador; o servidor confere de novo pelos bytes.
async function prepararFoto(arquivo: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type))
    throw new Error("Use uma foto WEBP, JPG ou PNG.");
  try {
    const img = await createImageBitmap(arquivo);
    const escala = Math.min(1, 1000 / Math.max(img.width, img.height));
    const largura = Math.max(1, Math.round(img.width * escala));
    const altura = Math.max(1, Math.round(img.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = largura; canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, largura, altura);
      ctx.drawImage(img, 0, 0, largura, altura);
      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/webp", 0.85));
      if (blob && blob.type === "image/webp" && blob.size <= TAMANHO_MAX_FOTO)
        return new File([blob], "foto.webp", {type:"image/webp"});
    }
  } catch { /* usa o arquivo original se o navegador não converter */ }
  if (arquivo.size > TAMANHO_MAX_FOTO) throw new Error("A foto deve ter até 2 MB.");
  return arquivo;
}

function Previa({form, foto}: {form: Form; foto: string}) {
  const preco = lerPreco(form.preco);
  return <div className="pd-prod-previa" aria-label="Prévia da Loja Rápida">
    <div className="pd-prod-previa-img">
      <span>{ROTULO_STATUS[form.status]}</span>
      {foto ? <img src={foto} alt=""/> : <em>SEM FOTO</em>}
    </div>
    <div className="pd-prod-previa-corpo">
      <h3>{form.nome || "NOME DO PRODUTO"}</h3>
      <p>{form.descricao || "DESCRIÇÃO CURTA"}</p>
      <div><small>VALOR ATUAL</small>
        <strong>{preco.ok ? formatarPreco(preco.centavos) : "PREÇO INVÁLIDO"}</strong></div>
      <b>CONSULTAR →</b>
    </div>
  </div>;
}

export default function PainelProdutos({obterToken}: {obterToken: () => Promise<string>}) {
  const tokenRef = useRef(obterToken);
  tokenRef.current = obterToken;
  const api = (caminho: string, metodo: "GET" | "POST" | "PATCH" | "DELETE", corpo?: object | FormData) =>
    chamar(() => tokenRef.current(), caminho, metodo, corpo);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState("");   // "" | "novo" | id
  const [form, setForm] = useState<Form>(VAZIO);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");

  async function carregar() {
    setErro("");
    try {
      const data = await api("/api/admin/produtos", "GET");
      setProdutos(data.produtos || []); setCarregado(true);
    } catch (ex) { setErro(ex instanceof Error ? ex.message : "Erro ao carregar."); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void carregar(); }, []);
  useEffect(() => {
    if (!arquivo) { setPrevia(""); return; }
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const atual = produtos.find(p => p.id === editando);
  const categorias = useMemo(
    () => [...new Set(produtos.map(p => p.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [produtos]);
  const filtrados = produtos.filter(p => {
    const q = busca.trim().toLowerCase();
    return !q || [p.nome, p.categoria, p.descricao].some(v => v.toLowerCase().includes(q));
  });
  const campo = <K extends keyof Form>(chave: K, valor: Form[K]) =>
    setForm(anterior => ({...anterior, [chave]: valor}));

  function abrir(p: Produto | null) {
    setErro(""); setAviso(""); setArquivo(null);
    if (p) { setEditando(p.id); setForm(paraForm(p)); }
    else { setEditando("novo"); setForm(VAZIO); }
  }
  function fechar() { setEditando(""); setArquivo(null); setForm(VAZIO); }
  const trocar = (novo: Produto) =>
    setProdutos(lista => lista.map(x => x.id === novo.id ? novo : x));

  async function salvar(e: FormEvent) {
    e.preventDefault(); setErro(""); setAviso("");
    const preco = lerPreco(form.preco);
    if (!preco.ok) { setErro("Preço inválido. Exemplo: 29,90. Deixe vazio para \"A CONFIRMAR\"."); return; }
    const quantidade = Number(form.quantidade), ordem = Number(form.ordem);
    if (!Number.isInteger(quantidade) || !Number.isInteger(ordem)) {
      setErro("Quantidade e ordem devem ser números inteiros."); return;
    }
    const dados = {
      nome:form.nome, categoria:form.categoria, descricao:form.descricao,
      preco_centavos:preco.centavos, quantidade, status:form.status, ativo:form.ativo,
      destaque:form.destaque, ordem, observacao_interna:form.observacao
    };
    setSalvando(true);
    try {
      let id = editando;
      if (editando === "novo") id = (await api("/api/admin/produtos", "POST", dados)).produto.id;
      else await api("/api/admin/produtos", "PATCH", {id, ...dados});
      let falhaFoto = "";
      if (arquivo) {
        try {
          const pronta = await prepararFoto(arquivo);
          const envio = new FormData();
          envio.append("id", id); envio.append("arquivo", pronta);
          await api("/api/admin/produtos/foto", "POST", envio);
        } catch (ex) { falhaFoto = ex instanceof Error ? ex.message : "Falha no envio."; }
      }
      await carregar();
      if (falhaFoto) {
        setEditando(id); setArquivo(null);
        setErro("Produto salvo, mas a foto não foi enviada: " + falhaFoto);
      } else { fechar(); setAviso("Produto salvo."); }
    } catch (ex) { setErro(ex instanceof Error ? ex.message : "Não foi possível salvar."); }
    finally { setSalvando(false); }
  }

  async function alternarAtivo(p: Produto) {
    setErro(""); setAviso("");
    try {
      const data = await api("/api/admin/produtos", "PATCH", {id:p.id, ativo:!p.ativo});
      trocar(data.produto);
      setAviso(data.produto.ativo ? "Produto visível na loja." : "Produto oculto da loja.");
    } catch (ex) { setErro(ex instanceof Error ? ex.message : "Erro ao atualizar."); }
  }
  async function excluir(p: Produto) {
    if (!window.confirm("Excluir \"" + p.nome + "\" definitivamente? Para só tirar da loja, use OCULTAR.")) return;
    setErro(""); setAviso("");
    try {
      await api("/api/admin/produtos", "DELETE", {id:p.id});
      setProdutos(lista => lista.filter(x => x.id !== p.id));
      if (editando === p.id) fechar();
      setAviso("Produto excluído.");
    } catch (ex) { setErro(ex instanceof Error ? ex.message : "Erro ao excluir."); }
  }
  async function removerFoto(p: Produto) {
    setErro(""); setAviso("");
    try {
      const data = await api("/api/admin/produtos/foto", "DELETE", {id:p.id});
      trocar(data.produto); setAviso("Foto removida.");
    } catch (ex) { setErro(ex instanceof Error ? ex.message : "Erro ao remover a foto."); }
  }

  return <div className="pd-admin-cols">
    <section>
      <div className="pd-admin-tools">
        <label>BUSCAR PRODUTO
          <input value={busca} onChange={e => setBusca(e.target.value)}/>
        </label>
        <button type="button" onClick={() => abrir(null)}>NOVO PRODUTO</button>
        <button type="button" onClick={() => void carregar()}>ATUALIZAR</button>
      </div>
      {erro && <p className="pd-admin-error" role="alert">{erro}</p>}
      {aviso && <p className="pd-admin-ok" role="status">{aviso}</p>}
      <div role="table" aria-label="Produtos da Loja Rápida">
        <div role="row" className="pd-prod-row pd-admin-head">
          <span></span><span>PRODUTO</span><span>PREÇO</span><span>STATUS</span><span>AÇÕES</span>
        </div>
        {carregado && produtos.length === 0 &&
          <p>NENHUM PRODUTO CADASTRADO. USE &quot;NOVO PRODUTO&quot; PARA COMEÇAR; A LOJA PÚBLICA MOSTRA &quot;CATÁLOGO EM MONTAGEM&quot; ENQUANTO ESTIVER VAZIA.</p>}
        {filtrados.map(p => <div role="row" key={p.id}
          className={"pd-prod-row " + (p.id === editando ? "selected " : "") + (p.ativo ? "" : "oculto")}>
          <span className="pd-prod-foto">{p.foto_url ? <img src={p.foto_url} alt=""/> : "—"}</span>
          <button type="button" className="pd-prod-nome" onClick={() => abrir(p)}>
            <strong>{p.nome}</strong>
            <small>{p.categoria}{p.destaque ? " • DESTAQUE" : ""}{p.ativo ? "" : " • OCULTO"}</small>
          </button>
          <span>{formatarPreco(p.preco_centavos)}</span>
          <span>{ROTULO_STATUS[p.status]}<small> • {p.quantidade} UN.</small></span>
          <span className="pd-prod-acoes">
            <button type="button" onClick={() => void alternarAtivo(p)}>{p.ativo ? "OCULTAR" : "MOSTRAR"}</button>
            <button type="button" className="perigo" onClick={() => void excluir(p)}>EXCLUIR</button>
          </span>
        </div>)}
      </div>
    </section>

    <aside className="pd-admin-detail">
      {editando === "" ? <p>Selecione um produto ou cadastre um novo.</p> :
      <form onSubmit={salvar}>
        <h2>{editando === "novo" ? "NOVO PRODUTO" : "EDITAR PRODUTO"}</h2>
        <label>NOME *<input required minLength={2} maxLength={80} value={form.nome}
          onChange={e => campo("nome", e.target.value)}/></label>
        <label>CATEGORIA *<input required minLength={2} maxLength={40} list="pd-categorias"
          value={form.categoria} onChange={e => campo("categoria", e.target.value)}/></label>
        <datalist id="pd-categorias">{categorias.map(c => <option key={c} value={c}/>)}</datalist>
        <label>DESCRIÇÃO CURTA<textarea maxLength={240} rows={3} value={form.descricao}
          onChange={e => campo("descricao", e.target.value)}/></label>
        <div className="pd-prod-duplo">
          <label>PREÇO (R$)<input inputMode="decimal" placeholder="VAZIO = A CONFIRMAR"
            value={form.preco} onChange={e => campo("preco", e.target.value)}/></label>
          <label>ESTOQUE (INTERNO)<input type="number" min={0} max={100000} value={form.quantidade}
            onChange={e => campo("quantidade", e.target.value)}/></label>
        </div>
        <div className="pd-prod-duplo">
          <label>STATUS<select value={form.status}
            onChange={e => campo("status", e.target.value as StatusProduto)}>
            {STATUS_PRODUTO.map(s => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
          </select></label>
          <label>ORDEM NA LOJA<input type="number" min={0} max={100000} value={form.ordem}
            onChange={e => campo("ordem", e.target.value)}/></label>
        </div>
        <label className="pd-prod-check"><input type="checkbox" checked={form.ativo}
          onChange={e => campo("ativo", e.target.checked)}/> VISÍVEL NA LOJA</label>
        <label className="pd-prod-check"><input type="checkbox" checked={form.destaque}
          onChange={e => campo("destaque", e.target.checked)}/> PRODUTO EM DESTAQUE</label>
        <label>OBSERVAÇÃO INTERNA (NÃO APARECE NA LOJA)<textarea maxLength={500} rows={2}
          value={form.observacao} onChange={e => campo("observacao", e.target.value)}/></label>
        <label>FOTO (WEBP, JPG OU PNG)<input type="file" accept="image/webp,image/jpeg,image/png"
          onChange={e => setArquivo(e.target.files?.[0] || null)}/></label>
        {atual?.foto_url && !arquivo &&
          <button type="button" className="perigo" onClick={() => void removerFoto(atual)}>REMOVER FOTO ATUAL</button>}
        <h3 className="pd-prod-sub">COMO APARECE NA LOJA RÁPIDA</h3>
        <Previa form={form} foto={previa || atual?.foto_url || ""}/>
        <div className="pd-prod-botoes">
          <button disabled={salvando}>{salvando ? "SALVANDO..." : "SALVAR"}</button>
          <button type="button" onClick={fechar} disabled={salvando}>CANCELAR</button>
        </div>
      </form>}
    </aside>
  </div>;
}
