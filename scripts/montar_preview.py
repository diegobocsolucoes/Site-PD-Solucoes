#!/usr/bin/env python3
"""Monta uma prévia navegável das telas aprovadas sem alterar os originais.

Entrada: approved-ui/sources-expanded/screens/ (recriada pelo bundle validado)
Saída:   preview-dist/ (artefato de revisão, nunca substitui a main)
"""
from __future__ import annotations

import base64
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "approved-ui" / "sources-expanded" / "screens"
DIST = ROOT / "preview-dist"
ROUTES = [
    ("01-home-v15", "Home V15", "Público"),
    ("02-atendimento-v5", "Atendimento V5", "Público"),
    ("03-area-empresas-v3", "Área para Empresas V3", "Público"),
    ("04-planos-chamados-v2", "Planos de Chamados V2", "Público"),
    ("05-consultoria-ti-v2", "Consultoria de TI V2", "Público"),
    ("06-seguranca-eletronica-v2", "Segurança Eletrônica V2", "Público"),
    ("07-orcamento-empresarial-v2", "Orçamento Empresarial V2", "Público"),
    ("08-loja-rapida-v2", "Loja Rápida V2", "Público"),
    ("09-parcerias-v2", "Parcerias V2", "Público"),
    ("10-consultoria-entrada-v2", "Consultoria — Entrada V2", "Público"),
    ("11-consultoria-domestica-v2", "Consultoria Doméstica V2", "Público"),
    ("12-consultoria-setup-v2", "Consultoria de Setup V2", "Público"),
    ("13-chamado-empresarial-v2", "Chamado Empresarial V2", "Público"),
    ("14-orcamento-entrada-v2", "Solicitar Orçamento — Entrada V2", "Público"),
    ("15-confirmacao-universal-v3", "Confirmação Universal V3", "Público"),
    ("16-admin-dashboard-v2", "Dashboard V2 (somente visual)", "Painel demonstrativo"),
    ("17-admin-solicitacoes-v2", "Solicitações V2 (somente visual)", "Painel demonstrativo"),
]


def prepare_assets() -> None:
    assets = DIST / "assets"
    assets.mkdir(parents=True)
    for filename in ("pd-background.jpg",):
        source = ROOT / "assets" / filename
        if source.exists():
            shutil.copy2(source, assets / filename)
    official = ROOT / "assets" / "official-logo.webp.b64"
    if official.exists():
        try:
            (assets / "logo-pd-oficial.webp").write_bytes(
                base64.b64decode(official.read_text(encoding="ascii").strip(), validate=True)
            )
        except (ValueError, base64.binascii.Error) as err:
            raise SystemExit(f"Não foi possível decodificar o logo oficial: {err}")
    if (ROOT / "logo.png").exists():
        shutil.copy2(ROOT / "logo.png", assets / "logo-original-referencia.png")


def prepare_screens() -> None:
    if not SOURCE.is_dir():
        raise SystemExit("Fontes aprovadas não reconstruídas. Execute o rebuild.sh primeiro.")
    missing = [slug for slug, _, _ in ROUTES if not (SOURCE / slug / "index.html").exists()]
    if missing:
        raise SystemExit("Fontes aprovadas ausentes: " + ", ".join(missing))
    shutil.copytree(SOURCE, DIST / "screens", dirs_exist_ok=True)
    for slug, _, _ in ROUTES:
        page = DIST / "screens" / slug / "index.html"
        original = page.read_text(encoding="utf-8")
        # A única alteração no layout da cópia de preview são caminhos relativos
        # de imagem/CSS e o script de navegação externo.
        modified = original.replace("../assets/", "../../assets/")
        css = DIST / "screens" / slug / "styles.css"
        if css.is_file():
            modified = re.sub(r'(?i)(["\'])' + re.escape(slug) + r'\.css\1',
                              lambda m: m.group(1) + "styles.css" + m.group(1), modified)
            if not re.search(r'href=["\']styles\.css["\']', modified, flags=re.I):
                modified = modified.replace("</head>", '  <link rel="stylesheet" href="styles.css">\n</head>', 1)
            css.write_text(css.read_text(encoding="utf-8").replace("../assets/", "../../assets/"), encoding="utf-8")
        script = '<script src="../../preview-navigation.js" defer></script>'
        if "</body>" not in modified.lower():
            raise SystemExit(f"HTML sem fechamento de body: {slug}")
        modified = re.sub(r"</body>", script + "\n</body>", modified, count=1, flags=re.I)
        page.write_text(modified, encoding="utf-8")


