#!/usr/bin/env python3
"""Gera as páginas de solicitação dos destaques (screens/16..19). Rode na raiz do projeto."""
import html, pathlib, urllib.parse
BASE = "https://diegobocsolucoes.github.io/Site-PD-Solucoes/"
FONE = "5531995483280"
e = html.escape
SEG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
ZAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.2-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>'

def campo(id_, rot, tipo="text", ph="", cheio=False, extra=""):
    return f'<div class="sv-campo{" cheio" if cheio else ""}"><label for="{id_}" id="{id_}Rot">{rot}</label><input id="{id_}" type="{tipo}" placeholder="{e(ph)}" {extra}></div>'
def select(id_, rot, opcoes, cheio=False):
    o = "".join(f"<option>{e(x)}</option>" for x in opcoes)
    return f'<div class="sv-campo{" cheio" if cheio else ""}"><label for="{id_}">{rot}</label><select id="{id_}">{o}</select></div>'
def texto(id_, rot, ph=""):
    return f'<div class="sv-campo cheio"><label for="{id_}">{rot}</label><textarea id="{id_}" placeholder="{e(ph)}"></textarea></div>'
def radios(nome, rot, itens, rid=""):
    r = "".join(f'<label><input type="radio" name="{nome}" value="{v}"{" checked" if i == 0 else ""}> {e(t)}</label>' for i, (v, t) in enumerate(itens))
    return f'<div class="sv-campo cheio"><span class="rot" id="{rid or nome}Rot">{rot}</span><div class="sv-opcoes" role="radiogroup" aria-labelledby="{rid or nome}Rot">{r}</div></div>'
def checks(nome, rot, itens):
    r = "".join(f'<label><input type="checkbox" name="{nome}" value="{e(t)}"> {e(t)}</label>' for t in itens)
    return f'<div class="sv-campo cheio"><span class="rot">{rot}</span><div class="sv-opcoes">{r}</div></div>'
def grupo(t, *c): return f'<div class="sv-grupo"><h3>{e(t)}</h3><div class="sv-grade">{"".join(c)}</div></div>'

RETORNO = radios("retorno", "Como prefere receber o retorno? *", [("whatsapp", "WhatsApp"), ("email", "E-mail")], "retorno") \
  + campo("campoZap", "WhatsApp *", "tel", "(31) 9xxxx-xxxx", extra='inputmode="tel" autocomplete="tel"') \
  + campo("campoMail", "E-mail", "email", "contato@suaempresa.com.br", extra='autocomplete="email"')
ATENDE = radios("modalidade", "Como prefere ser atendido? *", [("presencial", "No meu endereço"), ("entrega", "Entrega agendada do equipamento")], "modalidade") \
  + '<div class="sv-campo cheio" id="boxCep"><label for="campoCep">CEP do atendimento *</label><input id="campoCep" type="text" inputmode="numeric" maxlength="9" placeholder="00000-000" autocomplete="postal-code"><p class="sv-aviso" id="avisoCep" role="status" hidden></p></div>'

