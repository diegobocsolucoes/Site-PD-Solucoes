import csv
import json
import time
import sys
from pathlib import Path
from datetime import datetime
from urllib import request, parse, error

BASE = Path(__file__).resolve().parent
CONFIG_PATH = BASE / "config_tokens.json"
QUEUE_PATH = BASE / "fila_publicacoes.csv"
LOG_PATH = BASE / "log_publicacoes.txt"

def log(msg):
    linha = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(linha)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(linha + "\n")

def load_config():
    if not CONFIG_PATH.exists():
        raise FileNotFoundError("config_tokens.json não encontrado.")
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))

def read_queue():
    with open(QUEUE_PATH, "r", encoding="utf-8") as fp:
        return list(csv.DictReader(fp, delimiter=";"))

def save_queue(rows):
    if not rows:
        return
    with open(QUEUE_PATH, "w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=list(rows[0].keys()), delimiter=";")
        writer.writeheader()
        writer.writerows(rows)

def http_post_form(url, data):
    encoded = parse.urlencode(data).encode("utf-8")
    req = request.Request(url, data=encoded, method="POST")
    try:
        with request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, body
    except error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body

def http_post_json(url, payload, token):
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"
        }
    )
    try:
        with request.urlopen(req, timeout=60) as resp:
            data = resp.read().decode("utf-8")
            return resp.status, data
    except error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body

def publish_instagram(config, image_url, caption):
    ig = config["instagram"]
    if not ig.get("enabled"):
        log("Instagram desativado no config_tokens.json.")
        return False

    ig_user_id = ig.get("ig_user_id", "").strip()
    token = ig.get("access_token", "").strip()

    if not ig_user_id or "COLE_AQUI" in ig_user_id or not token or "COLE_AQUI" in token:
        log("Instagram não configurado. Preencha ig_user_id e access_token.")
        return False

    if not image_url:
        log("Instagram exige URL pública HTTPS da imagem. Preencha url_publica_imagem na fila.")
        return False

    # Etapa 1: criar container de mídia
    create_url = f"https://graph.facebook.com/v20.0/{ig_user_id}/media"
    status, body = http_post_form(create_url, {
        "image_url": image_url,
        "caption": caption,
        "access_token": token
    })

    if status < 200 or status >= 300:
        log(f"Erro ao criar mídia Instagram: HTTP {status} - {body}")
        return False

    try:
        creation_id = json.loads(body)["id"]
    except Exception:
        log(f"Resposta inesperada do Instagram ao criar mídia: {body}")
        return False

    time.sleep(3)

    # Etapa 2: publicar container
    publish_url = f"https://graph.facebook.com/v20.0/{ig_user_id}/media_publish"
    status, body = http_post_form(publish_url, {
        "creation_id": creation_id,
        "access_token": token
    })

    if status >= 200 and status < 300:
        log(f"Instagram publicado com sucesso: {body}")
        return True

    log(f"Erro ao publicar Instagram: HTTP {status} - {body}")
    return False

def publish_linkedin(config, image_url, caption):
    li = config["linkedin"]
    if not li.get("enabled"):
        log("LinkedIn desativado no config_tokens.json.")
        return False

    author = li.get("author_urn", "").strip()
    token = li.get("access_token", "").strip()

    if not author or "COLE_AQUI" in author or not token or "COLE_AQUI" in token:
        log("LinkedIn não configurado. Preencha author_urn e access_token.")
        return False

    # Publicação de texto simples.
    # Para imagem no LinkedIn, é necessário registrar upload, enviar binário e depois criar o post com asset.
    # Esta primeira versão publica texto. A imagem deve ser anexada manualmente ou evoluímos depois para upload com asset.
    post_url = "https://api.linkedin.com/v2/ugcPosts"
    payload = {
        "author": author,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {
                    "text": caption
                },
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }

    status, body = http_post_json(post_url, payload, token)
    if status >= 200 and status < 300:
        log(f"LinkedIn publicado com sucesso: {body}")
        return True

    log(f"Erro ao publicar LinkedIn: HTTP {status} - {body}")
    return False

def next_pending(rows):
    for row in rows:
        ig_pending = row.get("publicar_instagram","").lower() == "sim" and row.get("status_instagram","") == "pendente"
        li_pending = row.get("publicar_linkedin","").lower() == "sim" and row.get("status_linkedin","") == "pendente"
        if ig_pending or li_pending:
            return row
    return None

def publish_row(row, config):
    ok_any = False
    image_url = row.get("url_publica_imagem","").strip()

    if row.get("publicar_instagram","").lower() == "sim" and row.get("status_instagram","") == "pendente":
        log(f"Publicando Instagram: {row.get('tema')}")
        ok = publish_instagram(config, image_url, row.get("legenda_instagram",""))
        if ok:
            row["status_instagram"] = "publicado"
            ok_any = True

    time.sleep(config.get("posting",{}).get("wait_seconds_between_posts",5))

    if row.get("publicar_linkedin","").lower() == "sim" and row.get("status_linkedin","") == "pendente":
        log(f"Publicando LinkedIn: {row.get('tema')}")
        ok = publish_linkedin(config, image_url, row.get("legenda_linkedin",""))
        if ok:
            row["status_linkedin"] = "publicado"
            ok_any = True

    if ok_any:
        row["data_publicacao"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return ok_any

def show_menu():
    print()
    print("PD SOLUÇÕES DIGITAIS - PUBLICADOR AUTOMÁTICO")
    print("1 - Publicar próximo da fila")
    print("2 - Publicar todos pendentes")
    print("3 - Listar fila")
    print("4 - Sair")
    return input("Escolha: ").strip()

def list_queue(rows):
    print()
    for row in rows:
        print(f"{row['id']} - {row['tema']} | IG: {row['status_instagram']} | LinkedIn: {row['status_linkedin']} | URL imagem: {'OK' if row.get('url_publica_imagem') else 'vazia'}")

def main():
    config = load_config()

    while True:
        rows = read_queue()
        choice = show_menu()

        if choice == "1":
            row = next_pending(rows)
            if not row:
                log("Nenhuma publicação pendente.")
                continue
            publish_row(row, config)
            save_queue(rows)

        elif choice == "2":
            published = 0
            for row in rows:
                ig_pending = row.get("publicar_instagram","").lower() == "sim" and row.get("status_instagram","") == "pendente"
                li_pending = row.get("publicar_linkedin","").lower() == "sim" and row.get("status_linkedin","") == "pendente"
                if ig_pending or li_pending:
                    if publish_row(row, config):
                        published += 1
                    save_queue(rows)
                    time.sleep(config.get("posting",{}).get("wait_seconds_between_posts",5))
            log(f"Processo finalizado. Itens com publicação confirmada: {published}")

        elif choice == "3":
            list_queue(rows)

        elif choice == "4":
            break

        else:
            print("Opção inválida.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        log(f"ERRO GERAL: {exc}")
        input("Pressione ENTER para sair...")


# Suporte simples para execução por GitHub Actions
# Use: python pd_publicador_automatico.py --next
# Use: python pd_publicador_automatico.py --all