def write_nav() -> None:
    (DIST / "preview-navigation.js").write_text(
        r"""/* Navegação apenas na prévia: preserva o HTML/CSS aprovado. */
(() => {
  "use strict";
  const script = document.currentScript;
  const base = new URL(".", script.src);
  const screen = location.pathname.match(/\/screens\/([^/]+)\//)?.[1] || "01-home-v15";
  const go = (slug) => location.assign(new URL("screens/" + slug + "/index.html", base));
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
    ["computador domestico", "11-consultoria-domestica-v2"],
    ["consultoria domestica", "11-consultoria-domestica-v2"],
    ["consultoria de setup", "12-consultoria-setup-v2"],
    ["setup", "12-consultoria-setup-v2"],
    ["consultoria de ti", "05-consultoria-ti-v2"],
    ["seguranca eletronica", "06-seguranca-eletronica-v2"]
  ];
  const BUDGET = [
    ["empresa", "07-orcamento-empresarial-v2"],
    ["particular", "02-atendimento-v5"],
    ["pessoa fisica", "02-atendimento-v5"]
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
    ".category-card, .choice-card, .option-card, .service-choice, .selection-card"
  ).forEach((card) => {
    const heading = card.querySelector("h2, h3, h4") || card;
    const slug = detect(heading.textContent);
    if (!slug) return;
    card.querySelectorAll("button:not([type='submit']), a").forEach((action) => {
      if (action.closest("form")) return;
      action.addEventListener("click", (event) => {
        if (action.tagName === "A" && /^https?:\/\//.test(action.href)) return;
        event.preventDefault();
        go(slug);
      });
    });
  });
  // A barra de revisão aparece somente com ?revisao=1; não altera o
  // visual das telas aprovadas em suas URLs normais.
  if (new URLSearchParams(location.search).get("revisao") === "1") {
    const link = document.createElement("a");
    link.href = new URL("mapa.html", base).href;
    link.textContent = "MAPA DA PRÉVIA";
    link.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:99999;"
      + "background:#161b18;color:#83d89a;border:1px solid #83d89a;"
      + "padding:12px 16px;border-radius:6px;font:700 12px Arial,sans-serif;"
      + "box-shadow:0 8px 24px #0009;text-decoration:none";
    document.body.appendChild(link);
  }
})();
""",
        encoding="utf-8",
    )


def write_index() -> None:
    (DIST / "index.html").write_text(
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        '<meta http-equiv="refresh" content="0;url=screens/01-home-v15/index.html?revisao=1">'
        '<title>Prévia PD Soluções Digitais</title></head>'
        '<body><p><a href="screens/01-home-v15/index.html?revisao=1">'
        'Abrir Home V15 aprovada</a></p></body></html>\n',
        encoding="utf-8",
    )
    groups = ("Público", "Painel demonstrativo")
    entries = []
    for group in groups:
        cards = []
        for slug, name, typ in ROUTES:
            if typ != group:
                continue
            href = f"screens/{slug}/index.html?revisao=1"
            cards.append(f'<a class="card" href="{href}"><strong>{html.escape(name)}</strong>'
                         f'<span>{slug}</span></a>')
        entries.append(f'<h2>{html.escape(group)}</h2><div class="grid">{"".join(cards)}</div>')
    body = """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Mapa de revisão | PD Soluções Digitais</title>
<style>
:root{color-scheme:dark;font-family:Arial,sans-serif}*{box-sizing:border-box}
body{margin:0;background:#101513;color:#f1f5f2;line-height:1.5}
main{max-width:1150px;margin:auto;padding:32px 20px 70px}
h1{font-size:clamp(25px,5vw,42px);letter-spacing:-.035em}h2{color:#80d99d;margin:36px 0 14px}
p{color:#bfcac1;max-width:800px}a{color:inherit;text-decoration:none}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:13px}
.card{display:flex;flex-direction:column;gap:9px;padding:22px;border:1px solid #345c40;
background:#18231b;border-radius:8px}.card:hover,.card:focus-visible{outline:2px solid #80d99d}
.card span{font-size:12px;color:#9ca9a1}.note{padding:16px;background:#243027;border-left:4px solid #80d99d}
</style></head><body><main>
<p>PD SOLUÇÕES DIGITAIS / HOMOLOGAÇÃO</p><h1>MAPA DE REVISÃO DAS TELAS APROVADAS</h1>
<p class="note">Prévia de navegação. As telas são referências visuais oficiais.
Os formulários, protocolos, reservas e o Painel PD ainda não estão ligados ao banco.
Nenhuma solicitação é enviada a partir desta prévia.</p>
<p><a href="screens/01-home-v15/index.html?revisao=1">← Abrir Home V15</a></p>
""" + "".join(entries) + "</main></body></html>\n"
    (DIST / "mapa.html").write_text(body, encoding="utf-8")


def asset_report() -> None:
    ref_re = re.compile(r"""(?:src|href)\s*=\s*['"]([^'"]+)['"]|url\(\s*['"]?([^'")]+)""", re.I)
    missing = []
    for page in sorted((DIST / "screens").rglob("*")):
        if page.suffix.lower() not in (".html", ".css"):
            continue
        for match in ref_re.finditer(page.read_text(encoding="utf-8")):
            ref = (match.group(1) or match.group(2) or "").strip()
            if not ref or ref.startswith(("#", "data:", "blob:", "//")):
                continue
            parts = urlsplit(ref)
            if parts.scheme or ref.startswith("/"):
                continue
            local = (page.parent / parts.path).resolve()
            if not local.is_file() or not local.is_relative_to(DIST.resolve()):
                missing.append({"page": str(page.relative_to(DIST)), "reference": ref})
    (DIST / "relatorio-assets.json").write_text(
        json.dumps({"screens": len(ROUTES), "missing_references": missing},
                   indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Telas aprovadas integradas na prévia: {len(ROUTES)}")
    print(f"Referências relativas ausentes: {len(missing)}")
    for item in missing[:30]:
        print(f"  - {item['page']}: {item['reference']}")


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)
    prepare_assets()
    prepare_screens()
    write_nav()
    write_index()
    asset_report()
    assert len(list((DIST / "screens").glob("*/index.html"))) == len(ROUTES)
    assert (DIST / "assets" / "logo-pd-oficial.webp").stat().st_size > 1000


if __name__ == "__main__":
    main()
