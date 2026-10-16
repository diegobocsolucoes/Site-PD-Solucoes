/* Navegação das telas oficiais aprovadas. */
(() => {
  "use strict";
  const script = document.currentScript;
  const base = new URL(".", script.src);
  const screen = location.pathname.match(/\/screens\/([^/]+)\//)?.[1] || "01-home-v15";
  const go = (slug, query = "") => location.assign(
    new URL("screens/" + slug + "/index.html" + query, base)
  );
  const normalize = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
  const HOME = [
    ["area para empresas", "03-area-empresas-v3"],
    ["solicitar orcamento", "14-orcamento-entrada-v2"],
    ["atendimento", "02-atendimento-v5"],
    ["consultoria", "10-consultoria-entrada-v2"],
    ["loja rapida", "08-loja-rapida-v2"],
    ["parcerias", "09-parcerias-v2"]
  ];
  const COMPANY = [
    ["abrir chamado", "13-chamado-empresarial-v2"],
    ["chamado empresarial", "13-chamado-empresarial-v2"],
    ["planos de chamados", "04-planos-chamados-v2"],
    ["consultoria de ti", "05-consultoria-ti-v2"],
    ["seguranca eletronica", "06-seguranca-eletronica-v2"],
    ["orcamento empresarial", "07-orcamento-empresarial-v2"]
  ];
  const CONSULT = [
    ["cliente / particular", "__escolher_cliente__"],
    ["empresa", "__escolher_empresa__"],
    ["computador domestico", "11-consultoria-domestica-v2"],
    ["consultoria domestica", "11-consultoria-domestica-v2"],
    ["consultoria de setup", "12-consultoria-setup-v2"],
    ["setup", "12-consultoria-setup-v2"],
    ["consultoria de ti", "05-consultoria-ti-v2"],
    ["seguranca eletronica", "06-seguranca-eletronica-v2"]
  ];
  const BUDGET = [
    ["empresa", "07-orcamento-empresarial-v2"],
    ["particular", "__orcamento_particular__"],
    ["pessoa fisica", "__orcamento_particular__"]
  ];
  const byScreen = {
    "01-home-v15": HOME,
    "03-area-empresas-v3": COMPANY,
    "10-consultoria-entrada-v2": CONSULT,
    "14-orcamento-entrada-v2": BUDGET
  };
  const patterns = byScreen[screen] || [];
  const detect = (s) => {
    const value = normalize(s);
    for (const [label, slug] of patterns) if (value.includes(label)) return slug;
    return null;
  };
  // Ativa apenas os cards de navegação. Não simula envio de formulários
  // nem transforma um pedido em confirmação sem persistência.
  document.querySelectorAll(
    ".category-card, .choice-card, .option-card, .service-choice, .selection-card, .cards > .card"
  ).forEach((card) => {
    const heading = card.querySelector("h2, h3, h4") || card;
    const slug = detect(heading.textContent);
    if (!slug) return;
    card.querySelectorAll("button:not([type='submit']), a").forEach((action) => {
      if (action.closest("form")) return;
      action.addEventListener("click", (event) => {
        if (action.tagName === "A" && /^https?:\/\//.test(action.href)) return;
        event.preventDefault();
        if (slug === "__orcamento_particular__") go("02-atendimento-v5", "?modo=orcamento");
        else if (slug === "__escolher_cliente__") chooseConsulting(false);
        else if (slug === "__escolher_empresa__") chooseConsulting(true);
        else go(slug);
      });
    });
  });
  // Mantém a escolha entre consultoria doméstica e setup, ou TI e segurança.
  function chooseConsulting(company) {
    const items = company
      ? [["CONSULTORIA DE TI", "05-consultoria-ti-v2"], ["SEGURANÇA ELETRÔNICA", "06-seguranca-eletronica-v2"]]
      : [["COMPUTADOR DOMÉSTICO", "11-consultoria-domestica-v2"], ["CONSULTORIA DE SETUP", "12-consultoria-setup-v2"]];
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", "Escolha o tipo de consultoria");
    dialog.style.cssText = "background:#101712;color:#f6f8f7;border:1px solid #79d497;"
      + "border-radius:8px;max-width:min(92vw,480px);width:100%;padding:24px;"
      + "box-shadow:0 20px 70px #000b;font:700 15px Arial,sans-serif";
    const heading = document.createElement("h2");
    heading.textContent = "SELECIONE SUA CONSULTORIA";
    heading.style.cssText = "font-size:21px;margin:0 0 18px";
    dialog.appendChild(heading);
    items.forEach(([name, slug]) => {
      const a = document.createElement("button");
      a.type = "button"; a.textContent = name + " →";
      a.style.cssText = "display:block;width:100%;padding:16px;margin:10px 0;"
        + "border:1px solid #79d497;background:#172b1c;color:#dbffe3;"
        + "text-align:left;cursor:pointer;font-weight:700";
      a.addEventListener("click", () => go(slug));
      dialog.appendChild(a);
    });
    const close = document.createElement("button");
    close.textContent = "CANCELAR"; close.type = "button";
    close.style.cssText = "margin-top:12px;padding:10px;border:0;color:#f4f4f4;background:transparent;cursor:pointer";
    close.addEventListener("click", () => dialog.close());
    dialog.appendChild(close);
    dialog.addEventListener("close", () => dialog.remove());
    document.body.appendChild(dialog); dialog.showModal();
  }
  if (screen === "10-consultoria-entrada-v2") {
    document.querySelectorAll(".subpath").forEach(el => {
      const name = normalize(el.querySelector("b")?.textContent);
      const routes = {
        "computador domestico": "11-consultoria-domestica-v2",
        "consultoria de setup": "12-consultoria-setup-v2",
        "consultoria de ti": "05-consultoria-ti-v2",
        "seguranca eletronica": "06-seguranca-eletronica-v2"
      };
      if (routes[name]) {
        el.style.cursor = "pointer"; el.tabIndex = 0; el.setAttribute("role", "link");
        el.addEventListener("click", () => go(routes[name]));
        el.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault(); go(routes[name]);
          }
        });
      }
    });
  }
  if (screen === "02-atendimento-v5" &&
      new URLSearchParams(location.search).get("modo") === "orcamento") {
    document.querySelector('[data-request-mode="quote"]')?.click();
  }
  // Liga as rotas das telas oficiais sem alterar as âncoras locais da Home.
  const navRoutes = [
    ["inicio", "01-home-v15"], ["voltar ao portal", "01-home-v15"],
    ["voltar ao inicio", "01-home-v15"], ["atendimento", "02-atendimento-v5"],
    ["area para empresas", "03-area-empresas-v3"], ["empresas", "03-area-empresas-v3"],
    ["voltar para empresas", "03-area-empresas-v3"],
    ["planos de chamados", "04-planos-chamados-v2"],
    ["abrir chamado", "13-chamado-empresarial-v2"],
    ["consultoria de ti", "05-consultoria-ti-v2"],
    ["seguranca eletronica", "06-seguranca-eletronica-v2"],
    ["orcamento empresarial", "07-orcamento-empresarial-v2"],
    ["consultoria", "10-consultoria-entrada-v2"],
    ["parcerias", "09-parcerias-v2"], ["loja rapida", "08-loja-rapida-v2"],
    ["solicitar orcamento", "14-orcamento-entrada-v2"]
  ];
  const absolute = (slug) => new URL("screens/" + slug + "/index.html", base).href;
  const navigate = (label) => {
    const text=normalize(label).replace(/^[\s←→↗◉]+/g,"");
    if (text.includes("whatsapp") || text.includes("falar com a pd")) return null;
    const match=navRoutes.find(([phrase]) => text===phrase);
    if (match) return absolute(match[1]);
    if (screen !== "01-home-v15") {
      if (text==="sobre"||text==="sobre a pd") return new URL("index.html#sobre",base).href;
      if (text==="como funciona") return new URL("index.html#como-funciona",base).href;
      if (text==="contato") return new URL("index.html#contato",base).href;
    }
    return null;
  };
  // Links de rodapé e de apoio que estavam sem destino. Cada texto leva a uma
  // tela existente ou à seção correspondente da própria página.
  const C13 = "13-chamado-empresarial-v2", B07 = "07-orcamento-empresarial-v2";
  const EXTRA = {
    "04-planos-chamados-v2": [["15 chamados", C13], ["20 chamados", C13], ["30 chamados", C13], ["chamado avulso", C13]],
    "05-consultoria-ti-v2": [["diagnostico inicial", B07], ["plano de melhorias", B07]],
    "06-seguranca-eletronica-v2": [["cftv e cameras", B07], ["alarmes e sensores", B07], ["controle de acesso", B07]],
    "07-orcamento-empresarial-v2": [["suporte tecnico", "#needs"]],
    "08-loja-rapida-v2": [["cabos", "#filters"], ["perifericos", "#filters"], ["adaptadores", "#filters"]],
    "09-parcerias-v2": [["como funciona", "#pd-como-funciona"], ["servicos", "#pd-servicos"], ["cadastro", "#pd-cadastro"]],
    "10-consultoria-entrada-v2": [["cliente / particular", "__escolher_cliente__"], ["empresa", "__escolher_empresa__"],
      ["computador domestico", "11-consultoria-domestica-v2"], ["consultoria de setup", "12-consultoria-setup-v2"],
      ["consultoria de ti", "05-consultoria-ti-v2"], ["seguranca eletronica", "06-seguranca-eletronica-v2"]],
    "11-consultoria-domestica-v2": [["computador domestico", "11-consultoria-domestica-v2"],
      ["consultoria de setup", "12-consultoria-setup-v2"], ["voltar para consultoria", "10-consultoria-entrada-v2"]],
    "12-consultoria-setup-v2": [["computador domestico", "11-consultoria-domestica-v2"],
      ["consultoria de setup", "12-consultoria-setup-v2"], ["voltar para consultoria", "10-consultoria-entrada-v2"],
      ["voltar", "10-consultoria-entrada-v2"]],
    "14-orcamento-entrada-v2": [["orcamento", "14-orcamento-entrada-v2"], ["cliente / particular", "__orcamento_particular__"],
      ["empresa", B07]]
  };
  if (screen === "09-parcerias-v2") {
    [["como funciona a parceria", "pd-como-funciona"], ["servicos que podem ser encaminhados", "pd-servicos"],
     ["solicitar parceria", "pd-cadastro"]].forEach(([frase, id]) => {
      const alvo = [...document.querySelectorAll("h1,h2,h3")].find(h => normalize(h.textContent).includes(frase));
      if (alvo && !alvo.id) alvo.id = id;
    });
  }
  const aplicar = (a, destino) => {
    if (destino.startsWith("#")) { a.href = destino; return; }
    if (destino.startsWith("__")) {
      a.href = "#";
      a.addEventListener("click", (event) => {
        event.preventDefault();
        if (destino === "__orcamento_particular__") go("02-atendimento-v5", "?modo=orcamento");
        else chooseConsulting(destino === "__escolher_empresa__");
      });
      return;
    }
    a.href = absolute(destino);
  };
  document.querySelectorAll("a").forEach(a => {
    if(a.classList.contains("brand")){a.href=new URL("index.html",base).href;return;}
    const href=a.getAttribute("href");
    // Preserva âncoras válidas da Home, URLs externas e links já definidos.
    if(href && href!=="#")return;
    const texto=normalize(a.textContent).replace(/^[\s←→↗◉]+/g,"");
    const extra=(EXTRA[screen]||[]).find(([frase]) => texto===frase);
    if(extra){ aplicar(a, extra[1]); return; }
    const target=navigate(a.textContent);
    if(target) a.href=target;
  });
  // As seções de rodapé da Home tinham somente texto, sem links.
  document.querySelectorAll(".footer-areas-final span").forEach(span=>{
    const target=navigate(span.textContent);
    if(!target)return;
    const a=document.createElement("a");
    a.href=target;
    a.textContent=span.textContent;
    a.className=span.className;
    a.style.cssText="color:inherit;text-decoration:none;display:block";
    span.replaceWith(a);
  });
  document.querySelectorAll(".footer-nav-final span,.footer-bottom-links span").forEach(span=>{
    if(normalize(span.textContent)!=="privacidade")return;
    const a=document.createElement("a");
    a.href=new URL("privacidade.html",base).href;
    a.textContent=span.textContent;
    a.className=span.className;
    a.style.cssText="color:inherit;text-decoration:none";
    span.replaceWith(a);
  });

})();
