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
            zi = zipfile.ZipInfo(rel, date_time=__import__('time').localtime()[:6]); zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16   # legível pelo servidor web (sem isso a HostGator responde 403)
            z.writestr(zi, t)
        elif rel.startswith("hostgator/api/") or rel.startswith("hostgator/painel/"):
            zi = zipfile.ZipInfo.from_file(p, rel.removeprefix("hostgator/")); zi.external_attr = 0o644 << 16; zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, p.read_bytes())
        else:
            zi = zipfile.ZipInfo.from_file(p, rel); zi.external_attr = 0o644 << 16; zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, p.read_bytes())
print(saida, len(arqs), "arquivos")
