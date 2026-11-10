#!/bin/bash
# Testa o pacote HostGator localmente: constrói, instala (SQLite no lugar do MySQL), roda navegador e testes de segurança.
# Requer: php 8+, python3, playwright (python) e Pillow.
set -e
export PD_TESTE_DIR="${PD_TESTE_DIR:-/tmp/pd-teste}"
AQUI="$(cd "$(dirname "$0")" && pwd)"; S="$PD_TESTE_DIR"
pkill -f "php -S 127.0.0.1:8099" 2>/dev/null || true; sleep 0.3
rm -rf "$S/dist" "$S/mail.txt" "$S/teste.db"; mkdir -p "$S"
python3 "$AQUI/../build.py" --dominio 127.0.0.1:8099 --email dono@exemplo.com --saida "$S/dist" \
  --modo-aviso arquivo --remetente avisos@pd.example.com --http >/dev/null
python3 - "$S/dist/pd-hostgator/pd-privado/config.php" "$S" <<'E'
import sys,re
p,S=sys.argv[1:]; t=open(p).read()
t=re.sub(r"'dsn'\s*=>\s*'[^']*'", f"'dsn' => 'sqlite:{S}/teste.db'", t)
t=t.replace("'modo' => 'arquivo',", f"'modo' => 'arquivo', 'arquivo' => '{S}/mail.txt',")
open(p,'w').write(t)
E
cp "$AQUI/router.php" "$S/router.php"
(cd "$S/dist/pd-hostgator/public_html" && php -S 127.0.0.1:8099 -t . "$S/router.php" > "$S/php.log" 2>&1 &)
sleep 1
trap 'pkill -f "php -S 127.0.0.1:8099" || true' EXIT
python3 "$AQUI/e2e.py"
python3 "$AQUI/seg.py"
