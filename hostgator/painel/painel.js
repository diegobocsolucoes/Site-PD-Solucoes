/* Painel PD — interface em JavaScript puro. Todo texto vindo do servidor entra por textContent. */
(() => {
  "use strict";
  const STATUS_SOL = [["novo","NOVO"],["aguardando_contato","AGUARDANDO CONTATO"],["cliente_contatado","CLIENTE CONTATADO"],
    ["orcamento_enviado","ORÇAMENTO ENVIADO"],["aguardando_cliente","AGUARDANDO CLIENTE"],["agendado","AGENDADO"],
    ["em_atendimento","EM ATENDIMENTO"],["aguardando_peca_cliente","AGUARDANDO PEÇA/CLIENTE"],
    ["concluido","CONCLUÍDO"],["cancelado","CANCELADO"],["nao_convertido","NÃO CONVERTIDO"]];
  const STATUS_CT = [["novo","NOVO"],["contatado","CONTATADO"],["em_andamento","EM ANDAMENTO"],
    ["concluido","CONCLUÍDO"],["cancelado","CANCELADO"]];
  const ASSUNTOS = {"orcamento-empresarial":"ORÇAMENTO EMPRESARIAL","chamado-empresarial":"CHAMADO EMPRESARIAL",
    "parceria":"PARCERIA","loja-rapida":"LOJA RÁPIDA"};
  const ROTULO_PROD = {disponivel:"DISPONÍVEL",poucas_unidades:"POUCAS UNIDADES",indisponivel:"INDISPONÍVEL"};
  const FOTO_MAX = 2 * 1024 * 1024;

  const app = document.getElementById("app");
  let csrf = "";
  let usuario = "";
  let aba = "solicitacoes";

  /* ---------- utilidades ---------- */
  function h(tag, props, ...filhos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k in el && k !== "list" && k !== "form") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat()) {
      if (f === null || f === undefined || f === false) continue;
      el.append(f instanceof Node ? f : document.createTextNode(String(f)));
    }
    return el;
  }
  class SessaoExpirada extends Error {}
  async function api(caminho, opcoes = {}) {
    const { metodo = "GET", corpo } = opcoes;
    const headers = {};
    if (metodo !== "GET") headers["X-PD-CSRF"] = csrf;
    let body;
    if (corpo instanceof FormData) body = corpo;
    else if (corpo) { headers["Content-Type"] = "application/json"; body = JSON.stringify(corpo); }
    const r = await fetch(caminho, { method: metodo, headers, body, cache: "no-store", credentials: "same-origin" });
    const dados = await r.json().catch(() => ({}));
    if (r.status === 401 && csrf) { csrf = ""; mostrarLogin("Sessão expirada. Entre novamente."); throw new SessaoExpirada(); }
    if (!r.ok) throw new Error(dados.erro || "Não foi possível concluir.");
    return dados;
  }
  const quando = (s) => {
    const d = new Date(String(s).replace(" ", "T") + "Z");
    return isNaN(d) ? String(s) : d.toLocaleString("pt-BR");
  };
  function lerPreco(entrada) {
    const t = entrada.replace(/R\$/gi, "").replace(/\s/g, "");
    if (!t) return { ok: true, centavos: null };
    let normal;
    if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(t)) normal = t.replace(/\./g, "").replace(",", ".");
    else if (/^\d+([.,]\d{1,2})?$/.test(t)) normal = t.replace(",", ".");
    else return { ok: false };
    const centavos = Math.round(Number(normal) * 100);
    if (!Number.isFinite(centavos) || centavos < 0 || centavos > 100000000) return { ok: false };
    return { ok: true, centavos };
  }
  const formatarPreco = (c) => c === null || c === undefined ? "A CONFIRMAR"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(c / 100);
  const centavosParaCampo = (c) => c === null || c === undefined ? "" : (c / 100).toFixed(2).replace(".", ",");
  const linkZap = (n) => "https://wa.me/" + (n.startsWith("55") && n.length >= 12 ? n : "55" + n);

  /* ---------- login ---------- */
  function topo(comSair) {
    return h("div", { class: "pd-admin-top" },
      h("div", null, h("span", null, "PD SOLUÇÕES DIGITAIS"), h("h1", null, "PAINEL PD")),
      comSair ? h("button", { type: "button", onclick: sair }, "SAIR") : null);
  }
  function mostrarLogin(mensagem) {
    const erro = h("p", { class: "pd-admin-error", role: "alert", hidden: !mensagem }, mensagem || "");
    const usr = h("input", { type: "text", name: "usuario", required: true, autocomplete: "username", maxLength: 60 });
    const pwd = h("input", { type: "password", name: "senha", required: true, autocomplete: "current-password" });
    const botao = h("button", null, "ENTRAR");
    const form = h("form", { class: "pd-admin-auth", onsubmit: async (e) => {
      e.preventDefault(); erro.hidden = true; botao.disabled = true;
      try {
        await api("/api/admin/login", { metodo: "POST", corpo: { usuario: usr.value.trim(), senha: pwd.value } });
        pwd.value = ""; mostrarTotp();
      } catch (ex) { if (!(ex instanceof SessaoExpirada)) { erro.textContent = ex.message; erro.hidden = false; } }
      finally { botao.disabled = false; }
    } },
      h("h2", null, "ACESSO RESTRITO"),
      h("p", null, "Apenas o administrador autorizado, com senha e código do autenticador."),
      h("label", null, "USUÁRIO", usr), h("label", null, "SENHA", pwd), botao);
    app.replaceChildren(topo(false), erro, form);
  }
  function mostrarTotp() {
    const erro = h("p", { class: "pd-admin-error", role: "alert", hidden: true });
    const cod = h("input", { inputMode: "numeric", required: true, minLength: 6, maxLength: 8, autocomplete: "one-time-code" });
    const botao = h("button", null, "VERIFICAR");
    const form = h("form", { class: "pd-admin-auth", onsubmit: async (e) => {
      e.preventDefault(); erro.hidden = true; botao.disabled = true;
      try {
        const r = await api("/api/admin/totp", { metodo: "POST", corpo: { codigo: cod.value } });
        csrf = r.csrf; usuario = r.usuario; mostrarApp();
      } catch (ex) { erro.textContent = ex.message; erro.hidden = false; cod.value = ""; }
      finally { botao.disabled = false; }
    } }, h("h2", null, "VERIFICAÇÃO EM DUAS ETAPAS"),
      h("label", null, "CÓDIGO DO AUTENTICADOR", cod), botao);
    app.replaceChildren(topo(false), erro, form);
    cod.focus();
  }
  async function sair() {
    try { await api("/api/admin/sair", { metodo: "POST" }); } catch { /* sai mesmo assim */ }
    csrf = ""; mostrarLogin("");
  }

  /* ---------- estrutura com abas ---------- */
  function mostrarApp() {
    const conteudo = h("div");
    const abas = [["solicitacoes", "SOLICITAÇÕES"], ["contatos", "OUTROS PEDIDOS"], ["produtos", "LOJA RÁPIDA — PRODUTOS"]];
    const nav = h("nav", { class: "pd-admin-tabs", "aria-label": "Áreas do painel" });
    const trocar = (nome) => {
      aba = nome;
      [...nav.children].forEach((b) => b.classList.toggle("ativa", b.dataset.aba === nome));
      conteudo.replaceChildren(nome === "produtos" ? viewProdutos() : viewPedidos(nome));
    };
    abas.forEach(([nome, rotulo]) => nav.append(h("button", { type: "button", "data-aba": nome, onclick: () => trocar(nome) }, rotulo)));
    app.replaceChildren(topo(true), nav, conteudo);
    trocar(aba);
  }

  /* ---------- pedidos (solicitações e outros pedidos) ---------- */
  function viewPedidos(fonte) {
    const raiz = h("div");
    const contatos = fonte === "contatos";
    const status = contatos ? STATUS_CT : STATUS_SOL;
    const rotuloStatus = (v) => (status.find(([k]) => k === v) || [v, v])[1];
    let itens = [], selecionado = "", busca = "", erro = "";

    async function carregar() {
      erro = "";
      try { itens = (await api("/api/admin/solicitacoes?fonte=" + fonte))[fonte] || []; }
      catch (ex) { if (ex instanceof SessaoExpirada) return; erro = ex.message; }
      desenhar();
    }
    async function mudar(id, novo) {
      erro = "";
      try {
        const r = await api("/api/admin/solicitacoes", { metodo: "PATCH", corpo: { id, status: novo, fonte } });
        const atualizado = r.solicitacao || r.contato;
        itens = itens.map((x) => (x.id === id ? atualizado : x));
      } catch (ex) { if (ex instanceof SessaoExpirada) return; erro = ex.message; }
      desenhar();
    }
    function desenhar() {
      const q = busca.trim().toLowerCase();
      const filtrados = itens.filter((x) => !q || [x.protocolo, x.nome, x.whatsapp, x.servico || x.assunto, x.status]
        .some((v) => String(v || "").toLowerCase().includes(q)));
      const atual = filtrados.find((x) => x.id === selecionado) || filtrados[0];
      const pesquisa = h("input", { value: busca, oninput: (e) => { busca = e.target.value; desenhar(); const i = raiz.querySelector(".pd-busca input"); i && (i.focus(), i.setSelectionRange(busca.length, busca.length)); } });
      const lista = h("div", { role: "table", "aria-label": contatos ? "Outros pedidos recebidos" : "Solicitações recebidas" },
        h("div", { role: "row", class: "pd-admin-head" }, h("span", null, "PROTOCOLO"), h("span", null, "CLIENTE"), h("span", null, "STATUS")),
        filtrados.length === 0 ? h("p", null, contatos ? "NENHUM PEDIDO ENCONTRADO." : "NENHUMA SOLICITAÇÃO ENCONTRADA.") : null,
        filtrados.map((x) => h("button", { type: "button", class: "pd-admin-row " + (atual && x.id === atual.id ? "selected" : ""),
          onclick: () => { selecionado = x.id; desenhar(); } },
          h("strong", null, x.protocolo), h("span", null, x.nome), h("span", null, rotuloStatus(x.status)))));
      let detalhe;
      if (!atual) detalhe = h("p", null, "Selecione um pedido.");
      else {
        const seletor = h("select", { onchange: (e) => mudar(atual.id, e.target.value) },
          status.map(([v, t]) => h("option", { value: v, selected: v === atual.status }, t)));
        detalhe = h("div", null,
          h("h2", null, atual.protocolo),
          contatos
            ? [h("p", null, h("strong", null, atual.nome), " — ", ASSUNTOS[atual.assunto] || atual.assunto), h("div", { class: "pd-pre" }, atual.resumo)]
            : [h("p", null, h("strong", null, atual.nome), " — ", atual.equipamento.toUpperCase()),
               h("p", null, atual.tipo.toUpperCase() + " • " + atual.servico + " • " + atual.modalidade),
               h("p", null, atual.descricao), h("p", null, "CEP: " + (atual.cep || "A COMBINAR"))],
          h("a", { href: linkZap(atual.whatsapp), rel: "noopener noreferrer", target: "_blank" }, "CONTATAR PELO WHATSAPP ↗"),
          h("label", null, "STATUS", seletor),
          h("small", null, "Recebido em " + quando(atual.criado_em) + " • Aviso por e-mail: " + (Number(atual.aviso_enviado) ? "enviado" : "não enviado")));
      }
      raiz.replaceChildren(
        erro ? h("p", { class: "pd-admin-error", role: "alert" }, erro) : null,
        h("div", { class: "pd-admin-cols" },
          h("section", null,
            h("div", { class: "pd-admin-tools" },
              h("label", { class: "pd-busca" }, "BUSCAR POR PROTOCOLO, NOME OU WHATSAPP", pesquisa),
              h("button", { type: "button", onclick: carregar }, "ATUALIZAR FILA")),
            lista),
          h("aside", { class: "pd-admin-detail" }, detalhe)));
    }
    carregar();
    return raiz;
  }

  /* ---------- produtos ---------- */
  async function prepararFoto(arquivo) {
    if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type)) throw new Error("Use uma foto WEBP, JPG ou PNG.");
    try {
      const img = await createImageBitmap(arquivo);
      const escala = Math.min(1, 1000 / Math.max(img.width, img.height));
      const l = Math.max(1, Math.round(img.width * escala)), a = Math.max(1, Math.round(img.height * escala));
      const canvas = document.createElement("canvas"); canvas.width = l; canvas.height = a;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, l, a); ctx.drawImage(img, 0, 0, l, a);
        const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.85));
        if (blob && blob.type === "image/webp" && blob.size <= FOTO_MAX) return new File([blob], "foto.webp", { type: "image/webp" });
      }
    } catch { /* usa o arquivo original se o navegador não converter */ }
    if (arquivo.size > FOTO_MAX) throw new Error("A foto deve ter até 2 MB.");
    return arquivo;
  }

  function viewProdutos() {
    const raiz = h("div");
    let produtos = [], carregado = false, erro = "", aviso = "", editando = "", busca = "";
    let form = vazio(), arquivo = null, previaUrl = "", salvando = false;
    function vazio() { return { nome: "", categoria: "", descricao: "", preco: "", quantidade: "0", status: "disponivel", ordem: "0", ativo: true, destaque: false, observacao: "" }; }
    const paraForm = (p) => ({ nome: p.nome, categoria: p.categoria, descricao: p.descricao, preco: centavosParaCampo(p.preco_centavos),
      quantidade: String(p.quantidade), status: p.status, ordem: String(p.ordem), ativo: p.ativo, destaque: p.destaque, observacao: p.observacao_interna || "" });

    async function carregar() {
      erro = "";
      try { produtos = (await api("/api/admin/produtos")).produtos || []; carregado = true; }
      catch (ex) { if (ex instanceof SessaoExpirada) return; erro = ex.message; }
      desenhar();
    }
    function abrir(p) {
      erro = ""; aviso = ""; arquivo = null; if (previaUrl) URL.revokeObjectURL(previaUrl); previaUrl = "";
      if (p) { editando = p.id; form = paraForm(p); } else { editando = "novo"; form = vazio(); }
      desenhar();
    }
    function fechar() { editando = ""; arquivo = null; if (previaUrl) URL.revokeObjectURL(previaUrl); previaUrl = ""; form = vazio(); desenhar(); }
    const trocar = (novo) => { produtos = produtos.map((x) => (x.id === novo.id ? novo : x)); };

    async function salvar(e) {
      e.preventDefault(); erro = ""; aviso = "";
      const preco = lerPreco(form.preco);
      if (!preco.ok) { erro = 'Preço inválido. Exemplo: 29,90. Deixe vazio para "A CONFIRMAR".'; desenhar(); return; }
      const quantidade = Number(form.quantidade), ordem = Number(form.ordem);
      if (!Number.isInteger(quantidade) || !Number.isInteger(ordem)) { erro = "Quantidade e ordem devem ser números inteiros."; desenhar(); return; }
      const dados = { nome: form.nome, categoria: form.categoria, descricao: form.descricao, preco_centavos: preco.centavos, quantidade,
        status: form.status, ativo: form.ativo, destaque: form.destaque, ordem, observacao_interna: form.observacao };
      salvando = true; desenhar();
      try {
        let id = editando;
        if (editando === "novo") id = (await api("/api/admin/produtos", { metodo: "POST", corpo: dados })).produto.id;
        else await api("/api/admin/produtos", { metodo: "PATCH", corpo: { id, ...dados } });
        let falhaFoto = "";
        if (arquivo) {
          try {
            const pronta = await prepararFoto(arquivo);
            const envio = new FormData(); envio.append("id", id); envio.append("arquivo", pronta);
            await api("/api/admin/foto", { metodo: "POST", corpo: envio });
          } catch (ex) { if (ex instanceof SessaoExpirada) return; falhaFoto = ex.message || "Falha no envio."; }
        }
        await carregarSemDesenhar();
        if (falhaFoto) { editando = id; arquivo = null; erro = "Produto salvo, mas a foto não foi enviada: " + falhaFoto; }
        else { editando = ""; arquivo = null; form = vazio(); aviso = "Produto salvo."; }
      } catch (ex) { if (ex instanceof SessaoExpirada) return; erro = ex.message; }
      finally { salvando = false; desenhar(); }
    }
    async function carregarSemDesenhar() { produtos = (await api("/api/admin/produtos")).produtos || []; carregado = true; }
    async function alternar(p) {
      erro = ""; aviso = "";
      try { const r = await api("/api/admin/produtos", { metodo: "PATCH", corpo: { id: p.id, ativo: !p.ativo } }); trocar(r.produto);
        aviso = r.produto.ativo ? "Produto visível na loja." : "Produto oculto da loja."; }
      catch (ex) { if (ex instanceof SessaoExpirada) return; erro = ex.message; }
      desenhar();
    }
    async function excluir(p) {
      if (!window.confirm('Excluir "' + p.nome + '" definitivamente? Para só tirar da loja, use OCULTAR.')) return;
      erro = ""; aviso = "";
      try { await api("/api/admin/produtos", { metodo: "DELETE", corpo: { id: p.id } });
        produtos = produtos.filter((x) => x.id !== p.id); if (editando === p.id) { editando = ""; form = vazio(); } aviso = "Produto excluído."; }
      catch (ex) { if (ex instanceof SessaoExpirada) return; erro = ex.message; }
      desenhar();
    }
    async function removerFoto(p) {
      erro = ""; aviso = "";
      try { const r = await api("/api/admin/foto", { metodo: "DELETE", corpo: { id: p.id } }); trocar(r.produto); aviso = "Foto removida."; }
      catch (ex) { if (ex instanceof SessaoExpirada) return; erro = ex.message; }
      desenhar();
    }

    function previa(fotoUrl) {
      const preco = lerPreco(form.preco);
      const img = h("div", { class: "pd-prod-previa-img" }, h("span", null, ROTULO_PROD[form.status]),
        fotoUrl ? h("img", { src: fotoUrl, alt: "" }) : h("em", null, "SEM FOTO"));
      return h("div", { class: "pd-prod-previa", "aria-label": "Prévia da Loja Rápida" }, img,
        h("div", { class: "pd-prod-previa-corpo" },
          h("h3", null, form.nome || "NOME DO PRODUTO"), h("p", null, form.descricao || "DESCRIÇÃO CURTA"),
          h("div", null, h("small", null, "VALOR ATUAL"), h("strong", null, preco.ok ? formatarPreco(preco.centavos) : "PREÇO INVÁLIDO")),
          h("b", null, "CONSULTAR →")));
    }

    function desenhar() {
      const q = busca.trim().toLowerCase();
      const filtrados = produtos.filter((p) => !q || [p.nome, p.categoria, p.descricao].some((v) => v.toLowerCase().includes(q)));
      const categorias = [...new Set(produtos.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
      const atual = produtos.find((p) => p.id === editando);
      const campo = (k) => (e) => { form[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value; if (["nome","descricao","preco","status"].includes(k)) atualizarPrevia(); };
      let previaBox = h("div");
      const atualizarPrevia = () => { const novo = previa(previaUrl || (atual && atual.foto_url) || ""); previaBox.replaceWith(novo); previaBox = novo; };
      previaBox = previa(previaUrl || (atual && atual.foto_url) || "");

      const linhas = filtrados.map((p) => h("div", { role: "row", class: "pd-prod-row " + (p.id === editando ? "selected " : "") + (p.ativo ? "" : "oculto") },
        h("span", { class: "pd-prod-foto" }, p.foto_url ? h("img", { src: p.foto_url, alt: "" }) : "—"),
        h("button", { type: "button", class: "pd-prod-nome", onclick: () => abrir(p) },
          h("strong", null, p.nome), h("small", null, p.categoria + (p.destaque ? " • DESTAQUE" : "") + (p.ativo ? "" : " • OCULTO"))),
        h("span", null, formatarPreco(p.preco_centavos)),
        h("span", null, ROTULO_PROD[p.status], h("small", null, " • " + p.quantidade + " UN.")),
        h("span", { class: "pd-prod-acoes" },
          h("button", { type: "button", onclick: () => alternar(p) }, p.ativo ? "OCULTAR" : "MOSTRAR"),
          h("button", { type: "button", class: "perigo", onclick: () => excluir(p) }, "EXCLUIR"))));

      let painelForm;
      if (!editando) painelForm = h("p", null, "Selecione um produto ou cadastre um novo.");
      else {
        const inp = (rot, k, extra) => h("label", null, rot, h("input", { value: form[k], oninput: campo(k), ...extra }));
        painelForm = h("form", { onsubmit: salvar },
          h("h2", null, editando === "novo" ? "NOVO PRODUTO" : "EDITAR PRODUTO"),
          inp("NOME *", "nome", { required: true, minLength: 2, maxLength: 80 }),
          h("label", null, "CATEGORIA *", h("input", { value: form.categoria, oninput: campo("categoria"), required: true, minLength: 2, maxLength: 40, setAttribute: null, list: undefined, "list": "pd-categorias" })),
          h("datalist", { id: "pd-categorias" }, categorias.map((c) => h("option", { value: c }))),
          h("label", null, "DESCRIÇÃO CURTA", h("textarea", { maxLength: 240, rows: 3, value: form.descricao, oninput: campo("descricao") })),
          h("div", { class: "pd-prod-duplo" },
            inp("PREÇO (R$)", "preco", { inputMode: "decimal", placeholder: "VAZIO = A CONFIRMAR" }),
            inp("ESTOQUE (INTERNO)", "quantidade", { type: "number", min: 0, max: 100000 })),
          h("div", { class: "pd-prod-duplo" },
            h("label", null, "STATUS", h("select", { onchange: campo("status") }, Object.entries(ROTULO_PROD).map(([v, t]) => h("option", { value: v, selected: v === form.status }, t)))),
            inp("ORDEM NA LOJA", "ordem", { type: "number", min: 0, max: 100000 })),
          h("label", { class: "pd-prod-check" }, h("input", { type: "checkbox", checked: form.ativo, onchange: campo("ativo") }), " VISÍVEL NA LOJA"),
          h("label", { class: "pd-prod-check" }, h("input", { type: "checkbox", checked: form.destaque, onchange: campo("destaque") }), " PRODUTO EM DESTAQUE"),
          h("label", null, "OBSERVAÇÃO INTERNA (NÃO APARECE NA LOJA)", h("textarea", { maxLength: 500, rows: 2, value: form.observacao, oninput: campo("observacao") })),
          h("label", null, "FOTO (WEBP, JPG OU PNG)", h("input", { type: "file", accept: "image/webp,image/jpeg,image/png", onchange: (e) => {
            arquivo = e.target.files[0] || null;
            if (previaUrl) URL.revokeObjectURL(previaUrl);
            previaUrl = arquivo ? URL.createObjectURL(arquivo) : "";
            atualizarPrevia();
          } })),
          atual && atual.foto_url && !arquivo ? h("button", { type: "button", class: "perigo", onclick: () => removerFoto(atual) }, "REMOVER FOTO ATUAL") : null,
          h("h3", { class: "pd-prod-sub" }, "COMO APARECE NA LOJA RÁPIDA"), previaBox,
          h("div", { class: "pd-prod-botoes" },
            h("button", { disabled: salvando }, salvando ? "SALVANDO..." : "SALVAR"),
            h("button", { type: "button", onclick: fechar, disabled: salvando }, "CANCELAR")));
      }
      raiz.replaceChildren(h("div", { class: "pd-admin-cols" },
        h("section", null,
          h("div", { class: "pd-admin-tools" },
            h("label", null, "BUSCAR PRODUTO", h("input", { value: busca, oninput: (e) => { busca = e.target.value; desenhar(); const i = raiz.querySelector(".pd-admin-tools input"); i && (i.focus(), i.setSelectionRange(busca.length, busca.length)); } })),
            h("button", { type: "button", onclick: () => abrir(null) }, "NOVO PRODUTO"),
            h("button", { type: "button", onclick: carregar }, "ATUALIZAR")),
          erro ? h("p", { class: "pd-admin-error", role: "alert" }, erro) : null,
          aviso ? h("p", { class: "pd-admin-ok", role: "status" }, aviso) : null,
          h("div", { role: "table", "aria-label": "Produtos da Loja Rápida" },
            h("div", { role: "row", class: "pd-prod-row pd-admin-head" }, h("span"), h("span", null, "PRODUTO"), h("span", null, "PREÇO"), h("span", null, "STATUS"), h("span", null, "AÇÕES")),
            carregado && produtos.length === 0 ? h("p", null, 'NENHUM PRODUTO CADASTRADO. USE "NOVO PRODUTO" PARA COMEÇAR; A LOJA PÚBLICA MOSTRA "CATÁLOGO EM MONTAGEM" ENQUANTO ESTIVER VAZIA.') : null,
            linhas)),
        h("aside", { class: "pd-admin-detail" }, painelForm)));
    }
    carregar();
    return raiz;
  }

  /* ---------- início ---------- */
  (async () => {
    try {
      const r = await fetch("/api/admin/sessao", { cache: "no-store", credentials: "same-origin" });
      const d = await r.json().catch(() => ({}));
      if (d.autenticado) { csrf = d.csrf; usuario = d.usuario; mostrarApp(); return; }
    } catch { /* cai no login */ }
    mostrarLogin("");
  })();
})();
