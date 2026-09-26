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
