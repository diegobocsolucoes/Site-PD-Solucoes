/* Contato real no site estático; nunca inventa protocolo nem envia dados sem backend. */
(() => {
  "use strict";
  const script=document.currentScript;
  const base=new URL(".",script.src);
  const phone="5531995483280";
  const whatsapp=(text)=>"https://wa.me/"+phone+"?text="+encodeURIComponent(text);
  const slug=location.pathname.match(/\/screens\/([^/]+)\//)?.[1]||"01-home-v15";
  const route=(name)=>new URL("screens/"+name+"/index.html",base).href;
  const areas={
    "01-home-v15":"conhecer os serviços da PD Soluções Digitais",
    "02-atendimento-v5":"solicitar atendimento particular ou orçamento",
    "03-area-empresas-v3":"suporte técnico para minha empresa",
    "04-planos-chamados-v2":"conhecer planos de chamados empresariais",
    "05-consultoria-ti-v2":"consultoria de TI",
    "06-seguranca-eletronica-v2":"segurança eletrônica",
    "07-orcamento-empresarial-v2":"orçamento empresarial",
    "08-loja-rapida-v2":"consultar disponibilidade de produtos",
    "09-parcerias-v2":"uma parceria comercial",
    "10-consultoria-entrada-v2":"consultoria",
    "11-consultoria-domestica-v2":"consultoria doméstica",
    "12-consultoria-setup-v2":"consultoria de setup",
    "13-chamado-empresarial-v2":"abrir chamado empresarial",
    "14-orcamento-entrada-v2":"solicitar orçamento"
  };
  const contact=whatsapp("Olá! Vim pelo site da PD Soluções Digitais e gostaria de "+(areas[slug]||"atendimento")+".");
  document.querySelectorAll("a.whatsapp-top,a.footer-whatsapp-cta,a.small-btn").forEach((a)=>{
    if(a.classList.contains("whatsapp-top")||/whatsapp|falar com a pd/i.test(a.textContent)){
      a.href=contact;a.target="_blank";a.rel="noopener noreferrer";
    }
  });
  document.querySelectorAll("a.brand").forEach(a=>a.href=new URL("index.html",base).href);
  // O pacote original ainda não contém todas as fotografias finais.
  // Quando uma estiver ausente, preserva o fundo institucional em vez de mostrar ícone quebrado.
  document.querySelectorAll("img").forEach(img=>{
    const missing=()=>{
      if(img.dataset.fallback==="1"){img.style.display="none";return;}
      img.dataset.fallback="1";
      if(/logo-pd/i.test(img.alt||""))return;
      if(/mouse|hdmi|adaptador|teclado|pendrive|produto|filtro|rede/i.test(img.src)){
        img.style.display="none";return;
      }
      img.src=new URL("assets/pd-background.jpg",base).href;
    };
    img.addEventListener("error",missing,{once:false});
    if(img.complete&&img.naturalWidth===0)missing();
  });
  // A versão pública estática não gera protocolos. Exibe ação explícita de contato.
  if(slug==="15-confirmacao-universal-v3"){
    location.replace(new URL("index.html",base).href);return;
  }
  const button=document.createElement("a");
  button.href=contact;button.target="_blank";button.rel="noopener noreferrer";
  button.textContent="FALAR COM A PD ↗";button.setAttribute("aria-label","Falar com a PD pelo WhatsApp");
  button.style.cssText="position:fixed;z-index:1000;bottom:16px;right:16px;padding:14px 17px;"
    +"color:#f2fff5;background:#174629;border:1px solid #79d497;border-radius:8px;"
    +"font:700 12px Arial,sans-serif;letter-spacing:.04em;text-decoration:none;"
    +"box-shadow:0 12px 28px #0009";
  document.body.append(button);
  const formAction=/^(enviar|finalizar|concluir|cadastrar|reservar|confirmar solicitacao|solicitar atendimento|solicitar orcamento)/i;
  function dialog(){
    const d=document.createElement("dialog");
    d.style.cssText="max-width:min(94vw,510px);border:1px solid #79d497;border-radius:9px;"
      +"background:#101a13;color:#f2fff5;padding:28px;box-shadow:0 25px 70px #000c;"
      +"font:15px/1.65 Arial,sans-serif";
    const h=document.createElement("h2");h.textContent="ATENDIMENTO PELO WHATSAPP";
    h.style.cssText="font-size:20px;line-height:1.3;color:#9be5ae";
    const p=document.createElement("p");
    p.textContent="O formulário automático está em homologação. Esta página ainda não registra pedidos nem gera protocolos. Você pode solicitar o atendimento diretamente pelo WhatsApp.";
    const link=document.createElement("a");link.href=contact;link.target="_blank";
    link.rel="noopener noreferrer";link.textContent="CONTINUAR PELO WHATSAPP →";
    link.style.cssText="display:block;margin:18px 0;padding:13px;background:#21603a;color:#fff;text-align:center;border-radius:5px;text-decoration:none;font-weight:bold";
    const close=document.createElement("button");close.textContent="VOLTAR AO SITE";
    close.style.cssText="padding:10px 0;background:transparent;color:#f2fff5;border:0;text-decoration:underline;cursor:pointer";
    close.addEventListener("click",()=>d.close());
    d.append(h,p,link,close);d.addEventListener("close",()=>d.remove());
    document.body.append(d);if(d.showModal)d.showModal();else d.setAttribute("open","");
  }
  document.addEventListener("click",event=>{
    const btn=event.target.closest?.("button");if(!btn)return;
    if(btn.closest(".category-card,.choice-card,.cards > .card,.request-mode"))return;
    const label=(btn.textContent||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
    if(btn.id==="submitButton"||btn.type==="submit"||formAction.test(label)){
      event.preventDefault();event.stopImmediatePropagation();dialog();
    }
  },true);
})();
