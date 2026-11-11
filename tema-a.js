/* Tema A: garante tamanho mínimo legível nos textos pequenos das telas internas (sem alterar estrutura). */
(() => {
  "use strict";
  const MIN = 13;
  const aplicar = (raiz) => {
    const alvo = (raiz.nodeType === 1 ? [raiz, ...raiz.querySelectorAll("*")] : []);
    for (const el of alvo) {
      if (el.closest("svg,script,style")) continue;
      const proprio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 3);
      if (!proprio) continue;
      const tam = parseFloat(getComputedStyle(el).fontSize);
      if (tam && tam < MIN) el.style.fontSize = MIN + "px";
    }
  };
  const iniciar = () => {
    aplicar(document.body);
    new MutationObserver((lista) => lista.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && aplicar(n))))
      .observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
