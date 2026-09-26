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
  // Navegação transversal sem alterar âncoras reais nem submeter formulários.
  const navRoutes = [
    ["voltar ao portal", "01-home-v15"], ["inicio", "01-home-v15"],
    ["atendimento", "02-atendimento-v5"], ["empresas", "03-area-empresas-v3"],
    ["consultoria", "10-consultoria-entrada-v2"], ["parcerias", "09-parcerias-v2"],
    ["loja rapida", "08-loja-rapida-v2"]
  ];
  document.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href");
    if (href && href !== "#") return;
    const label = normalize(a.textContent);
    if (label.includes("whatsapp") || label.includes("falar com a pd")) {
      a.href = "https://wa.me/5531995483280";
      a.target = "_blank"; a.rel = "noopener noreferrer";
      return;
    }
    const target = navRoutes.find(([phrase]) => label === phrase);
    if (target) a.href = new URL("screens/" + target[1] + "/index.html", base).href;
    else if (a.classList.contains("brand")) a.href = new URL(
      "screens/01-home-v15/index.html", base).href;
  });

})();
