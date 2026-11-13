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
    check("login completo com TOTP", pg.locator(".pd-admin-tabs button").count()==9)
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
    pub.fill('input[placeholder="Seu nome"]',"Maria Cliente"); pub.fill('input[placeholder="(31) 9xxxx-xxxx"]',"(31) 98888-7777")
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
    check("detalhe fechado até clicar", pg.locator(".pd-admin-detail a[href^='https://wa.me']").count()==0)
    pg.locator(".pd-admin-row").first.click()
    check("painel lista contato", pg.locator(".pd-admin-row").count()>=1 and "PD-CT" in pg.inner_text(".pd-admin-row"))
    check("detalhe com WhatsApp", pg.locator("a[href^='https://wa.me/55']").count()==1)
    pg.locator(".pd-admin-detail select").nth(1).select_option("contatado"); pg.wait_for_timeout(500)
    check("status atualizado", "CONTATADO" in pg.inner_text(".pd-admin-row"))
    pg.once("dialog",lambda d:d.accept()); pg.click("text=ENCERRAR CHAMADO"); pg.wait_for_selector("text=REABRIR CHAMADO")
    check("encerrar chamado", "CONCLUÍDO" in pg.inner_text(".pd-admin-row"))
    pg.click("text=REABRIR CHAMADO"); pg.wait_for_selector("text=ENCERRAR CHAMADO")
    check("reabrir chamado", "EM ANDAMENTO" in pg.inner_text(".pd-admin-row"))
    mail=open(S+"/mail.txt").read(); check("e-mail de aviso gravado", "dono@exemplo.com" in mail and "Maria Cliente" in mail, mail[:300])
    # ocultar / excluir
    pg.click("[data-aba=produtos]"); pg.wait_for_selector(".pd-prod-row")
    pg.locator("text=OCULTAR").first.click(); pg.wait_for_selector(".pd-admin-ok")
    j=json.load(urllib.request.urlopen(BASE+"/api/produtos")); check("produto oculto some da loja", len(j["produtos"])==1)
    pg.once("dialog",lambda d:d.accept()); pg.locator("text=EXCLUIR").first.click(); pg.wait_for_selector(".pd-admin-ok")
    pg.wait_for_timeout(500); check("excluir funciona", pg.locator(".pd-prod-row:not(.pd-admin-head)").count()==1)
    # ---- módulos de empresas: plano, consultoria de TI, segurança eletrônica
    pl=ctx.new_page(); pl.goto(BASE+"/screens/04-planos-chamados-v2/"); pl.wait_for_selector(".plan .go")
    pl.locator(".plan .go").nth(1).click(); pl.wait_for_timeout(700)
    check("04: botão do plano rola ao formulário (sem navegar)", "04-planos" in pl.url and pl.eval_on_selector("#prPlano","e=>e.value")=="20", pl.url)
    pl.fill("#prEmpresa","Padaria Teste"); pl.fill("#prResp","Ana Dona"); pl.fill("#prZap","(31) 98888-7777"); pl.click("#planoBtn")
    pl.wait_for_selector("dialog[open]"); check("04: pedido de plano recebido", "PD-CT" in pl.inner_text("dialog"), pl.inner_text("body")[-300:])
    c5=ctx.new_page(); c5.goto(BASE+"/screens/05-consultoria-ti-v2/"); c5.wait_for_selector("#consultoriaForm")
    c5.fill('input[placeholder="Nome da empresa"]',"Escritório Alfa"); c5.fill('input[placeholder="Seu nome"]',"Bruno Sócio"); c5.fill('input[placeholder="(31) 9xxxx-xxxx"]',"(31) 97777-6666")
    c5.fill('input[placeholder="EX.: 6"]',"8"); c5.fill('input[placeholder="Informe a localização da empresa"]',"Contagem Centro"); c5.click("button.submit")
    c5.wait_for_selector("dialog[open]"); check("05: consultoria de TI recebida", "PD-CT" in c5.inner_text("dialog"), c5.inner_text("body")[-300:])
    c6=ctx.new_page(); c6.goto(BASE+"/screens/06-seguranca-eletronica-v2/"); c6.wait_for_selector("#securityForm")
    c6.fill('input[placeholder="Nome da empresa"]',"Loja Beta"); c6.fill('input[placeholder="Seu nome"]',"Carla Gerente"); c6.fill('input[placeholder="(31) 9xxxx-xxxx"]',"(31) 96666-5555")
    c6.fill('input[placeholder="Informe a localização da empresa"]',"Contagem Eldorado"); c6.click("button.submit")
    c6.wait_for_selector("dialog[open]"); check("06: segurança eletrônica recebida", "PD-CT" in c6.inner_text("dialog"), c6.inner_text("body")[-300:])
    pg.click("[data-aba=contatos]"); pg.wait_for_timeout(700)
    lista=pg.inner_text("#app")
    check("painel lista os 3 pedidos de empresas", all(x in lista for x in ["Ana Dona","Bruno Sócio","Carla Gerente"]), lista[:400])
    check("categoria automática visível", "Comercial" in lista and "Empresas" in lista and "Loja Rápida" in lista, lista[:500])
    pg.get_by_role("button", name="Empresas (").click(); pg.wait_for_timeout(300)
    check("filtro por categoria", "Bruno Sócio" in pg.inner_text("#app") and "Ana Dona" not in pg.inner_text(".pd-admin-row", ) )
    pg.get_by_role("button", name="Todas (").click(); pg.locator(".pd-admin-row", has_text="Ana Dona").first.click()
    pg.locator(".pd-admin-detail select").nth(0).select_option("chamados"); pg.wait_for_timeout(500)
    pg.get_by_role("button", name="Chamados (").click(); pg.wait_for_timeout(300)
    check("categoria alterada manualmente", "Ana Dona" in pg.inner_text("#app"))
    pg.get_by_role("button", name="Todas (").click()
    pg.wait_for_timeout(200)
    check("painel mostra plano no detalhe", "Plano: 20 chamados" in pg.inner_text(".pd-admin-detail"), pg.inner_text(".pd-admin-detail")[:200])
    # ---- painel v2: métricas, auditoria, logs, notas, CSV, push
    def beacon(caminho, ua="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1", ref="https://www.google.com/"):
        rq=urllib.request.Request(BASE+"/api/metricas",data=json.dumps({"c":caminho,"r":ref}).encode(),method="POST",
            headers={"Content-Type":"application/json","Origin":BASE,"User-Agent":ua})
        return urllib.request.urlopen(rq).status
    check("beacon aceito (204)", beacon("/screens/02-atendimento-v5/")==204)
    beacon("/"); beacon("/screens/02-atendimento-v5/"); beacon("/inventado/x"); beacon("/", ua="Googlebot/2.1")
    pg.click("[data-aba=resumo]"); pg.wait_for_selector(".pd-kpis"); pg.wait_for_timeout(300)
    txt=pg.inner_text("#app")
    check("resumo mostra páginas e origem", "Atendimento" in txt and "google.com" in txt and "Celular" in txt, txt[:400])
    check("resumo ignora robô e caminho inválido", "inventado" not in txt)
    check("resumo tem gráfico", pg.locator("svg.pd-grafico rect").count()>=7)
    pg.click("[data-aba=auditoria]"); pg.wait_for_selector(".pd-linha-log")
    t=pg.inner_text("#app"); check("auditoria registra login e status", "Entrou no painel" in t and "Mudou status" in t, t[:300])
    check("auditoria tem botão de baixar", pg.locator("a[href*='fonte=auditoria']").count()==1)
    pg.once("dialog",lambda d:d.accept()); pg.locator(".pd-mini").first.click(); pg.wait_for_timeout(600)
    check("auditoria alterna encerrar/reabrir", pg.locator(".pd-mini").count()>=1)
    csva=pg.evaluate("fetch('/api/admin/exportar?fonte=auditoria',{credentials:'same-origin'}).then(r=>r.text())")
    check("CSV da auditoria", csva.startswith("criado_em;usuario;acao") and "status" in csva, csva[:100])
    pg.click("[data-aba=logs]"); pg.wait_for_selector("text=/24 horas/")
    pg.click("[data-aba=avisos]"); pg.wait_for_selector("text=Aparelhos cadastrados")
    check("aba avisos mostra passos do iPhone", "Adicionar à Tela de Início" in pg.inner_text("#app"))
    pg.click("[data-aba=contatos]"); pg.wait_for_selector(".pd-admin-row"); pg.locator(".pd-admin-row", has_text="Maria").first.click(); pg.wait_for_selector(".pd-notas textarea")
    pg.fill(".pd-notas textarea","Liguei e combinei visita"); pg.click("text=SALVAR ANOTAÇÃO"); pg.wait_for_selector(".pd-nota")
    check("nota interna salva", "Liguei e combinei" in pg.inner_text(".pd-nota"))
    check("histórico de status aparece", pg.locator(".pd-hist").count()>=1)
    csv=pg.evaluate("fetch('/api/admin/exportar?fonte=contatos',{credentials:'same-origin'}).then(r=>r.text())")
    check("CSV exportado com BOM e protocolo", csv.startswith("protocolo;") and "PD-CT" in csv, csv[:120])
    chave=pg.evaluate("fetch('/api/admin/push',{credentials:'same-origin'}).then(r=>r.json())")
    check("chave VAPID pública (65 bytes)", len(base64.urlsafe_b64decode(chave["chave"]+"=="))==65)
    # inscrição push: endpoint inválido é recusado, válido (formato Apple) é aceito
    csrf=pg.evaluate("fetch('/api/admin/sessao',{credentials:'same-origin'}).then(r=>r.json()).then(d=>d.csrf)")
    def pushpost(c):
        return pg.evaluate("(a)=>fetch('/api/admin/push',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-PD-CSRF':a[0]},body:JSON.stringify(a[1])}).then(r=>r.status)",[csrf,c])
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives import serialization
    k=ec.generate_private_key(ec.SECP256R1()); pub=k.public_key().public_bytes(serialization.Encoding.X962,serialization.PublicFormat.UncompressedPoint)
    b64=lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()
    ruim={"acao":"inscrever","inscricao":{"endpoint":"https://evil.example.com/x"*3,"keys":{"p256dh":b64(pub),"auth":b64(b"a"*16)}}}
    check("push: endpoint de outro domínio recusado", pushpost(ruim)==422)
    boa={"acao":"inscrever","inscricao":{"endpoint":"https://web.push.apple.com/"+"Q"*60,"keys":{"p256dh":b64(pub),"auth":b64(b"a"*16)}},"agente":"iPhone • Safari"}
    check("push: inscrição Apple aceita", pushpost(boa)==201)
    pg.click("[data-aba=area]"); pg.wait_for_selector("text=Salvar área")
    pg.fill("input[placeholder='00000-000']","32000-000"); pg.fill(".pd-card form label:nth-of-type(2) input","5"); pg.fill(".pd-card form label:nth-of-type(3) input","10"); pg.fill(".pd-card form label:nth-of-type(4) input","3,25"); pg.click("text=Salvar área"); pg.wait_for_selector(".pd-admin-ok")
    check("área salva e localizada", "Contagem" in pg.inner_text("#app"), pg.inner_text("#app")[:300])
    cob=lambda c: requests_get("/api/cobertura?cep="+c)
    import urllib.request as _u
    def requests_get(path):
        rq=_u.Request(BASE+path,headers={"Origin":BASE}); return json.load(_u.urlopen(rq))
    check("CEP perto = dentro", cob("32010000")["status"]=="dentro")
    x=cob("30110000"); check("CEP além de 10 km = longe", x["status"]=="longe")
    check("CEP entre 5 e 10 km cobra taxa", cob("32050000")["status"]=="taxa" and cob("32050000")["taxa_centavos"]==325)
    check("CEP desconhecido = indefinido", cob("99999999")["status"]=="indefinido")
    check("resposta não vaza distância/coordenadas", set(cob("32010000").keys())=={"status","local"})
    # pedido presencial fora da área aparece marcado no painel
    pe=ctx.new_page(); pe.goto(BASE+"/screens/02-atendimento-v5/"); pe.wait_for_timeout(300)
    rq=_u.Request(BASE+"/api/solicitacoes",data=json.dumps({"nome":"Cliente Longe","whatsapp":"31977776666","equipamento":"notebook","tipo":"servico","servico":"formatacao","modalidade":"presencial","descricao":"Notebook muito lento","cep":"30110000","site_url":""}).encode(),method="POST",headers={"Content-Type":"application/json","Origin":BASE})
    try: _u.urlopen(rq)
    except Exception as e: print("pedido:",e)
    pg.click("[data-aba=solicitacoes]"); pg.wait_for_selector(".pd-admin-row"); pg.locator(".pd-admin-row", has_text="Cliente Longe").first.click()
    check("pedido além do limite marcado no painel", "REGIÃO NÃO ATENDIDA" in pg.inner_text(".pd-admin-detail"), pg.inner_text(".pd-admin-detail")[:200])
    pg.click("[data-aba=resumo]"); pg.wait_for_selector(".pd-kpis")
    pg.once("dialog",lambda d:d.accept()); pg.click("text=ZERAR CONTAGEM DE ACESSOS"); pg.wait_for_timeout(700)
    check("contagem de acessos zerada", "Ainda sem acessos" in pg.inner_text("#app"), pg.inner_text("#app")[:300])
    check("conversão não passa de 100%", "300" not in pg.inner_text(".pd-kpis"))
    pg.click("[data-aba=contatos]"); pg.wait_for_selector(".pd-admin-row"); antes=pg.locator(".pd-admin-row").count()
    pg.locator(".pd-admin-row", has_text="Carla").first.click(); pg.once("dialog",lambda d:d.accept()); pg.click("text=EXCLUIR PEDIDO"); pg.wait_for_timeout(700)
    check("pedido excluído", pg.locator(".pd-admin-row").count()==antes-1 and "Carla" not in pg.inner_text("#app"))
    # ---- destaques da home
    api_sl=json.load(urllib.request.urlopen(BASE+"/api/slides"))["slides"]
    check("API pública traz os 5 destaques", len(api_sl)==5 and api_sl[0]["titulo"].startswith("Dashboard") and api_sl[0]["preco"]=="A partir de R$ 2.500", api_sl[:1])
    check("destaque de Windows sem 'Server'", any(x["titulo"]=="Ativação de Windows" and "Server" not in x["texto"] for x in api_sl))
    ho=ctx.new_page(); ho.goto(BASE+"/"); ho.wait_for_selector(".dest-card"); ho.wait_for_timeout(600)
    check("home mostra o carrossel com 5 destaques", ho.locator(".dest-card").count()==5 and ho.locator(".dest-dots button").count()==5)
    ho.locator(".dest-card .dest-botao").first.click(); ho.wait_for_load_state(); check("botão do destaque leva ao orçamento empresarial", "07-orcamento-empresarial" in ho.url, ho.url)
    pg.click("[data-aba=slides]"); pg.wait_for_selector(".pd-slide-linha"); check("painel lista 5 destaques", pg.locator(".pd-slide-linha").count()==5)
    pg.locator(".pd-slide-linha").nth(3).locator("text=DESLIGAR").click(); pg.wait_for_timeout(600)
    api2=json.load(urllib.request.urlopen(BASE+"/api/slides"))["slides"]
    check("desligar destaque tira do site", len(api2)==4 and all(x["titulo"]!="Ativação de Windows" for x in api2))
    pg.locator(".pd-slide-linha").nth(3).locator("text=LIGAR").click(); pg.wait_for_timeout(600)
    pg.locator(".pd-slide-linha").first.locator("text=EDITAR").click(); pg.fill("input[maxlength='60']","A partir de R$ 2.800"); pg.click("form >> text=SALVAR"); pg.wait_for_timeout(700)
    check("editar preço aparece na API", json.load(urllib.request.urlopen(BASE+"/api/slides"))["slides"][0]["preco"]=="A partir de R$ 2.800")
    pg.locator(".pd-slide-linha").nth(1).locator("button[aria-label=Subir]").click(); pg.wait_for_timeout(900)
    check("subir destaque muda a ordem", json.load(urllib.request.urlopen(BASE+"/api/slides"))["slides"][0]["titulo"].startswith("Formatação"))
    rq=urllib.request.Request(BASE+"/api/admin/slides",data=b"{}",method="POST",headers={"Content-Type":"application/json","Origin":BASE})
    try: urllib.request.urlopen(rq); check("slides POST sem login recusado", False)
    except Exception as e: check("slides POST sem login recusado", "40" in str(e))
    # sessão persiste no reload; logout
    pg.reload(); pg.wait_for_selector(".pd-admin-tabs"); check("sessão persiste", True)
    pg.click("text=SAIR"); pg.wait_for_selector("input[name=senha]"); check("logout", True)
    errs=[e for e in errs if "401" not in e and "422" not in e]; check("sem erros JS", not errs, errs)
    b.close()
print(len(ok),"ok",len(bad),"falhas"); sys.exit(1 if bad else 0)
