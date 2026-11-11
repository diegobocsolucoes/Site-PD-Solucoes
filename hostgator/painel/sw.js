/* Painel PD — recebe os avisos de novos pedidos. Sem cache offline: o painel sempre busca dados novos. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { texto: event.data ? event.data.text() : "" }; }
  const titulo = String(d.titulo || "Painel PD").slice(0, 100);
  const opcoes = {
    body: String(d.texto || "Você tem uma novidade no painel.").slice(0, 200),
    icon: "/painel/icone-192.png",
    badge: "/painel/icone-192.png",
    tag: String(d.tag || "pedido"),
    data: { url: "/painel/" },
  };
  event.waitUntil(self.registration.showNotification(titulo, opcoes));   // iOS exige mostrar sempre
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of abertas) {
      if (c.url.includes("/painel/") && "focus" in c) return c.focus();
    }
    return self.clients.openWindow("/painel/");
  })());
});
