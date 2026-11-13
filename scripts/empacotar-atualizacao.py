#!/usr/bin/env python3
"""Monta um zip de atualização do site JÁ com o domínio e o endereço do servidor (igual ao build.py).
Uso: python3 scripts/empacotar-atualizacao.py SAIDA.zip DOMINIO arquivo1 arquivo2 ...  (caminhos relativos à raiz do projeto)"""
import re, sys, zipfile
from pathlib import Path
RAIZ = Path(__file__).resolve().parent.parent
ANTIGO_URL, ANTIGO_PREFIXO = "https://diegobocsolucoes.github.io/Site-PD-Solucoes/", "/Site-PD-Solucoes/"
saida, dominio, *arqs = sys.argv[1:]
origem = "https://" + dominio
TEXTO = {".html", ".js", ".css", ".xml", ".txt"}
with zipfile.ZipFile(saida, "w", zipfile.ZIP_DEFLATED) as z:
    for rel in arqs:
        p = RAIZ / rel
        if p.suffix in TEXTO and not rel.startswith("hostgator/"):
            t = p.read_text(encoding="utf-8").replace(ANTIGO_URL, origem + "/").replace(ANTIGO_PREFIXO, "/")
            if rel == "site-live.js":
                t, n = re.subn(r'const API_URL="";', f'const API_URL="{origem}";', t)
                assert n == 1, "API_URL não encontrada"
            z.writestr(rel, t)
        elif rel.startswith("hostgator/api/") or rel.startswith("hostgator/painel/"):
            z.write(p, rel.removeprefix("hostgator/"))
        else:
            z.write(p, rel)
print(saida, len(arqs), "arquivos")
