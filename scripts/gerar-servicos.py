#!/usr/bin/env python3
"""Gera as páginas de detalhe dos destaques da home (screens/16..20). Rode na raiz do projeto."""
import html, pathlib, urllib.parse
BASE = "https://diegobocsolucoes.github.io/Site-PD-Solucoes/screens/"
FONE = "5531995483280"
SERV = [
 dict(slug="16-servico-dashboard", arte="dashboard", nome="Dashboard sob medida",
  titulo="Dashboard sob medida para a sua empresa",
  lead="Reunimos os dados dos seus sistemas, planilhas e APIs em um único painel, com os números que importam para você decidir mais rápido.",
  preco="A partir de R$ 2.500", precoNota="O valor final depende do que será conectado. Você recebe a proposta antes de qualquer compromisso.",
  inclui=["Conversa para entender quais indicadores você precisa acompanhar","Conexão com seus sistemas por API, banco de dados ou planilhas","Gráficos e totais que se atualizam sozinhos","Painel que funciona no computador e no celular","Acesso por login para você e para a sua equipe","Orientação de uso na entrega"],
  para="Empresas que hoje juntam relatórios à mão, abrem vários sistemas para achar um número ou querem enxergar vendas, estoque, atendimento e financeiro no mesmo lugar.",
  passos=[("Conversa","Você conta o que precisa acompanhar e de onde vêm os dados."),("Proposta","A PD apresenta o escopo, o prazo e o valor para você aprovar."),("Entrega","O painel é construído, testado com você e entregue com orientação.")],
  orc="../07-orcamento-empresarial-v2/index.html", cta="Pedir orçamento do dashboard"),
 dict(slug="17-servico-formatacao", arte="formatacao", nome="Formatação",
  titulo="Formatação de computador e notebook",
  lead="Deixe o seu equipamento como novo: sistema limpo, rápido e pronto para usar, com atendimento no seu endereço ou entrega agendada.",
  preco="", precoNota="O valor é combinado antes de começar. Se houver taxa de deslocamento, ela é informada com clareza antes do atendimento.",
  inclui=["Cópia dos seus arquivos importantes antes de formatar, sempre que possível","Instalação limpa do sistema operacional","Instalação dos drivers do equipamento","Programas essenciais para o dia a dia","Atualizações do sistema e ajustes de desempenho","Equipamento entregue funcionando e explicado"],
  para="Quem tem computador ou notebook lento, com vírus, travando ou com o sistema corrompido, e quer voltar a trabalhar sem dor de cabeça.",
  passos=[("Pedido","Você descreve o equipamento e o que está acontecendo."),("Combinado","A PD confirma disponibilidade, valor e se o atendimento é no seu endereço."),("Atendimento","A formatação é feita e o equipamento volta pronto para uso.")],
  orc="../02-atendimento-v5/index.html", cta="Solicitar atendimento"),
 dict(slug="18-servico-consultoria", arte="consultoria", nome="Consultoria de TI",
  titulo="Consultoria de TI para empresas",
  lead="Diagnóstico da estrutura de tecnologia, plano de melhorias e prioridades de investimento para o seu negócio gastar menos e parar menos.",
  preco="", precoNota="A consultoria é orçada conforme o tamanho da sua estrutura. A primeira conversa serve para entender o cenário.",
  inclui=["Levantamento de computadores, rede, backup e acessos","Identificação de riscos e gargalos","Plano de melhorias em ordem de prioridade","Orientação sobre o que vale a pena comprar ou trocar","Recomendações de segurança no dia a dia","Acompanhamento da execução, se você quiser"],
  para="Pequenas e médias empresas que não têm um profissional de TI fixo e querem uma visão clara do que precisa de atenção e do que pode esperar.",
  passos=[("Conversa","Você apresenta a empresa e as dores atuais."),("Diagnóstico","A PD analisa a estrutura e organiza o que foi encontrado."),("Plano","Você recebe as melhorias priorizadas e decide por onde começar.")],
  orc="../05-consultoria-ti-v2/index.html", cta="Solicitar consultoria"),
 dict(slug="19-servico-windows", arte="windows", nome="Ativação de Windows",
  titulo="Ativação de Windows",
  lead="Ativação do Windows com licença original, de forma rápida e segura, para você usar o sistema sem avisos e com todas as atualizações.",
  preco="", precoNota="O valor depende da versão do Windows. Peça o orçamento e a PD confirma o preço antes de começar.",
  inclui=["Licença original","Verificação da versão instalada no equipamento","Ativação e conferência de que o sistema ficou ativado","Atendimento combinado pelo WhatsApp"],
  para="Quem usa um Windows não ativado, vê a marca d'água na tela ou quer regularizar o computador com licença de verdade.",
  passos=[("Pedido","Você informa a versão do Windows e o equipamento."),("Orçamento","A PD confirma o valor e o melhor jeito de fazer."),("Ativação","O sistema é ativado e conferido com você.")],
  orc="../14-orcamento-entrada-v2/index.html", cta="Pedir orçamento"),
 dict(slug="20-servico-sites", arte="site", nome="Criação de sites",
  titulo="Criação de sites",
  lead="Um site profissional para a sua empresa, rápido no celular e preparado para ser encontrado no Google, com botão direto para o seu WhatsApp.",
  preco="Sob orçamento", precoNota="O valor depende do número de páginas e dos recursos. Você recebe a proposta antes de qualquer compromisso.",
  inclui=["Layout limpo, com a identidade da sua empresa","Funciona bem no celular, tablet e computador","Botão de WhatsApp e formulário de contato","Preparação básica para aparecer em buscas no Google","Orientação sobre domínio e hospedagem","Ajustes depois da entrega para tudo ficar como você quer"],
  para="Negócios que ainda não têm site, ou que têm um site antigo e lento, e querem passar mais confiança e receber mais contatos.",
  passos=[("Conversa","Você conta sobre a empresa, os serviços e o que o site precisa fazer."),("Proposta","A PD apresenta o escopo, o prazo e o valor."),("Publicação","O site é construído, aprovado por você e colocado no ar.")],
  orc="../07-orcamento-empresarial-v2/index.html", cta="Pedir orçamento do site"),
]
SEG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
ZAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.2-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>'
e = html.escape
def pagina(s):
    zap = f"https://wa.me/{FONE}?text=" + urllib.parse.quote(f"Olá! Vim pelo site da PD e quero saber mais sobre: {s['nome']}.")
    url = BASE + s["slug"] + "/"
    desc = s["lead"]
    preco = f'<p class="sv-preco">{e(s["preco"])}</p>' if s["preco"] else ""
    inclui = "".join(f"<li>{e(i)}</li>" for i in s["inclui"])
    passos = "".join(f'<li><span class="sv-n">{n}</span><div><h3>{e(t)}</h3><p>{e(x)}</p></div></li>' for n,(t,x) in enumerate(s["passos"],1))
    outros = "".join(f'<a href="../{o["slug"]}/index.html">{e(o["nome"])}</a>' for o in SERV if o is not s)
    return f'''<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(s["titulo"])} | PD Soluções Digitais</title><meta name="description" content="{e(desc)}"><meta name="robots" content="index,follow"><meta name="theme-color" content="#040705"><link rel="canonical" href="{url}"><meta property="og:title" content="{e(s["titulo"])} | PD Soluções Digitais"><meta property="og:description" content="{e(desc)}"><meta property="og:type" content="website"><meta property="og:url" content="{url}"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="PD Soluções Digitais"><meta property="og:image" content="{BASE.replace("screens/","")}assets/og-image.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" type="image/png" sizes="32x32" href="../../assets/favicon-32.png"><link rel="apple-touch-icon" href="../../assets/apple-touch-icon.png"><link rel="preload" href="../../assets/fonts/space-grotesk-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin><link id="pd-typography" rel="stylesheet" href="../../typography-refinements.css"><link rel="stylesheet" href="../../home-a.css"><link rel="stylesheet" href="../../servico.css"></head><body><div class="site-shell"><div class="glow-a" aria-hidden="true"></div>
<header class="topbar"><div class="wrap"><a class="brand" href="../../index.html" aria-label="PD Soluções Digitais, página inicial"><img src="../../assets/logo-pd-oficial.webp" alt="PD Soluções Digitais" width="150" height="59"></a>
<nav class="nav" aria-label="Navegação principal"><a href="../../index.html">Início</a><a href="../../index.html#destaques">Destaques</a><a href="../../index.html#contato">Contato</a></nav>
<a class="whatsapp-top" href="{zap}" target="_blank" rel="noopener noreferrer" aria-label="Falar com a PD pelo WhatsApp">{ZAP}WhatsApp PD</a></div></header>
<main>
<section class="sv-hero"><div class="wrap">
<div class="sv-copy"><a class="sv-voltar" href="../../index.html#destaques">← Voltar aos destaques</a><span class="eyebrow">Serviço PD</span><h1>{e(s["titulo"])}</h1><p class="lead">{e(s["lead"])}</p>{preco}
<div class="cta-row"><a class="btn btn-primary" href="{s["orc"]}">{e(s["cta"])} {SEG}</a><a class="btn btn-ghost" href="{zap}" target="_blank" rel="noopener noreferrer">Tirar dúvidas no WhatsApp</a></div></div>
<img class="sv-arte" src="../../assets/destaque-{s["arte"]}.svg" alt="" width="600" height="420"></div></section>
<section class="sv-sec"><div class="wrap sv-cols">
<div><span class="eyebrow">O que está incluído</span><h2>O que você recebe</h2><ul class="sv-lista">{inclui}</ul></div>
<div><span class="eyebrow">Para quem é</span><h2>É para você se…</h2><p class="sv-para">{e(s["para"])}</p><p class="sv-nota">{e(s["precoNota"])}</p></div>
</div></section>
<section class="sv-sec"><div class="wrap"><span class="eyebrow">Como funciona</span><h2>Simples, em três passos</h2><ol class="sv-passos">{passos}</ol></div></section>
<section class="sv-fim"><div class="wrap"><div><h2>Vamos conversar?</h2><p>Sem compromisso. A PD responde pelo WhatsApp que você informar.</p></div><div class="cta-row"><a class="btn btn-primary" href="{s["orc"]}">{e(s["cta"])} {SEG}</a><a class="btn btn-ghost" href="{zap}" target="_blank" rel="noopener noreferrer">Chamar no WhatsApp</a></div></div></section>
<section class="sv-outros"><div class="wrap"><span class="eyebrow">Outros serviços</span><nav aria-label="Outros serviços">{outros}</nav></div></section>
</main>
<footer class="footer"><div class="wrap sv-rodape"><span>© PD Soluções Digitais · Contagem – MG</span><a href="../../index.html">Voltar ao início</a></div></footer></div></body></html>
'''
raiz = pathlib.Path(__file__).resolve().parent.parent
for s in SERV:
    d = raiz / "screens" / s["slug"]; d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(pagina(s), encoding="utf-8")
    print("ok", s["slug"])
