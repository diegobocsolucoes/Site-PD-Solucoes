// O site estático (GitHub Pages) chama a API de outro domínio: libera só a origem oficial.
export function origemPermitida(request: Request): string {
  return process.env.PD_SITE_ORIGIN || new URL(request.url).origin;
}

export function cabecalhosCors(origem: string | null, permitida: string): Record<string,string> {
  const h: Record<string,string> = {"Cache-Control":"no-store", "Vary":"Origin"};
  if (origem && origem === permitida) {
    h["Access-Control-Allow-Origin"] = permitida;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "600";
  }
  return h;
}
