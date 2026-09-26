#!/usr/bin/env python3
"""Validação do site oficial estático antes de cada publicação."""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
SCREENS = ROOT / "screens"
ALLOWED = [f"{i:02d}-" for i in range(1, 16)]

def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FALHA: {message}")

require((ROOT / "index.html").is_file(), "Home ausente")
require("Home V15" in (ROOT / "index.html").read_text(), "Home não é V15")
require((ROOT / "privacidade.html").is_file(), "Página de privacidade ausente")
require((ROOT / "preview/index.html").is_file(), "Redirecionamento antigo da prévia ausente")
require("página principal" in (ROOT / "preview/index.html").read_text(), "Prévia não redireciona")
dirs = sorted(x for x in SCREENS.iterdir() if x.is_dir())
require(len(dirs) == 15, f"Esperadas 15 páginas públicas, encontradas {len(dirs)}")
require(all(any(x.name.startswith(prefix) for prefix in ALLOWED) for x in dirs),
        "Pasta administrativa ou desconhecida exposta publicamente")
require(not (SCREENS / "16-admin-dashboard-v2").exists(), "Dashboard privado foi publicado")
require(not (SCREENS / "17-admin-solicitacoes-v2").exists(), "Solicitações privadas foram publicadas")

for filename in ("logo-pd-oficial.webp", "logo-pd-oficial-2.webp",
                 "scene-workstation-official.webp"):
    file = ROOT / "assets" / filename
    require(file.is_file(), f"Imagem oficial não encontrada: {filename}")
    signature = file.read_bytes()[:12]
    require(signature.startswith(b"RIFF") and signature[8:] == b"WEBP",
            f"Arquivo WEBP oficial inválido: {filename}")

class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.referenced: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        props = dict(attrs)
        if tag in ("script", "img") and props.get("src"):
            self.referenced.append((tag, props["src"]))
        elif tag == "link" and "stylesheet" in (props.get("rel") or ""):
            if props.get("href"):
                self.referenced.append((tag, props["href"]))

html_files = [ROOT / "index.html", ROOT / "privacidade.html"]
html_files += sorted(SCREENS.glob("*/index.html"))
missing_images: set[str] = set()
checked = 0
for doc in html_files:
    parser = Assets()
    parser.feed(doc.read_text(encoding="utf-8"))
    for tag, ref in parser.referenced:
        if ref.startswith(("data:", "//", "#")) or urlsplit(ref).scheme:
            continue
        path = (ROOT / unquote(ref.lstrip("/"))) if ref.startswith("/") else (doc.parent / unquote(urlsplit(ref).path))
        checked += 1
        if not path.is_file():
            if tag == "img":
                missing_images.add(ref)
            else:
                raise SystemExit(f"FALHA: {tag} ausente em {doc.relative_to(ROOT)}: {ref}")

store = (SCREENS / "08-loja-rapida-v2/index.html").read_text(encoding="utf-8")
require("SOB CONSULTA" in store, "O catálogo anuncia estoque sem verificação")
require(not re.search(r'<span class="price">\s*R\$', store),
        "Valores de demonstração expostos como preços públicos")
live = (ROOT / "site-live.js").read_text(encoding="utf-8")
require("wa.me" in live and "showDialog" in live, "Contato WhatsApp não implementado")
require("Não" not in live or "protocolo" in live, "Mensagem de atendimento não revisada")
print(json.dumps({
    "site": "PD SOLUÇÕES DIGITAIS / HOME V15 OFICIAL",
    "public_pages": len(dirs),
    "references_checked": checked,
    "official_hero": "OK",
    "official_logo": "OK",
    "private_admin_not_exposed": True,
    "illustrative_store_prices_hidden": True,
    "missing_images": sorted(missing_images)
}, indent=2, ensure_ascii=False))