PAGS = [
 dict(slug="16-solicitar-dashboard", arte="dashboard", nome="Dashboard sob medida", titulo="Dashboard sob medida para a sua empresa",
  lead="Seus dados, sistemas e APIs reunidos em um único painel. Conte o que você precisa acompanhar e receba uma proposta com valor e prazo.",
  preco="A partir de R$ 2.500", h2="Solicitar orçamento do dashboard", sub="Para empresas. A PD analisa o pedido e retorna com a proposta, sem compromisso.",
  botao="Enviar pedido de orçamento",
  corpo=grupo("Sobre a empresa", campo("campoEmpresa","Empresa *",ph="Nome da empresa",cheio=True), campo("campoResp","Responsável *",ph="Seu nome"), campo("campoRamo","Ramo de atividade",ph="Ex.: varejo, serviços, indústria"), campo("campoLocal","Cidade / bairro *",ph="Onde fica a empresa",cheio=True))
     + grupo("Como a PD retorna", RETORNO)
     + grupo("O que você precisa", checks("fonte","De onde vêm os dados?",["Planilhas","Sistema de gestão / ERP","API ou integração","Banco de dados","Vendas online","Ainda não sei"]),
        texto("campoDesc","O que você quer acompanhar? *","Ex.: vendas por vendedor, estoque, contas a receber, atendimentos…"), select("campoPrazo","Prazo desejado",["A combinar","Urgente","Até 30 dias","Sem pressa"]))),
 dict(slug="17-solicitar-formatacao", arte="formatacao", nome="Formatação", titulo="Formatação de computador e notebook",
  lead="Deixe o seu equipamento como novo, com atendimento no seu endereço ou entrega agendada. Preencha e a PD confirma pelo WhatsApp.",
  preco="", h2="Solicitar atendimento de formatação", sub="Sem login e sem CPF. A PD confirma valor, disponibilidade e agendamento pelo WhatsApp.",
  botao="Enviar solicitação",
  corpo=grupo("Seus dados", campo("campoNome","Nome *",ph="Seu nome completo",cheio=True), campo("campoZap","WhatsApp *","tel","(31) 9xxxx-xxxx",cheio=True,extra='inputmode="tel" autocomplete="tel"'))
     + grupo("Equipamento", radios("equip","Qual é o equipamento? *",[("desktop","Desktop"),("notebook","Notebook")]), select("campoSistema","Sistema que você quer",["Windows 11","Windows 10","Outro / não sei"]),
        checks("backup","Seus arquivos",["Preciso salvar meus arquivos antes"]))
     + grupo("Atendimento", ATENDE, texto("campoDesc","Quer contar mais alguma coisa?","Ex.: está lento, deu tela azul, quero reinstalar do zero…"))),
 dict(slug="18-solicitar-windows", arte="windows", nome="Ativação de Windows", titulo="Ativação de Windows",
  lead="Ativação do Windows com licença original, de forma rápida e segura. Peça o orçamento e a PD confirma o valor antes de começar.",
  preco="", h2="Solicitar orçamento de ativação", sub="Sem login e sem CPF. A PD confirma o valor e como será feito pelo WhatsApp.",
  botao="Enviar pedido de orçamento",
  corpo=grupo("Seus dados", campo("campoNome","Nome *",ph="Seu nome completo",cheio=True), campo("campoZap","WhatsApp *","tel","(31) 9xxxx-xxxx",cheio=True,extra='inputmode="tel" autocomplete="tel"'))
     + grupo("Equipamento", radios("equip","Qual é o equipamento? *",[("desktop","Desktop"),("notebook","Notebook")]), select("campoVersao","Versão do Windows",["Windows 11","Windows 10","Não sei"]))
     + grupo("Atendimento", ATENDE, texto("campoDesc","Quer contar mais alguma coisa?","Ex.: aparece a marca d'água, o Windows pede ativação…"))),
 dict(slug="19-solicitar-site", arte="site", nome="Criação de sites", titulo="Criação de sites",
  lead="Um site profissional para a sua empresa, rápido no celular e preparado para o Google. Conte o que precisa e receba uma proposta.",
  preco="Sob orçamento", h2="Solicitar orçamento do site", sub="Para empresas. A PD analisa o pedido e retorna com a proposta, sem compromisso.",
  botao="Enviar pedido de orçamento",
  corpo=grupo("Sobre a empresa", campo("campoEmpresa","Empresa *",ph="Nome da empresa",cheio=True), campo("campoResp","Responsável *",ph="Seu nome"), campo("campoRamo","Ramo de atividade",ph="Ex.: clínica, loja, escritório"), campo("campoLocal","Cidade / bairro *",ph="Onde fica a empresa",cheio=True))
     + grupo("Como a PD retorna", RETORNO)
     + grupo("O site", select("campoTipo","Tipo de site",["Institucional (apresenta a empresa)","Loja virtual","Página de captação (landing page)","Portfólio","Ainda não sei"]),
        radios("temsite","A empresa já tem site?",[("nao","Ainda não"),("sim","Já tem, quero refazer")]), campo("campoUrl","Endereço do site atual (se tiver)",ph="www.suaempresa.com.br"),
        select("campoPrazo","Prazo desejado",["A combinar","Urgente","Até 30 dias","Sem pressa"]),
        texto("campoDesc","Conte o que o site precisa ter *","Ex.: serviços, fotos, formulário de contato, botão de WhatsApp…"))),
]
def pagina(s):
    zap = f"https://wa.me/{FONE}?text=" + urllib.parse.quote(f"Olá! Vim pelo site da PD e quero saber mais sobre: {s['nome']}.")
    url = f"{BASE}screens/{s['slug']}/"
    preco = f'<p class="sv-preco-faixa">{e(s["preco"])}</p>' if s["preco"] else ""
    return f'''<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(s["h2"])} | PD Soluções Digitais</title><meta name="description" content="{e(s["lead"])}"><meta name="robots" content="index,follow"><meta name="theme-color" content="#040705"><link rel="canonical" href="{url}"><meta property="og:title" content="{e(s["h2"])} | PD Soluções Digitais"><meta property="og:description" content="{e(s["lead"])}"><meta property="og:type" content="website"><meta property="og:url" content="{url}"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="PD Soluções Digitais"><meta property="og:image" content="{BASE}assets/og-image.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/png" sizes="32x32" href="../../assets/favicon-32.png"><link rel="apple-touch-icon" href="../../assets/apple-touch-icon.png"><link rel="preload" href="../../assets/fonts/space-grotesk-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin><link id="pd-typography" rel="stylesheet" href="../../typography-refinements.css"><link rel="stylesheet" href="../../home-a.css"><link rel="stylesheet" href="../../servico.css"></head><body><div class="site-shell"><div class="glow-a" aria-hidden="true"></div>
<header class="topbar"><div class="wrap"><a class="brand" href="../../index.html" aria-label="PD Soluções Digitais, página inicial"><img src="../../assets/logo-pd-oficial.webp" alt="PD Soluções Digitais" width="150" height="59"></a>
<nav class="nav" aria-label="Navegação principal"><a href="../../index.html">Início</a><a href="../../index.html#destaques">Destaques</a><a href="../../index.html#contato">Contato</a></nav>
<a class="whatsapp-top" href="{zap}" target="_blank" rel="noopener noreferrer" aria-label="Falar com a PD pelo WhatsApp">{ZAP}WhatsApp PD</a></div></header>
<main>
<section class="sv-hero sv-compacto"><div class="wrap"><div class="sv-copy"><a class="sv-voltar" href="../../index.html#destaques">← Voltar aos destaques</a><span class="eyebrow">Solicitação</span><h1>{e(s["titulo"])}</h1><p class="lead">{e(s["lead"])}</p>{preco}</div>
<img class="sv-arte" src="../../assets/destaque-{s["arte"]}.svg" alt="" width="600" height="420"></div></section>
<section class="sv-form"><div class="wrap"><h2>{e(s["h2"])}</h2><p class="sv-sub">{e(s["sub"])}</p>
<form id="formSolicitar" novalidate>{s["corpo"]}
<div class="sv-enviar"><button class="btn btn-primary" id="reviewBtn" type="button">{e(s["botao"])} {SEG}</button><small>Enviar o pedido não gera compromisso nem confirma agendamento.</small></div></form></div></section>
</main>
<footer class="footer"><div class="wrap sv-rodape"><span>© PD Soluções Digitais · Contagem – MG</span><a href="../../index.html">Voltar ao início</a></div></footer></div><script src="../../site-live.js" defer></script></body></html>
'''
raiz = pathlib.Path(__file__).resolve().parent.parent
for s in PAGS:
    d = raiz / "screens" / s["slug"]; d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(pagina(s), encoding="utf-8"); print("ok", s["slug"])
