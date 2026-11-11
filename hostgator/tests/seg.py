import json, re, sys, time, hmac, hashlib, struct, base64, requests, sqlite3
B="http://127.0.0.1:8099"; S=__import__('os').environ.get('PD_TESTE_DIR','/tmp/pd-teste')
ok=bad=0
def check(n,c,d=""):
    global ok,bad
    if c: ok+=1
    else: bad+=1
    print(("PASS " if c else "FAIL ")+n+("" if c else " -- "+str(d)))
H={"Origin":B,"Content-Type":"application/json"}
def post(path,body,h=H,s=requests): return s.post(B+path,data=json.dumps(body) if not isinstance(body,str) else body,headers=h)
sol={"nome":"Joao Teste","whatsapp":"31988887777","equipamento":"notebook","tipo":"servico","servico":"formatacao","modalidade":"presencial","descricao":"Notebook lento","cep":"32000000"}
r=post("/api/solicitacoes",sol); check("solicitação válida 201",r.status_code in(200,201),r.text)
check("protocolo PD-SV", "PD-SV" in r.text, r.text)
r=post("/api/solicitacoes",sol,{"Origin":"https://evil.example","Content-Type":"application/json"}); check("origem estranha 403",r.status_code==403,r.status_code)
r=post("/api/solicitacoes",sol,{"Content-Type":"application/json"}); check("sem Origin/Referer 403",r.status_code==403,r.status_code)
r=post("/api/solicitacoes",{**sol,"site_url":"http://spam"}); check("honeypot rejeita robô",r.status_code in(400,422),r.status_code)
r=post("/api/solicitacoes",{**sol,"nome":""}); check("nome vazio 422",r.status_code==422,r.status_code)
r=post("/api/solicitacoes",{**sol,"whatsapp":"abc"}); check("whatsapp inválido 422",r.status_code==422,r.status_code)
r=post("/api/solicitacoes",{**sol,"descricao":"x"*20000}); check("descrição enorme rejeitada",r.status_code in(413,422),r.status_code)
r=post("/api/solicitacoes","{nao json"); check("JSON inválido 4xx",400<=r.status_code<500,r.status_code)
r=requests.get(B+"/api/solicitacoes"); check("GET em endpoint POST 405",r.status_code==405,r.status_code)
r=post("/api/contatos",{"assunto":"x","nome":"a","whatsapp":"31988887777","resumo":"r"}); check("assunto inválido 422",r.status_code==422,r.status_code)
payload={"assunto":"parceria","nome":"Robert'); DROP TABLE pd_contatos;--","whatsapp":"31988887777","linhas":["PROPOSTA","Empresa: <script>alert(1)</script>"]}
r=post("/api/contatos",payload); check("SQLi/XSS tratados como texto",r.status_code in(200,201),r.text)
# rate limit
codes=[post("/api/contatos",{"assunto":"parceria","nome":"Flood","whatsapp":"31988887777","linhas":["PROPOSTA DE TESTE","Empresa: Flood Ltda"]}).status_code for _ in range(8)]
check("rate limit dispara 429",429 in codes,codes)
# admin sem sessão
for m,p in [("get","/api/admin/solicitacoes"),("get","/api/admin/produtos")]:
    check(f"{p} sem login 401",getattr(requests,m)(B+p).status_code==401)
check("POST produtos sem login 401",post("/api/admin/produtos",{"nome":"x","categoria":"y"}).status_code==401)
check("foto sem login 401",requests.post(B+"/api/admin/foto",headers={"Origin":B}).status_code==401)
# brute force lockout
s=requests.Session()
cs=[post("/api/admin/login",{"usuario":"dono","senha":"errada-errada-%d"%i},s=s).status_code for i in range(8)]
check("login bloqueia após tentativas",any(c in(423,429) for c in cs),cs)
# banco
db=sqlite3.connect(S+"/teste.db"); 
check("tabela contatos preservada",db.execute("select count(*) from pd_contatos").fetchone()[0]>=1)
nome=db.execute("select nome from pd_contatos where nome like 'Robert%'").fetchone()
check("texto malicioso guardado literal",nome and "DROP TABLE" in nome[0])
try:
    h=db.execute("select senha_hash from pd_admin").fetchone()[0]; check("senha guardada com hash",h.startswith("$2y$") or h.startswith("$argon"),h[:8])
except Exception as e: check("senha hash",False,e)
# uploads: execução de php bloqueada (roteador imita .htaccess), arquivos .htaccess presentes
import os
base=S+"/dist/pd-hostgator/public_html"
check("uploads/.htaccess bloqueia php",open(base+"/uploads/.htaccess").read().count("php")>=1)
check("config fora de public_html",not os.path.exists(base+"/pd-privado") and os.path.exists(S+"/dist/pd-hostgator/pd-privado/config.php"))
check("acesso direto a api/inc negado",requests.get(B+"/api/inc/boot.php").status_code==403)
for ep in ["metricas","auditoria","logs","push","exportar","notas"]:
    r=requests.get(B+"/api/admin/"+ep); check("admin/"+ep+" exige login",r.status_code==401,r.status_code)
r=requests.post(B+"/api/admin/push",data="{}",headers=H); check("admin/push POST sem login 401",r.status_code in(401,403),r.status_code)
UA={"User-Agent":"Mozilla/5.0 (iPhone) Safari"}
r=requests.post(B+"/api/metricas",data=json.dumps({"c":"/","r":""}),headers={"Content-Type":"application/json","Origin":"https://evil.example",**UA}); check("beacon de outro site não grava",r.status_code==204 and True)
import sqlite3 as _q
_n=lambda: _q.connect(S+"/teste.db").execute("select count(*) from pd_acessos").fetchone()[0]
a=_n(); requests.post(B+"/api/metricas",data=json.dumps({"c":"/","r":""}),headers={"Content-Type":"application/json","Origin":"https://evil.example",**UA}); check("beacon com Origin falso não conta",_n()==a)
requests.post(B+"/api/metricas",data=json.dumps({"c":"/../../etc/passwd","r":""}),headers={**H,**UA}); check("beacon com caminho malicioso não conta",_n()==a)
requests.post(B+"/api/metricas",data=json.dumps({"c":"/","r":""}),headers={**H,**UA}); check("beacon válido conta",_n()==a+1)
# ---- cobertura (área de atendimento)
r=requests.get(B+"/api/cobertura?cep=32010000",headers={"Origin":"https://evil.example"}); check("cobertura recusa outro site",r.status_code==403,r.status_code)
r=requests.get(B+"/api/cobertura?cep=abc",headers=H); check("cobertura valida CEP",r.status_code==422,r.status_code)
r=requests.get(B+"/api/admin/cobertura"); check("admin/cobertura exige login",r.status_code==401,r.status_code)
print(ok,"ok",bad,"falhas"); sys.exit(1 if bad else 0)
