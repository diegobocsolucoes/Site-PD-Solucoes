/* Portal oficial estático: contato pelo WhatsApp, sem registro/protocolo fictício. */
(() => {
  "use strict";
  const script=document.currentScript;
  const base=new URL(".",script.src);
  const phone="5531995483280";
  const slug=location.pathname.match(/\/screens\/([^/]+)\//)?.[1]||"01-home-v15";
  const wa=(message)=>"https://wa.me/"+phone+"?text="+encodeURIComponent(message);
  const norm=(s)=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/\s+/g," ").trim().toLowerCase();
  const topics={
    "01-home-v15":"conhecer os serviços da PD",
    "02-atendimento-v5":"atendimento particular ou orçamento",
    "03-area-empresas-v3":"suporte empresarial",
    "04-planos-chamados-v2":"planos de chamados",
    "05-consultoria-ti-v2":"consultoria de TI para empresas",
    "06-seguranca-eletronica-v2":"segurança eletrônica",
    "07-orcamento-empresarial-v2":"orçamento empresarial",
    "08-loja-rapida-v2":"produtos da Loja Rápida",
    "09-parcerias-v2":"uma parceria comercial",
    "10-consultoria-entrada-v2":"consultoria",
    "11-consultoria-domestica-v2":"consultoria doméstica",
    "12-consultoria-setup-v2":"consultoria de setup",
    "13-chamado-empresarial-v2":"um chamado empresarial",
    "14-orcamento-entrada-v2":"solicitar orçamento"
  };
  const greeting="Olá! Vim pelo site oficial da PD Soluções Digitais e gostaria de ";
  const contact=wa(greeting+(topics[slug]||"atendimento")+".");
  const val=(selector)=>document.querySelector(selector)?.value?.trim()||"";
  const digits=(x)=>x.replace(/\D/g,"");
  const phoneValid=(x)=>/^(?:\d{10,11}|55\d{10,11})$/.test(digits(x));
  const tidy=(s,max=500)=>s.replace(/\s+/g," ").trim().slice(0,max);
  const selected=(selector)=>tidy(document.querySelector(selector)?.textContent||"",90);
  const valueFrom=(selector)=>tidy(document.querySelector(selector)?.value||"",300);

  document.querySelectorAll("a").forEach(a=>{
    const label=norm((a.getAttribute("aria-label")||"")+" "+a.textContent);
    if(label.includes("whatsapp")||label.includes("falar com a pd")){
      a.href=contact;a.target="_blank";a.rel="noopener noreferrer";
    }
    if(a.classList.contains("brand"))a.href=new URL("index.html",base).href;
  });
  // As imagens ausentes recebem o fundo institucional existente. A Home
  // recuperou a própria fotografia aprovada; não a substituímos.
  document.querySelectorAll("img").forEach(img=>{
    const fallback=()=>{
      if(img.dataset.pdFallback==="1"){img.style.display="none";return;}
      img.dataset.pdFallback="1";
      if(/produto|hdmi|mouse|teclado|pendrive|adaptador|filtro|rede|forca/i.test(img.src)){
        img.style.display="none";return;
      }
      img.src=new URL("assets/pd-background.jpg",base).href;
    };
    img.addEventListener("error",fallback);
    if(img.complete&&!img.naturalWidth)fallback();
  });

  if(slug==="15-confirmacao-universal-v3"){
    location.replace(new URL("index.html",base).href);return;
  }

  // Este catálogo ainda não está conectado ao estoque do Painel PD.
  // Não divulgar preços ou disponibilidade meramente ilustrativos.
  if(slug==="08-loja-rapida-v2"){
    document.querySelectorAll(".product .status").forEach(el=>el.textContent="SOB CONSULTA");
    document.querySelectorAll(".product .price").forEach(el=>el.textContent="A CONFIRMAR");
    document.querySelectorAll(".product .price-label").forEach(el=>el.textContent="VALOR ATUAL");
    document.querySelectorAll(".product .reserve").forEach(el=>el.textContent="CONSULTAR →");
    document.querySelectorAll(".catalog-head p").forEach(el=>{
      el.textContent="CATÁLOGO ILUSTRATIVO. CONSULTE VALORES E DISPONIBILIDADE PELO WHATSAPP. NÃO HÁ RESERVA OU PAGAMENTO AUTOMÁTICO.";
    });
  }

  // Entrada manual de CEP: o layout aprovado mostra um marcador mas não
  // inclui um campo editável. Não calcular cobertura ou agendamento.
  let cepInput;
  if(slug==="02-atendimento-v5"){
    const grid=document.querySelector(".attendance-grid");
    if(grid){
      const label=document.createElement("label");
      label.textContent="CEP PARA ATENDIMENTO NO ENDEREÇO (A COBERTURA SERÁ CONFIRMADA)";
      label.style.cssText="display:block;margin:12px 0;color:#b9e2c2;font:700 12px Arial,sans-serif";
      cepInput=document.createElement("input");
      cepInput.type="text";cepInput.inputMode="numeric";cepInput.maxLength=9;
      cepInput.placeholder="00000-000";cepInput.autocomplete="postal-code";
      cepInput.style.cssText="display:block;width:min(100%,250px);margin-top:7px;padding:12px;"
        +"background:#0b1910;border:1px solid #79d497;border-radius:6px;color:#f4fff5;font:15px Arial";
      label.append(cepInput);
      grid.after(label);
      const refresh=()=>label.hidden=!document.querySelector(".attendance.selected")?.textContent?.includes("NO SEU ENDEREÇO");
      document.querySelectorAll(".attendance").forEach(btn=>btn.addEventListener("click",refresh));
      refresh();
    }
  }

  function review(){
    const result={error:"",element:null,lines:[]};
    const required=(selector,label,min=2)=>{
      const element=document.querySelector(selector);
      const value=element?.value?.trim()||"";
      if(!result.error&&value.length<min){result.error="Informe "+label+".";result.element=element;}
      return tidy(value,300);
    };
    const number=(selector)=>{
      const element=document.querySelector(selector);const value=element?.value||"";
      if(!result.error&&!phoneValid(value)){result.error="Informe um WhatsApp válido com DDD.";result.element=element;}
      return digits(value);
    };
    if(slug==="02-atendimento-v5"){
      const nome=required('input[placeholder="DIGITE SEU NOME COMPLETO"]',"seu nome");
      const numero=number('input[placeholder="(31) 9 0000-0000"]');
      const service=document.querySelector(".problem.selected");
      if(!result.error&&!service){result.error="Selecione um serviço.";result.element=document.querySelector(".problem");}
      const descricao=required("textarea","a descrição do problema (mínimo 10 caracteres)",10);
      const equip=selected('[data-group="equip"].selected b')||"A CONFIRMAR";
      const presencial=norm(selected(".attendance.selected")).includes("no seu endereco");
      const cep=digits(cepInput?.value||"");
      if(!result.error&&presencial&&cep.length!==8){result.error="Informe um CEP válido com 8 números.";result.element=cepInput;}
      const tipo=document.querySelector('[data-request-mode="quote"].selected')?"ORÇAMENTO PARTICULAR":"ATENDIMENTO PARTICULAR";
      result.lines=[tipo,"Nome: "+nome,"Meu WhatsApp: "+numero,"Equipamento: "+equip,
        "Serviço: "+(service?.dataset.service||"A CONFIRMAR"),
        "Problema: "+descricao,"Modalidade: "+(presencial?"ATENDIMENTO NO ENDEREÇO":"ENTREGA AGENDADA"),
        ...(presencial?["CEP: "+cep]:[])];
    }else if(slug==="07-orcamento-empresarial-v2"){
      const empresa=required('input[placeholder="NOME DA EMPRESA"]',"o nome da empresa");
      const responsavel=required('input[placeholder="SEU NOME"]',"o nome do responsável");
      const numero=number('input[placeholder="(31) 9XXXX-XXXX"]');
      const local=required('input[placeholder="INFORME A LOCALIZAÇÃO DA EMPRESA"]',"a localização da empresa");
      const descricao=required("textarea","a descrição da necessidade (mínimo 10 caracteres)",10);
      const areas=[...document.querySelectorAll(".choice.active")].map(el=>tidy(el.textContent,70));
      result.lines=["ORÇAMENTO EMPRESARIAL","Empresa: "+empresa,"Responsável: "+responsavel,
        "Meu WhatsApp: "+numero,"Localização: "+local,
        "Áreas: "+(areas.join("; ")||"A CONFIRMAR"),"Necessidade: "+descricao];
    }else if(slug==="09-parcerias-v2"){
      const empresa=required('input[placeholder="NOME DA EMPRESA"]',"o nome da empresa");
      const responsavel=required('input[placeholder="NOME DO RESPONSÁVEL"]',"o responsável");
      const numero=number('input[placeholder="(31) 9XXXX-XXXX"]');
      const email=required('input[placeholder="SEU@EMAIL.COM"]',"o e-mail de contato",5);
      const select=document.querySelector(".field-grid select");
      result.lines=["PROPOSTA DE PARCERIA (SUJEITA À ANÁLISE)",
        "Empresa: "+empresa,"Responsável: "+responsavel,"Meu WhatsApp: "+numero,
        "E-mail: "+email,"Segmento: "+(select?.value||"A CONFIRMAR"),
        "Descrição: "+(val("textarea")||"A COMBINAR")];
    }else if(slug==="08-loja-rapida-v2"){
      const nome=required('input[placeholder="SEU NOME"]',"seu nome");
      const numero=number('input[placeholder="(31) 9XXXX-XXXX"]');
      const produto=val("#productSelect");
      if(!result.error&&!produto){result.error="Selecione um produto.";result.element=document.getElementById("productSelect");}
      const selects=[...document.querySelectorAll(".field-grid select")];
      result.lines=["CONSULTA DE PRODUTO (NÃO É RESERVA CONFIRMADA)",
        "Nome: "+nome,"Meu WhatsApp: "+numero,"Produto: "+produto,
        "Quantidade: "+(selects[1]?.value||"A CONFIRMAR"),
        "Recebimento: "+(selects[2]?.value||"A COMBINAR"),
        "Localização: "+(val('input[placeholder="INFORME SUA LOCALIZAÇÃO"]')||"A COMBINAR"),
        "Observações: "+(val("textarea")||"NENHUMA")];
    }else if(slug==="13-chamado-empresarial-v2"){
      const empresa=required('input[placeholder="NOME DA EMPRESA"]',"a empresa");
      const responsavel=required('input[placeholder="NOME DO RESPONSÁVEL"]',"o responsável");
      const numero=number('input[placeholder="(31) 9 0000-0000"]');
      const servico=document.querySelector('[data-choice-group="service"] .selected');
      if(!result.error&&!servico){result.error="Selecione o serviço desejado.";result.element=document.querySelector('[data-choice-group="service"] button');}
      const descricao=required("textarea","a descrição do problema (mínimo 10 caracteres)",10);
      const groups=["plan","equip","service","impact","mode"];
      result.lines=["CHAMADO EMPRESARIAL (SUJEITO À CONFIRMAÇÃO)",
        "Empresa: "+empresa,"Responsável: "+responsavel,"Meu WhatsApp: "+numero,
        ...groups.map(k=>k.toUpperCase()+": "+(
          document.querySelector('[data-choice-group="'+k+'"] .selected')?.dataset.value||"A CONFIRMAR")),
        "Problema: "+descricao];
    }else{
      const values=[...document.querySelectorAll("main input,main select,main textarea")]
        .filter(el=>el.type!=="hidden"&&el.type!=="file"&&el.type!=="password"&&
          !/cnpj|cpf/i.test(el.placeholder||"")&&String(el.value||"").trim())
        .slice(0,12)
        .map(el=>{
          const label=tidy(el.closest("label")?.querySelector("span,label")?.textContent||
            el.placeholder||el.previousElementSibling?.textContent||"Informação",45);
          return label+": "+tidy(el.value,240);
        });
      result.lines=[(topics[slug]||"ATENDIMENTO").toUpperCase(),...values];
      const phoneField=[...document.querySelectorAll("main input")].find(el=>/whats|9 ?x{4}|9 ?0000/i.test((el.placeholder||"")+" "+el.closest("label")?.textContent));
      if(phoneField&&phoneField.value&&!phoneValid(phoneField.value)){
        result.error="Confira o WhatsApp informado.";result.element=phoneField;
      }
    }
    return result;
  }

  let visibleDialog;
  function showDialog(lines){
    visibleDialog?.remove();
    const dialog=document.createElement("dialog");visibleDialog=dialog;
    dialog.setAttribute("aria-label","Revisão para contato pelo WhatsApp");
    dialog.style.cssText="max-width:min(94vw,560px);width:100%;max-height:88vh;overflow:auto;"
      +"border:1px solid #79d497;border-radius:9px;background:#101a13;color:#f2fff5;"
      +"padding:28px;box-shadow:0 25px 70px #000c;font:14px/1.6 Arial,sans-serif";
    const heading=document.createElement("h2");
    heading.textContent="REVISE SUA MENSAGEM";heading.style.cssText="font-size:22px;color:#9be5ae";
    const note=document.createElement("p");
    note.textContent="O Portal ainda não registra pedidos automáticos. Esta mensagem só será enviada quando você confirmar no WhatsApp. Serviços, estoque, valores e agendamentos dependem do retorno da PD.";
    const summary=document.createElement("pre");
    summary.textContent=lines.join("\n");
    summary.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;background:#07120a;border:1px solid #385e42;"
      +"padding:15px;font:13px/1.65 Arial,sans-serif";
    const link=document.createElement("a");
    link.href=wa(greeting+"\n\n"+lines.join("\n"));link.target="_blank";
    link.rel="noopener noreferrer";link.textContent="ABRIR MENSAGEM NO WHATSAPP →";
    link.style.cssText="display:block;margin:18px 0;padding:14px;background:#21603a;"
      +"color:#fff;text-align:center;border-radius:5px;text-decoration:none;font-weight:bold";
    const close=document.createElement("button");
    close.type="button";close.textContent="EDITAR DADOS";
    close.style.cssText="padding:10px 0;color:#f2fff5;text-decoration:underline;cursor:pointer;"
      +"background:transparent;border:0";
    close.addEventListener("click",()=>dialog.close());
    dialog.addEventListener("close",()=>{dialog.remove();visibleDialog=null;});
    dialog.append(heading,note,summary,link,close);document.body.append(dialog);
    if(dialog.showModal)dialog.showModal();else dialog.setAttribute("open","");
  }

  const finalButtons=slug==="02-atendimento-v5"?"#submitButton":
    ["07-orcamento-empresarial-v2","08-loja-rapida-v2","09-parcerias-v2"].includes(slug)?"#reviewBtn":
    slug==="13-chamado-empresarial-v2"?".primary":"";
  const errorBox=document.createElement("p");
  errorBox.setAttribute("role","alert");errorBox.setAttribute("aria-live","assertive");
  errorBox.style.cssText="color:#ffcfbd;font:700 13px/1.5 Arial,sans-serif;margin:12px 0";
  const target=finalButtons?document.querySelector(finalButtons):null;
  if(target)target.before(errorBox);
  function handleFinal(event){
    if(event){event.preventDefault();event.stopImmediatePropagation();}
    const r=review();
    if(r.error){errorBox.textContent=r.error;r.element?.focus?.();return;}
    errorBox.textContent="";
    showDialog(r.lines);
  }
  if(target)document.addEventListener("click",(event)=>{
    if(event.target.closest?.(finalButtons)===target)handleFinal(event);
  },true);
  // Impede que formulários estáticos anunciem protocolo sem persistência.
  document.addEventListener("submit",event=>{
    event.preventDefault();event.stopImmediatePropagation();handleFinal(null);
  },true);

  const floating=document.createElement("a");
  floating.href=contact;floating.target="_blank";floating.rel="noopener noreferrer";
  floating.textContent="FALAR COM A PD ↗";floating.setAttribute("aria-label","Falar com a PD pelo WhatsApp");
  floating.style.cssText="position:fixed;z-index:1000;bottom:16px;right:16px;padding:14px 17px;"
    +"color:#f2fff5;background:#174629;border:1px solid #79d497;border-radius:8px;"
    +"font:700 12px Arial,sans-serif;letter-spacing:.04em;text-decoration:none;"
    +"box-shadow:0 12px 28px #0009";
  document.body.append(floating);
})();
