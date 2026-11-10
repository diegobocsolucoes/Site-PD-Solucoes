#!/usr/bin/env python3
"""Monta o pacote pronto para subir na HostGator (cPanel).

Uso:
  python3 hostgator/build.py --dominio meusite.com.br --email aviso@exemplo.com
Gera dist/pd-hostgator/ e dist/pd-hostgator.zip.
"""
import argparse, re, secrets, shutil, sys, zipfile
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent
ANTIGO_URL = "https://diegobocsolucoes.github.io/Site-PD-Solucoes/"
ANTIGO_PREFIXO = "/Site-PD-Solucoes/"
ARQUIVOS_SITE = ["index.html", "404.html", "privacidade.html", "styles.css", "typography-refinements.css",
                 "site-navigation.js", "site-live.js", "robots.txt", "sitemap.xml"]
PASTAS_SITE = ["screens", "assets"]
IGNORAR = {".b64", ".map"}


def principal():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dominio", required=True, help="ex.: pdsolucoes.com.br (sem https:// e sem www)")
    ap.add_argument("--email", required=True, help="e-mail que recebe os avisos de novos pedidos")
    ap.add_argument("--remetente", help="remetente dos avisos (padrão: avisos@DOMINIO)")
    ap.add_argument("--turnstile-site", default="", help="chave PÚBLICA do Cloudflare Turnstile (opcional)")
    ap.add_argument("--turnstile-segredo", default="", help="chave SECRETA do Turnstile (opcional)")
    ap.add_argument("--modo-aviso", choices=["mail", "arquivo"], default="mail")
    ap.add_argument("--pasta-site", default="public_html", help="nome da pasta do site no servidor (domínio adicional: o próprio domínio)")
    ap.add_argument("--saida", default=str(RAIZ / "dist"))
    ap.add_argument("--http", action="store_true", help="só para testes locais: URLs http:// e sem forçar HTTPS")
    a = ap.parse_args()

    dominio = a.dominio.strip().lower().removeprefix("https://").removeprefix("http://").removeprefix("www.").strip("/")
    if not re.fullmatch(r"[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+|localhost(:\d+)?|127\.0\.0\.1(:\d+)?", dominio):
        sys.exit("Domínio inválido. Exemplo: pdsolucoes.com.br")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", a.email):
        sys.exit("E-mail inválido.")
    esquema = "http" if a.http else "https"
    origem = f"{esquema}://{dominio}"

    saida = Path(a.saida) / "pd-hostgator"
    if saida.exists():
        shutil.rmtree(saida)
    pub = saida / a.pasta_site
    priv = saida / "pd-privado"
    pub.mkdir(parents=True)
    priv.mkdir()

    # 1) Site estático com o domínio novo
    def copiar_texto(origem_arq: Path, destino: Path):
        t = origem_arq.read_text(encoding="utf-8")
        t = t.replace(ANTIGO_URL, origem + "/").replace(ANTIGO_PREFIXO, "/")
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(t, encoding="utf-8")

    def copiar(origem_arq: Path, destino: Path):
        if origem_arq.suffix in IGNORAR:
            return
        if origem_arq.suffix in {".html", ".js", ".css", ".xml", ".txt"}:
            copiar_texto(origem_arq, destino)
        else:
            destino.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(origem_arq, destino)

    for nome in ARQUIVOS_SITE:
        copiar(RAIZ / nome, pub / nome)
    for pasta in PASTAS_SITE:
        for f in sorted((RAIZ / pasta).rglob("*")):
            if f.is_file():
                copiar(f, pub / f.relative_to(RAIZ))

    live = pub / "site-live.js"
    t = live.read_text(encoding="utf-8")
    t, n1 = re.subn(r'const API_URL="";', f'const API_URL="{origem}";', t)
    t, n2 = re.subn(r'const TURNSTILE_KEY="";', f'const TURNSTILE_KEY="{a.turnstile_site}";', t)
    if n1 != 1 or n2 != 1:
        sys.exit("site-live.js não tem as constantes API_URL/TURNSTILE_KEY esperadas.")
    live.write_text(t, encoding="utf-8")

    # 2) Backend e painel
    shutil.copytree(AQUI / "api", pub / "api")
    shutil.copytree(AQUI / "painel", pub / "painel")
    shutil.copy2(AQUI / "instalar.php", pub / "instalar.php")
    (pub / "uploads" / "produtos").mkdir(parents=True)
    shutil.copy2(AQUI / "base" / "htaccess-uploads", pub / "uploads" / ".htaccess")
    (pub / "uploads" / "produtos" / ".gitkeep").write_text("")
    raiz_ht = (AQUI / "base" / "htaccess-raiz").read_text(encoding="utf-8")
    if a.http:
        raiz_ht = re.sub(r"# Força HTTPS\n(?:RewriteCond .*\n){2}RewriteRule .*\n", "", raiz_ht)
        raiz_ht = re.sub(r'.*Strict-Transport-Security.*\n', "", raiz_ht)
    (pub / ".htaccess").write_text(raiz_ht, encoding="utf-8")
    shutil.copy2(AQUI / "base" / "htaccess-inc", pub / "api" / "inc" / ".htaccess")
    shutil.copy2(AQUI / "base" / "htaccess-painel", pub / "painel" / ".htaccess")

    # 3) Pasta privada (fica FORA de public_html)
    cfg = (AQUI / "pd-privado" / "config.exemplo.php").read_text(encoding="utf-8")
    sal, token = secrets.token_hex(32), secrets.token_urlsafe(24)
    remetente_dom = a.remetente or f"avisos@{dominio.split(':')[0]}"
    for k, v in {"{{DOMINIO}}": dominio, "{{SAL}}": sal, "{{TOKEN}}": token, "{{EMAIL_AVISO}}": a.email}.items():
        cfg = cfg.replace(k, v)
    cfg = cfg.replace(f"avisos@{dominio}", remetente_dom)
    cfg = cfg.replace("'turnstile_segredo' => ''", f"'turnstile_segredo' => '{a.turnstile_segredo}'")
    cfg = cfg.replace("'modo' => 'mail',", f"'modo' => '{a.modo_aviso}',")
    (priv / "config.php").write_text(cfg, encoding="utf-8")
    shutil.copy2(AQUI / "base" / "htaccess-privado", priv / ".htaccess")
    (priv / "sessoes").mkdir()
    (priv / "sessoes" / ".htaccess").write_text("Require all denied\n")

    # 4) Guia
    guia = (AQUI / "LEIAME_HOSTGATOR.md")
    if guia.exists():
        t = guia.read_text(encoding="utf-8").replace("{{DOMINIO}}", dominio).replace("{{TOKEN}}", token).replace("{{EMAIL}}", a.email).replace("public_html", a.pasta_site)
        (saida / "LEIAME_HOSTGATOR.md").write_text(t, encoding="utf-8")

    # 5) Zip
    destino_zip = Path(a.saida) / "pd-hostgator.zip"
    if destino_zip.exists():
        destino_zip.unlink()
    with zipfile.ZipFile(destino_zip, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(saida.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(saida).as_posix())
    restos = [str(p.relative_to(saida)) for p in pub.rglob("*") if p.is_file() and p.suffix in {".html", ".js", ".xml"}
              and "diegobocsolucoes.github.io" in p.read_text(encoding="utf-8", errors="ignore")]
    if restos:
        print("AVISO: ainda há links do endereço antigo em:", *restos, sep="\n  ")
    print(f"Pacote: {destino_zip}  ({destino_zip.stat().st_size // 1024} KB)")
    print(f"Pasta : {saida}")
    print(f"Código de instalação (também está em pd-privado/config.php): {token}")


if __name__ == "__main__":
    principal()
