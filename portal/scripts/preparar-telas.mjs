import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../..");
const portal=path.resolve(here,"..");
const source=path.join(repo,"approved-ui/sources-expanded/screens");
const dest=path.join(portal,"public/telas/screens");
const assets=path.join(portal,"public/telas/assets");
if (!fs.existsSync(source)) throw new Error("Faltam fontes aprovadas: reconstruir bundle.");
fs.rmSync(path.join(portal,"public/telas"),{recursive:true,force:true});
fs.mkdirSync(dest,{recursive:true});
fs.mkdirSync(assets,{recursive:true});
const dirNames=fs.readdirSync(source).filter(x=>/^\d\d-/.test(x)).sort();
// O painel V2 é PRIVADO e não é copiado para /public.
const publicScreens=dirNames.filter(x=>Number(x.slice(0,2))<=15);
if (publicScreens.length!==15) throw new Error("Esperadas 15 telas públicas aprovadas.");
// Loja Rápida dinâmica: a referência aprovada traz produtos de exemplo escritos no HTML.
// Aqui eles saem e entra o aviso "catálogo em montagem"; o pd-runtime.js carrega os
// produtos reais de /api/produtos e, havendo algum, substitui o aviso.
function lojaSemExemplos(html){
  const inicio=html.indexOf('<div class="products" id="products">');
  const fim=html.indexOf('</div></div></section><section class="request"');
  if(inicio<0||fim<0) throw new Error("Estrutura da Loja Rápida mudou: revisar preparar-telas.mjs.");
  const vazio='<div class="products" id="products"><div class="catalog-empty" id="catalogEmpty">'
    +'<span class="catalog-empty-icon">▣</span><h3>CATÁLOGO EM MONTAGEM</h3>'
    +'<p>ESTAMOS PREPARANDO OS PRIMEIROS ITENS DA LOJA RÁPIDA. ENQUANTO ISSO, FALE COM A PD PELO WHATSAPP PARA CONSULTAR ACESSÓRIOS E PERIFÉRICOS.</p>'
    +'<a class="catalog-empty-cta" href="#">FALAR COM A PD NO WHATSAPP →</a></div></div>';
  html=html.slice(0,inicio)+vazio+html.slice(fim);
  html=html.replace(/<div class="filters">[\s\S]*?<\/div>/,'<div class="filters" id="filters"></div>');
  html=html.replace(/<div class="catalog-head"><div><h2>[\s\S]*?<\/h2><p>[\s\S]*?<\/p>/,
    '<div class="catalog-head"><div><h2>PRODUTOS PARA CONSULTA</h2><p>CATÁLOGO EM MONTAGEM. CONSULTE ITENS, VALORES E DISPONIBILIDADE PELO WHATSAPP. NÃO HÁ RESERVA OU PAGAMENTO AUTOMÁTICO.</p>');
  const seletor=html.indexOf('<select id="productSelect">');
  const seletorFim=html.indexOf('</select>',seletor);
  if(seletor>=0&&seletorFim>seletor)
    html=html.slice(0,seletor)+'<select id="productSelect"><option value="">SELECIONE O PRODUTO</option>'
      +'<option>OUTRO PRODUTO — DESCREVER NA OBSERVAÇÃO</option>'+html.slice(seletorFim);
  const css='.catalog-empty{grid-column:1/-1;border:1px solid var(--line2);border-radius:18px;'
    +'background:linear-gradient(145deg,rgba(10,20,14,.97),rgba(5,10,7,.95));padding:44px 24px;'
    +'display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px}'
    +'.catalog-empty-icon{font-size:26px;color:var(--green2)}'
    +'.catalog-empty h3{margin:0;font-size:22px;letter-spacing:-.01em}'
    +'.catalog-empty p{margin:0;max-width:520px;color:var(--muted);font-size:9px;line-height:1.7}'
    +'.catalog-empty-cta{margin-top:6px;border:1px solid var(--line2);border-radius:12px;padding:12px 18px;'
    +'font-size:8.4px;font-weight:900;letter-spacing:.08em;color:var(--green3);background:rgba(63,149,100,.10)}'
    +'.pd-sem-foto{background:linear-gradient(145deg,rgba(14,28,20,.96),rgba(6,12,8,.96))!important;'
    +'display:flex;align-items:center;justify-content:center}'
    +'.pd-sem-foto::after{content:"";width:46%;max-width:120px;aspect-ratio:1;'
    +'background:url("../../assets/logo-pd-oficial.webp") center/contain no-repeat;opacity:.3}';
  return html.replace("</style>",css+"</style>");
}
for (const slug of publicScreens){
  const folder=path.join(source,slug);
  const dst=path.join(dest,slug);
  fs.cpSync(folder,dst,{recursive:true});
  const index=path.join(dst,"index.html");
  let html=fs.readFileSync(index,"utf8");
  const css=path.join(dst,"styles.css");
  if(fs.existsSync(css)){
    const legacy=slug+".css";
    html=html.replaceAll('href="'+legacy+'"','href="styles.css"');
    if(!/href=["']styles\.css["']/.test(html)){
      html=html.replace(/<\/head>/i,'<link rel="stylesheet" href="styles.css"></head>');
    }
  }
  if(slug==="08-loja-rapida-v2") html=lojaSemExemplos(html);
  html=html.replace(/<\/body>/i,'<script defer src="/pd-public-config.js"></script><script defer src="/pd-runtime.js"></script></body>');
  fs.writeFileSync(index,html);
}
// Prioridade para imagens originais aprovadas, quando forem importadas.
for(const dir of [path.join(repo,"approved-ui/assets"),path.join(repo,"assets")]){
  if(!fs.existsSync(dir)) continue;
  for(const filename of fs.readdirSync(dir)){
    if(!/\.(png|jpg|jpeg|webp|svg)$/i.test(filename)) continue;
    const dst=path.join(assets,filename);
    if(!fs.existsSync(dst)) fs.copyFileSync(path.join(dir,filename),dst);
  }
}
// Fallback da logo já versionada; nunca inventar novas marcas.
const logo=path.join(assets,"logo-pd-oficial.webp");
const encoded=path.join(repo,"assets/official-logo.webp.b64");
if(!fs.existsSync(logo)&&fs.existsSync(encoded))
  fs.writeFileSync(logo,Buffer.from(fs.readFileSync(encoded,"utf8").trim(),"base64"));
const alias=path.join(assets,"logo-pd-oficial-2.webp");
if(!fs.existsSync(alias)&&fs.existsSync(logo)) fs.copyFileSync(logo,alias);
const config = {
 siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
 captchaRequired:process.env.NODE_ENV==="production"
};
fs.writeFileSync(path.join(portal,"public/pd-public-config.js"),
 "window.PD_CONFIG="+JSON.stringify(config)+";\n");
console.log("Telas públicas oficiais preparadas:",publicScreens.length);
