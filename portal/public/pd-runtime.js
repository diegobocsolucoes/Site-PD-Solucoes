/* Conector funcional externo. Os HTML/CSS aprovados permanecem intactos. */
(() => {
  "use strict";
  const root="/telas/screens/";
  const slug=location.pathname.match(/\/screens\/([^/]+)\//)?.[1] || "";
  const go=(name,query="")=>location.assign(root+name+"/index.html"+query);
  const normalize=(text)=>(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .trim().toLowerCase().replace(/\s+/g," ");
  const screens={
    "atendimento":"02-atendimento-v5","area para empresas":"03-area-empresas-v3",
    "solicitar orcamento":"14-orcamento-entrada-v2",
    "consultoria":"10-consultoria-entrada-v2",
    "loja rapida":"08-loja-rapida-v2","parcerias":"09-parcerias-v2",
    "abrir chamado / atendimento":"13-chamado-empresarial-v2",
    "planos de chamados":"04-planos-chamados-v2",
    "consultoria de ti":"05-consultoria-ti-v2",
    "seguranca eletronica":"06-seguranca-eletronica-v2",
    "orcamento empresarial":"07-orcamento-empresarial-v2"
  };
  const homeRoute=new Map([
    ["atendimento","02-atendimento-v5"],
    ["area para empresas","03-area-empresas-v3"],
    ["solicitar orcamento","14-orcamento-entrada-v2"],
    ["consultoria","10-consultoria-entrada-v2"],
    ["loja rapida","08-loja-rapida-v2"],
    ["parcerias","09-parcerias-v2"]
  ]);
  function consultDialog(company){
    const entries=company
      ? [["CONSULTORIA DE TI","05-consultoria-ti-v2"],["SEGURANÇA ELETRÔNICA","06-seguranca-eletronica-v2"]]
      : [["COMPUTADOR DOMÉSTICO","11-consultoria-domestica-v2"],["CONSULTORIA DE SETUP","12-consultoria-setup-v2"]];
    const dialog=document.createElement("dialog");
    dialog.setAttribute("aria-label","Escolha sua consultoria");
    dialog.style.cssText="background:#101712;color:#f5fff7;border:1px solid #79d497;"
      +"padding:24px;width:min(92vw,430px);border-radius:8px;box-shadow:0 20px 60px #000a";
    const title=document.createElement("h2");
    title.textContent="ESCOLHA SUA CONSULTORIA";
    dialog.append(title);
    entries.forEach(([label,route])=>{
      const button=document.createElement("button");
      button.type="button";button.textContent=label+" →";
      button.style.cssText="display:block;width:100%;text-align:left;margin:12px 0;"
        +"padding:15px;background:#193120;color:#fff;border:1px solid #79d497;cursor:pointer";
      button.addEventListener("click",()=>go(route));dialog.append(button);
    });
    const cancel=document.createElement("button");
    cancel.textContent="CANCELAR";cancel.type="button";
    cancel.addEventListener("click",()=>dialog.close());
    dialog.append(cancel);dialog.addEventListener("close",()=>dialog.remove());
    document.body.append(dialog);dialog.showModal();
  }
  if(slug==="01-home-v15"){
    document.querySelectorAll(".category-card").forEach(card=>{
      const target=homeRoute.get(normalize(card.querySelector("h2")?.textContent));
      if(target) card.querySelector("button")?.addEventListener("click",()=>go(target));
    });
  }
  if(slug==="03-area-empresas-v3"){
    document.querySelectorAll(".cards > .card").forEach(card=>{
      const name=normalize(card.querySelector("h3")?.textContent);
      const target=screens[name];
      if(target)card.querySelector("button")?.addEventListener("click",()=>go(target));
    });
  }
  if(slug==="14-orcamento-entrada-v2"){
    document.querySelectorAll(".choice-card").forEach(card=>{
      const name=normalize(card.querySelector("h3")?.textContent);
      card.querySelector("button")?.addEventListener("click",()=>{
        if(name.includes("particular"))go("02-atendimento-v5","?modo=orcamento");
        else go("07-orcamento-empresarial-v2");
      });
    });
  }
  if(slug==="10-consultoria-entrada-v2"){
    document.querySelectorAll(".choice-card").forEach(card=>{
      const company=normalize(card.querySelector("h3")?.textContent).includes("empresa");
      card.querySelector("button")?.addEventListener("click",()=>consultDialog(company));
    });
    const sub={"computador domestico":"11-consultoria-domestica-v2",
       "consultoria de setup":"12-consultoria-setup-v2",
       "consultoria de ti":"05-consultoria-ti-v2",
       "seguranca eletronica":"06-seguranca-eletronica-v2"};
    document.querySelectorAll(".subpath").forEach(item=>{
      const target=sub[normalize(item.querySelector("b")?.textContent)];
      if(!target)return;
      item.tabIndex=0;item.setAttribute("role","link");
      item.addEventListener("click",()=>go(target));
      item.addEventListener("keydown",e=>{
        if(e.key==="Enter"){e.preventDefault();go(target);}
      });
    });
  }
  // Navegação entre áreas, respeitando as âncoras internas reais.
  document.querySelectorAll("a").forEach(a=>{
    const href=a.getAttribute("href");
    if(href&&href!=="#")return;
    const label=normalize(a.textContent);
    if(label.includes("whatsapp")||label.includes("falar com a pd")){
      a.href="https://wa.me/5531995483280";a.target="_blank";a.rel="noopener";
      return;
    }
    const nav={"inicio":"01-home-v15","voltar ao portal":"01-home-v15",
      "atendimento":"02-atendimento-v5","empresas":"03-area-empresas-v3",
      "consultoria":"10-consultoria-entrada-v2","parcerias":"09-parcerias-v2",
      "loja rapida":"08-loja-rapida-v2"};
    if(nav[label])a.href=root+nav[label]+"/index.html";
  });
  if(slug==="02-atendimento-v5") setupAtendimento();
  if(slug==="15-confirmacao-universal-v3") setupConfirmacao();

  function setupAtendimento(){
    if(new URLSearchParams(location.search).get("modo")==="orcamento")
      document.querySelector('[data-request-mode="quote"]')?.click();
    const button=document.getElementById("submitButton");
    if(!button)return;
    const message=document.createElement("p");
    message.setAttribute("role","status");message.setAttribute("aria-live","polite");
    message.style.cssText="margin:14px 0;color:#d8f2df;font:700 13px/1.5 Arial,sans-serif";
    button.after(message);
    const delivery=document.querySelector(".attendance.selected");
    const cepBox=delivery?.querySelector(".cep-box");
    let cepInput;
    if(cepBox){
      cepInput=document.createElement("input");cepInput.type="text";cepInput.inputMode="numeric";
      cepInput.maxLength=9;cepInput.placeholder="CEP: 00000-000";
      cepInput.setAttribute("aria-label","CEP para consultar área de atendimento");
      cepInput.style.cssText="width:125px;background:#09140e;color:#fff;"
        +"border:1px solid #79d497;padding:7px;font-size:12px";
      cepInput.addEventListener("click",e=>e.stopPropagation());
      cepBox.replaceChildren(cepInput);
    }
    // Campo anti-spam invisível (não pedir CPF).
    const trap=document.createElement("input");
    trap.type="text";trap.name="site_url";trap.autocomplete="off";trap.tabIndex=-1;
    trap.setAttribute("aria-hidden","true");trap.style.cssText="position:absolute;left:-9999px";
    button.after(trap);
    let turnstileToken="";
    const captcha=document.createElement("div");
    captcha.setAttribute("aria-label","Verificação de segurança");
    button.before(captcha);
    const key=window.PD_CONFIG?.siteKey || "";
    if(key){
      const widget=document.createElement("div");captcha.append(widget);
      const script=document.createElement("script");
      script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async=true;script.defer=true;
      script.addEventListener("load",()=>{
        if(!window.turnstile)return;
        window.turnstile.render(widget,{
          sitekey:key,theme:"dark",
          callback:token=>{turnstileToken=token;},
          "expired-callback":()=>{turnstileToken="";}
        });
      });
      document.head.append(script);
    }else if(window.PD_CONFIG?.captchaRequired){
      message.textContent="O formulário aguarda configuração de segurança no servidor.";
      button.disabled=true;
    }
    button.addEventListener("click",async()=>{
      const name=document.querySelector('input[placeholder="DIGITE SEU NOME COMPLETO"]')?.value?.trim()||"";
      const whatsapp=document.querySelector('input[placeholder="(31) 9 0000-0000"]')?.value||"";
      const equipment=document.querySelector('[data-group="equip"].selected b')?.textContent||"";
      const service=document.querySelector(".problem.selected")?.dataset.service||"";
      const mode=document.querySelector('[data-group="attendance"].selected')===delivery?"presencial":"entrega";
      const description=document.querySelector("textarea")?.value?.trim()||"";
      const cep=cepInput?.value?.replace(/\D/g,"")||"";
      const tipo=document.querySelector('[data-request-mode="quote"].selected')?"orcamento":"servico";
      if(!name||!whatsapp||!service||description.length<10||
         (mode==="presencial"&&cep.length!==8)){
        message.textContent="Preencha nome, WhatsApp, serviço e descrição (mínimo 10 caracteres). "
          +(mode==="presencial"?"Informe também o CEP com 8 números.":"");
        return;
      }
      if(window.PD_CONFIG?.captchaRequired&&!turnstileToken){
        message.textContent="Conclua a verificação de segurança.";return;
      }
      button.disabled=true;message.textContent="Enviando solicitação...";
      try{
        const result=await fetch("/api/solicitacoes",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({tipo,nome:name,whatsapp,
            equipamento:normalize(equipment),servico:service,modalidade:mode,
            descricao,cep,site_url:trap.value,turnstileToken})
        });
        const data=await result.json();
        if(!result.ok||!data.protocolo)throw new Error(data.erro||"Não foi possível enviar.");
        sessionStorage.setItem("pd-confirmacao",JSON.stringify(data));
        go("15-confirmacao-universal-v3");
      }catch(err){
        message.textContent=err instanceof Error?err.message:"Tente novamente.";
        if(window.turnstile){window.turnstile.reset();turnstileToken="";}
        button.disabled=false;
      }
    });
  }
  function setupConfirmacao(){
    let data;
    try{data=JSON.parse(sessionStorage.getItem("pd-confirmacao")||"null");}catch{}
    if(!data?.protocolo||!data?.resumo){
      location.replace(root+"02-atendimento-v5/index.html");return;
    }
    const r=data.resumo;
    const set=(id,value)=>{const el=document.getElementById(id);
      if(el)el.textContent=value||"NÃO INFORMADO";};
    set("protocol",data.protocolo);
    set("flowBreadcrumb",r.tipo==="orcamento"?"ORÇAMENTO":"ATENDIMENTO");
    set("summaryType",r.tipo==="orcamento"?"ORÇAMENTO":"ATENDIMENTO / SERVIÇO");
    set("summaryEquipment",r.equipamento.toUpperCase());
    set("summaryService",r.servico.replaceAll("-"," ").toUpperCase());
    set("summaryMode",r.modalidade==="presencial"?"PRESENCIAL (A CONFIRMAR)":"ENTREGA AGENDADA (A CONFIRMAR)");
    set("summaryLocation",r.cep?"CEP "+r.cep:"A COMBINAR");
    set("summaryWhatsapp",r.whatsapp);
    document.getElementById("valueStrip")?.remove();
    document.querySelectorAll(".action-row button").forEach((btn,i)=>{
      btn.addEventListener("click",()=>i===0?go("01-home-v15"):go("02-atendimento-v5"));
    });
  }
})();
