/* Portal oficial estático: envia os formulários ao portal (que avisa a PD por e-mail); sem API configurada, abre o WhatsApp. */
(() => {
  "use strict";
  const script=document.currentScript;
  const base=new URL(".",script.src);
  const phone="5531995483280";
  // Endereço do portal (Vercel) que recebe os formulários e avisa a PD por e-mail.
  // Vazio = envio automático desligado; o site segue abrindo o WhatsApp.
  const API_URL="";
  // Chave pública do Cloudflare Turnstile (antirrobô). Obrigatória no servidor em produção.
  const TURNSTILE_KEY="";
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
        img.style.display="none";
        const box=img.closest(".product-img,.product-float");
        if(box)box.classList.add("pd-sem-foto");
        return;
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
  if(slug==="08-loja-rapida-v2"&&API_URL){
    // Catálogo vivo: lê os produtos publicados no Painel PD (somente campos públicos).
    const ROT={disponivel:["ok","Disponível"],poucas_unidades:["low","Poucas unidades"],indisponivel:["off","Indisponível"]};
    const grid=document.getElementById("products"),filtros=document.getElementById("filters");
    const sel=document.getElementById("productSelect"),vazio=document.getElementById("catalogEmpty");
    const dinheiro=c=>c===null||c===undefined?"A CONFIRMAR":new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(c/100);
    const el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n;};
    fetch(API_URL.replace(/\/$/,"")+"/api/produtos",{headers:{Accept:"application/json"}})
      .then(r=>r.ok?r.json():Promise.reject(new Error("catalogo")))
      .then(({produtos})=>{
        if(!grid||!Array.isArray(produtos)||!produtos.length)return;
        vazio?.remove();
        const cards=[];
        produtos.forEach(p=>{
          const [cls,rot]=ROT[p.status]||ROT.indisponivel;
          const card=el("article","product");card.dataset.cat=p.categoria;
          const img=el("div","product-img");
          img.append(el("span","status "+cls,rot));
          if(p.foto_url){const i=document.createElement("img");i.src=new URL(p.foto_url,API_URL).href;i.alt=p.nome;i.loading="lazy";img.append(i);}
          const body=el("div","product-body");
          const linha=el("div","price-row"),bloco=document.createElement("div");
          bloco.append(el("span","price-label","Valor atual"),el("span","price",dinheiro(p.preco_centavos)));
          const b=el("button","reserve","Consultar →");b.type="button";
          if(p.status==="indisponivel")b.disabled=true;
          b.addEventListener("click",()=>{if(sel){sel.value=p.nome;}document.getElementById("reserva")?.scrollIntoView({behavior:"smooth",block:"start"});});
          linha.append(bloco,b);
          body.append(el("h3","",p.nome),el("div","product-desc",p.descricao||""),linha);
          card.append(img,body);grid.append(card);cards.push(card);
          if(sel){const o=document.createElement("option");o.value=p.nome;o.textContent=p.nome;sel.insertBefore(o,sel.options[sel.options.length-1]);}
        });
        document.querySelectorAll(".catalog-head p").forEach(x=>{x.textContent="Valores e disponibilidade são confirmados pelo WhatsApp. Não há reserva ou pagamento automático.";});
        if(filtros){
          const cats=[...new Set(produtos.map(p=>p.categoria))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
          if(cats.length>1)["TODOS",...cats].forEach((c,i)=>{
            const f=el("button","filter"+(i?"":" active"),c);f.type="button";
            f.addEventListener("click",()=>{filtros.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));f.classList.add("active");
              cards.forEach(k=>{k.style.display=(i===0||k.dataset.cat===c)?"flex":"none";});});
            filtros.append(f);
          });
        }
      }).catch(()=>{/* mantém "catálogo em montagem" */});
  }else if(slug==="08-loja-rapida-v2"){
    document.querySelectorAll(".product .status").forEach(el=>el.textContent="Sob consulta");
    document.querySelectorAll(".product .price").forEach(el=>el.textContent="A confirmar");
    document.querySelectorAll(".product .price-label").forEach(el=>el.textContent="Valor atual");
    document.querySelectorAll(".product .reserve").forEach(el=>el.textContent="Consultar →");
    document.querySelectorAll(".catalog-head p").forEach(el=>{
      el.textContent="Catálogo em montagem. Consulte itens, valores e disponibilidade pelo WhatsApp. Não há reserva ou pagamento automático.";
    });
  }

  // Entrada manual de CEP: o layout aprovado mostra um marcador mas não
  // inclui um campo editável. Não calcular cobertura ou agendamento.
  let cepInput;
  if(slug==="02-atendimento-v5"){
    const grid=document.querySelector(".attendance-grid");
    if(grid){
      const label=document.createElement("label");
      label.textContent="CEP para atendimento no endereço (a cobertura será confirmada)";
      label.style.cssText="display:block;margin:12px 0;color:#b9e2c2;font:700 12px Arial,sans-serif";
      cepInput=document.createElement("input");
      cepInput.type="text";cepInput.inputMode="numeric";cepInput.maxLength=9;
      cepInput.placeholder="00000-000";cepInput.autocomplete="postal-code";
      cepInput.style.cssText="display:block;width:min(100%,250px);margin-top:7px;padding:12px;"
        +"background:#0b1910;border:1px solid #79d497;border-radius:6px;color:#f4fff5;font:15px Arial";
      label.append(cepInput);
      grid.after(label);
      // A caixa "Digite seu CEP" do cartão é só desenho (fica dentro de um botão).
      // Ao tocar nela, o foco vai para o campo real e o texto digitado aparece no cartão.
      const caixa=document.querySelector(".cep-box"),rotulo=caixa?.querySelector("span");
      cepInput.addEventListener("input",()=>{
        const d=cepInput.value.replace(/\D/g,"").slice(0,8);
        cepInput.value=d.length>5?d.slice(0,5)+"-"+d.slice(5):d;
        if(rotulo)rotulo.textContent=cepInput.value||"Digite seu CEP";
      });
      if(caixa){
        caixa.style.cursor="text";
        caixa.addEventListener("click",()=>setTimeout(()=>{label.hidden=false;label.scrollIntoView({block:"center",behavior:"smooth"});cepInput.focus();},0));
      }
      const refresh=()=>label.hidden=!document.querySelector(".attendance.selected")?.textContent?.toLowerCase().includes("no seu endereço");
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
      const nome=required('input[placeholder="Digite seu nome completo"]',"seu nome");
      const numero=number('input[placeholder="(31) 9 0000-0000"]');
      const service=document.querySelector(".problem.selected");
      if(!result.error&&!service){result.error="Selecione um serviço.";result.element=document.querySelector(".problem");}
      const descricao=required("textarea","a descrição do problema (mínimo 10 caracteres)",10);
      const equip=selected('[data-group="equip"].selected b')||"A confirmar";
      const presencial=norm(selected(".attendance.selected")).includes("no seu endereco");
      const cep=digits(cepInput?.value||"");
      if(!result.error&&presencial&&cep.length!==8){result.error="Informe um CEP válido com 8 números.";result.element=cepInput;}
      const tipo=document.querySelector('[data-request-mode="quote"].selected')?"Orçamento particular":"Atendimento particular";
      result.endpoint="/api/solicitacoes";
      result.payload={tipo:tipo.startsWith("ORÇAMENTO")?"orcamento":"servico",nome,whatsapp:numero,
        equipamento:norm(equip),servico:service?.dataset.service||"",
        modalidade:presencial?"presencial":"entrega",descricao,cep};
      result.lines=[tipo,"Nome: "+nome,"Meu WhatsApp: "+numero,"Equipamento: "+equip,
        "Serviço: "+(service?.dataset.service||"A confirmar"),
        "Problema: "+descricao,"Modalidade: "+(presencial?"Atendimento no endereço":"Entrega agendada"),
        ...(presencial?["CEP: "+cep]:[])];
    }else if(slug==="07-orcamento-empresarial-v2"){
      const empresa=required('input[placeholder="Nome da empresa"]',"o nome da empresa");
      const responsavel=required('input[placeholder="Seu nome"]',"o nome do responsável");
      const numero=number('input[placeholder="(31) 9xxxx-xxxx"]');
      const local=required('input[placeholder="Informe a localização da empresa"]',"a localização da empresa");
      const descricao=required("textarea","a descrição da necessidade (mínimo 10 caracteres)",10);
      const areas=[...document.querySelectorAll(".choice.active")].map(el=>tidy(el.textContent,70));
      result.endpoint="/api/contatos";result.payload={assunto:"orcamento-empresarial",nome:responsavel,whatsapp:numero};
      result.lines=["Orçamento empresarial","Empresa: "+empresa,"Responsável: "+responsavel,
        "Meu WhatsApp: "+numero,"Localização: "+local,
        "Áreas: "+(areas.join("; ")||"A confirmar"),"Necessidade: "+descricao];
    }else if(slug==="09-parcerias-v2"){
      const empresa=required('input[placeholder="Nome da empresa"]',"o nome da empresa");
      const responsavel=required('input[placeholder="Nome do responsável"]',"o responsável");
      const numero=number('input[placeholder="(31) 9xxxx-xxxx"]');
      const email=required('input[placeholder="SEU@EMAIL.COM"]',"o e-mail de contato",5);
      const select=document.querySelector(".field-grid select");
      result.endpoint="/api/contatos";result.payload={assunto:"parceria",nome:responsavel,whatsapp:numero};
      result.lines=["Proposta de parceria (sujeita à análise)",
        "Empresa: "+empresa,"Responsável: "+responsavel,"Meu WhatsApp: "+numero,
        "E-mail: "+email,"Segmento: "+(select?.value||"A confirmar"),
        "Descrição: "+(val("textarea")||"A combinar")];
    }else if(slug==="08-loja-rapida-v2"){
      const nome=required('input[placeholder="Seu nome"]',"seu nome");
      const numero=number('input[placeholder="(31) 9xxxx-xxxx"]');
      const produto=val("#productSelect");
      if(!result.error&&!produto){result.error="Selecione um produto.";result.element=document.getElementById("productSelect");}
      const selects=[...document.querySelectorAll(".field-grid select")];
      result.endpoint="/api/contatos";result.payload={assunto:"loja-rapida",nome,whatsapp:numero};
      result.lines=["Consulta de produto (não é reserva confirmada)",
        "Nome: "+nome,"Meu WhatsApp: "+numero,"Produto: "+produto,
        "Quantidade: "+(selects[1]?.value||"A confirmar"),
        "Recebimento: "+(selects[2]?.value||"A combinar"),
        "Localização: "+(val('input[placeholder="Informe sua localização"]')||"A combinar"),
        "Observações: "+(val("textarea")||"NENHUMA")];
    }else if(slug==="13-chamado-empresarial-v2"){
      const empresa=required('input[placeholder="Nome da empresa"]',"a empresa");
      const responsavel=required('input[placeholder="Nome do responsável"]',"o responsável");
      const numero=number('input[placeholder="(31) 9 0000-0000"]');
      const servico=document.querySelector('[data-choice-group="service"] .selected');
      if(!result.error&&!servico){result.error="Selecione o serviço desejado.";result.element=document.querySelector('[data-choice-group="service"] button');}
      const descricao=required("textarea","a descrição do problema (mínimo 10 caracteres)",10);
      const groups=["plan","equip","service","impact","mode"];
      result.endpoint="/api/contatos";result.payload={assunto:"chamado-empresarial",nome:responsavel,whatsapp:numero};
      result.lines=["Chamado empresarial (sujeito à confirmação)",
        "Empresa: "+empresa,"Responsável: "+responsavel,"Meu WhatsApp: "+numero,
        ...groups.map(k=>k.toUpperCase()+": "+(
          document.querySelector('[data-choice-group="'+k+'"] .selected')?.dataset.value||"A confirmar")),
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
    heading.textContent="Revise sua mensagem";heading.style.cssText="font-size:22px;color:#9be5ae";
    const note=document.createElement("p");
    note.textContent="O Portal ainda não registra pedidos automáticos. Esta mensagem só será enviada quando você confirmar no WhatsApp. Serviços, estoque, valores e agendamentos dependem do retorno da PD.";
    const summary=document.createElement("pre");
    summary.textContent=lines.join("\n");
    summary.style.cssText="white-space:pre-wrap;overflow-wrap:anywhere;background:#07120a;border:1px solid #385e42;"
      +"padding:15px;font:13px/1.65 Arial,sans-serif";
    const link=document.createElement("a");
    link.href=wa(greeting+"\n\n"+lines.join("\n"));link.target="_blank";
    link.rel="noopener noreferrer";link.textContent="Abrir mensagem no WhatsApp →";
    link.style.cssText="display:block;margin:18px 0;padding:14px;background:#21603a;"
      +"color:#fff;text-align:center;border-radius:5px;text-decoration:none;font-weight:bold";
    const close=document.createElement("button");
    close.type="button";close.textContent="Editar dados";
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
  let turnstileToken="";
  if(API_URL&&TURNSTILE_KEY&&target){
    const box=document.createElement("div");box.setAttribute("aria-label","Verificação de segurança");
    target.before(box);
    const lib=document.createElement("script");
    lib.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    lib.async=true;lib.defer=true;
    lib.addEventListener("load",()=>window.turnstile?.render(box,{sitekey:TURNSTILE_KEY,theme:"dark",
      callback:t=>{turnstileToken=t;},"expired-callback":()=>{turnstileToken="";}}));
    document.head.append(lib);
  }
  // Campo-isca invisível: robôs preenchem, pessoas não.
  const trap=document.createElement("input");
  trap.type="text";trap.name="site_url";trap.autocomplete="off";trap.tabIndex=-1;
  trap.setAttribute("aria-hidden","true");trap.style.cssText="position:absolute;left:-9999px";
  if(target)target.after(trap);

  function showReceived(protocolo){
    visibleDialog?.remove();
    const dialog=document.createElement("dialog");visibleDialog=dialog;
    dialog.setAttribute("aria-label","Solicitação recebida");
    dialog.style.cssText="max-width:min(94vw,520px);width:100%;border:1px solid #79d497;border-radius:9px;"
      +"background:#101a13;color:#f2fff5;padding:28px;box-shadow:0 25px 70px #000c;font:14px/1.6 Arial,sans-serif";
    const h=document.createElement("h2");h.textContent="SOLICITAÇÃO RECEBIDA";h.style.cssText="font-size:22px;color:#9be5ae";
    const proto=document.createElement("p");proto.textContent="PROTOCOLO: "+protocolo;proto.style.cssText="font-weight:bold;font-size:17px";
    const msg=document.createElement("p");
    msg.textContent="A PD recebeu o seu pedido e retorna pelo WhatsApp informado para confirmar valores, disponibilidade e agendamento. Guarde o protocolo.";
    const ok=document.createElement("button");ok.type="button";ok.textContent="FECHAR";
    ok.style.cssText="margin-top:14px;padding:13px 22px;background:#21603a;color:#fff;border:0;border-radius:5px;font-weight:bold;cursor:pointer";
    ok.addEventListener("click",()=>{dialog.close();location.assign(new URL("index.html",base).href);});
    dialog.addEventListener("close",()=>{dialog.remove();visibleDialog=null;});
    dialog.append(h,proto,msg,ok);document.body.append(dialog);
    if(dialog.showModal)dialog.showModal();else dialog.setAttribute("open","");
  }
  let enviando=false;
  async function enviar(r){
    if(enviando)return;
    if(TURNSTILE_KEY&&!turnstileToken){errorBox.textContent="Conclua a verificação de segurança.";return;}
    enviando=true;errorBox.textContent="Enviando solicitação...";
    try{
      const body=r.endpoint==="/api/contatos"
        ?{...r.payload,linhas:r.lines,site_url:trap.value,turnstileToken}
        :{...r.payload,site_url:trap.value,turnstileToken};
      const resposta=await fetch(API_URL.replace(/\/$/,"")+r.endpoint,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const dados=await resposta.json().catch(()=>({}));
      if(!resposta.ok||!dados.protocolo)throw new Error(dados.erro||"Não foi possível enviar agora.");
      errorBox.textContent="";showReceived(dados.protocolo);
    }catch(erro){
      errorBox.textContent=(erro instanceof Error?erro.message:"Não foi possível enviar agora.")
        +" Tente novamente ou use o botão FALAR COM A PD.";
      window.turnstile?.reset?.();turnstileToken="";
    }finally{enviando=false;}
  }
  function handleFinal(event){
    if(event){event.preventDefault();event.stopImmediatePropagation();}
    const r=review();
    if(r.error){errorBox.textContent=r.error;r.element?.focus?.();return;}
    errorBox.textContent="";
    if(API_URL&&r.endpoint)enviar(r);else showDialog(r.lines);
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
  floating.textContent="Falar com a PD ↗";floating.setAttribute("aria-label","Falar com a PD pelo WhatsApp");
  floating.style.cssText="position:fixed;z-index:1000;bottom:16px;right:16px;padding:14px 17px;"
    +"color:#f2fff5;background:#174629;border:1px solid #79d497;border-radius:8px;"
    +"font:700 12px Arial,sans-serif;letter-spacing:.04em;text-decoration:none;"
    +"box-shadow:0 12px 28px #0009";
  document.body.append(floating);
})();
