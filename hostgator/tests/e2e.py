import re, sys, time, hmac, hashlib, struct, base64, json, urllib.request, urllib.parse, io
from playwright.sync_api import sync_playwright
BASE="http://127.0.0.1:8099"; S=__import__('os').environ.get('PD_TESTE_DIR','/tmp/pd-teste')
TOKEN=re.search(r"'instalacao_token' => '([^']+)'",open(S+"/dist/pd-hostgator/pd-privado/config.php").read()).group(1)
def totp(secret):
    k=base64.b32decode(secret+"="*(-len(secret)%8)); c=int(time.time())//30
    h=hmac.new(k,struct.pack(">Q",c),hashlib.sha1).digest(); o=h[-1]&15
    return "%06d"%((struct.unpack(">I",h[o:o+4])[0]&0x7fffffff)%10**6)
ok=[]; bad=[]
def check(n,c,d=""):
    (ok if c else bad).append(n); print(("PASS " if c else "FAIL ")+n+(" -- "+str(d) if (d and not c) else ""))
from PIL import Image
im=Image.new("RGB",(1600,1200),(40,120,200)); im.save(S+"/foto.png")
USER="dono"; SENHA="Senha-Forte-123456"
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={"width":1280,"height":900}); pg=ctx.new_page()
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m: errs.append(m.text) if m.type=="error" else None)
    # instalador
    pg.goto(BASE+"/instalar.php"); 
    check("instalador: checagens ok", "✘" not in pg.content(), pg.inner_text("body")[:300])
    pg.fill("#token",TOKEN); pg.fill("#usuario",USER); pg.fill("#senha",SENHA); pg.fill("#senha2",SENHA); pg.click("button")
    corpo=pg.inner_text("body"); m=re.search(r"\n([A-Z2-7]{16,})\n",corpo)
    check("instalador conclui e mostra chave", bool(m), corpo[:400])
    segredo=m.group(1)
    pg.goto(BASE+"/instalar.php"); check("instalador trava após uso","já concluída" in pg.inner_text("body"))
    # login errado
    pg.goto(BASE+"/painel/"); pg.fill("input[name=usuario]",USER); pg.fill("input[name=senha]","errada-errada-1"); pg.click("form button")
    pg.wait_for_selector(".pd-admin-error:not([hidden])"); check("login errado rejeitado", True)
    pg.fill("input[name=senha]",SENHA); pg.click("form button"); pg.wait_for_selector("input[autocomplete=one-time-code]")
    pg.fill("input[autocomplete=one-time-code]","000000"); pg.click("form button"); pg.wait_for_selector(".pd-admin-error:not([hidden])")
    check("TOTP errado rejeitado", True)
    pg.fill("input[autocomplete=one-time-code]",totp(segredo)); pg.click("form button"); pg.wait_for_selector(".pd-admin-tabs")
    check("login completo com TOTP", pg.locator(".pd-admin-tabs button").count()==3)
    # produto
    pg.click("[data-aba=produtos]"); pg.click("text=NOVO PRODUTO")
    pg.fill("form input[required]:nth-of-type(1)","") if False else None
    labels=pg.locator("form label")
    pg.get_by_label("NOME *").fill("Cabo HDMI 2m"); pg.get_by_label("CATEGORIA *").fill("Cabos")
    pg.get_by_label("DESCRIÇÃO CURTA").fill("Cabo HDMI 4K 2 metros"); pg.get_by_label("PREÇO (R$)").fill("29,90")
    pg.get_by_label("ESTOQUE (INTERNO)").fill("7")
    pg.set_input_files("input[type=file]",S+"/foto.png")
    check("prévia mostra preço", "R$" in pg.inner_text(".pd-prod-previa") and "29,90" in pg.inner_text(".pd-prod-previa"), pg.inner_text(".pd-prod-previa"))
    pg.click("text=SALVAR"); pg.wait_for_selector(".pd-admin-ok")
    check("produto salvo", "produto salvo" in pg.inner_text(".pd-admin-ok").lower(), pg.inner_text(".pd-admin-ok"))
    check("foto enviada", pg.locator(".pd-prod-foto img").count()==1, pg.inner_text("body")[:500])
    # segundo produto sem preço, indisponível
    pg.click("text=NOVO PRODUTO"); pg.get_by_label("NOME *").fill("Mouse <b>X</b>"); pg.get_by_label("CATEGORIA *").fill("Periféricos")
    pg.get_by_label("STATUS").select_option("poucas_unidades"); pg.click("text=SALVAR"); pg.wait_for_selector(".pd-admin-ok")
    # API pública
    j=json.load(urllib.request.urlopen(BASE+"/api/produtos"))
    check("API pública lista 2 produtos", len(j["produtos"])==2, j)
    check("API pública não vaza estoque/obs", all(set(x)=={"id","nome","categoria","descricao","preco_centavos","status","destaque","foto_url"} for x in j["produtos"]), j)
    foto=j["produtos"][0]["foto_url"] or j["produtos"][1]["foto_url"]
    r=urllib.request.urlopen(BASE+foto); check("foto servida como webp/png", r.status==200 and r.read(4) in (b"RIFF",b"\x89PNG"))
    # Loja pública
    pub=ctx.new_page(); pub.on("pageerror",lambda e:errs.append(str(e)))
    pub.goto(BASE+"/screens/08-loja-rapida-v2/"); pub.wait_for_selector(".product")
    check("Loja mostra 2 cartões", pub.locator(".product").count()==2)
    check("Loja mostra preço real", "R$" in pub.inner_text("#products") and "A CONFIRMAR" in pub.inner_text("#products"), pub.inner_text("#products"))
    check("Loja escapa HTML do nome", pub.locator("#products b").count()==0)
    check("Loja tem filtros", pub.locator("#filters .filter").count()==3)
    check("Loja preenche seletor", pub.locator("#productSelect option").count()==4)
    pub.locator(".reserve").first.click()
    # formulário da loja
    pub.fill('input[placeholder="SEU NOME"]',"Maria Cliente"); pub.fill('input[placeholder="(31) 9XXXX-XXXX"]',"(31) 98888-7777")
    pub.locator("#productSelect").select_option(index=1); 
    with pub.expect_response(lambda r:"/api/contatos" in r.url) as ri: pub.click("#reviewBtn")
    resp=ri.value; check("POST /api/contatos 201", resp.status in (200,201), resp.status)
    pub.wait_for_timeout(400); check("cliente vê protocolo PD-CT", "PD-CT" in pub.inner_text("body"))
    # atendimento (solicitação)
    s=ctx.new_page(); s.on("pageerror",lambda e:errs.append(str(e)))
    s.goto(BASE+"/screens/02-atendimento-v5/"); 
    check("02 abre sem erro JS", True)
    # painel: contatos e solicitações
    pg.click("[data-aba=solicitacoes]"); pg.wait_for_timeout(500)
    check("painel sem texto 'null' solto", "null" not in pg.inner_text("#app").lower(), pg.inner_text("#app")[:200])
    pg.click("[data-aba=contatos]"); pg.wait_for_selector(".pd-admin-row")
    check("painel lista contato", pg.locator(".pd-admin-row").count()>=1 and "PD-CT" in pg.inner_text(".pd-admin-row"))
    check("detalhe com WhatsApp", pg.locator("a[href^='https://wa.me/55']").count()==1)
    pg.locator(".pd-admin-detail select").select_option("contatado"); pg.wait_for_timeout(500)
    check("status atualizado", "CONTATADO" in pg.inner_text(".pd-admin-row"))
    mail=open(S+"/mail.txt").read(); check("e-mail de aviso gravado", "dono@exemplo.com" in mail and "Maria Cliente" in mail, mail[:300])
    # ocultar / excluir
    pg.click("[data-aba=produtos]"); pg.wait_for_selector(".pd-prod-row")
    pg.locator("text=OCULTAR").first.click(); pg.wait_for_selector(".pd-admin-ok")
    j=json.load(urllib.request.urlopen(BASE+"/api/produtos")); check("produto oculto some da loja", len(j["produtos"])==1)
    pg.once("dialog",lambda d:d.accept()); pg.locator("text=EXCLUIR").first.click(); pg.wait_for_selector(".pd-admin-ok")
    check("excluir funciona", pg.locator(".pd-prod-row:not(.pd-admin-head)").count()==1)
    # sessão persiste no reload; logout
    pg.reload(); pg.wait_for_selector(".pd-admin-tabs"); check("sessão persiste", True)
    pg.click("text=SAIR"); pg.wait_for_selector("input[name=senha]"); check("logout", True)
    errs=[e for e in errs if "401" not in e]; check("sem erros JS", not errs, errs)
    b.close()
print(len(ok),"ok",len(bad),"falhas"); sys.exit(1 if bad else 0)
