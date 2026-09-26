# Guia de integração — Preview PD Soluções Digitais

## Branches de referência

- `portal-ui-final`: documentação de handoff e versões finais. Base desta branch.
- `portal-ui-consolidado`: pacote `approved-ui/` com fontes HTML/CSS aprovadas; incorporado a esta branch sem alterar as referências.
- `portal-ui-docs`: regras de navegação, negócio e atendimento.
- `main`: site público atual. Não substituir antes de revisar a prévia.

## Critérios obrigatórios

- Preservar visual aprovado: preto/grafite, verde PD, títulos em caixa alta, cards retangulares e logo original.
- Usar Home V15, Atendimento V5, Confirmação Universal V3 e demais versões de `final-ui/MANIFESTO.md`.
- Exceção atualizada: Painel Solicitações V2 substitui V1, conforme `approved-ui/manifest.json` e `docs/PAINEL_SOLICITACOES_V2_FINAL.md`.
- Reconstruir o pacote de fontes aprovadas com `sh approved-ui/bundle/rebuild.sh`; verificar o checksum antes de adaptar código.
- Não redesenhar HTML/CSS aprovado durante importação; validar visual antes de criar componentes e rotas.
- Formulários públicos: sem login e sem CPF, WhatsApp obrigatório, sem redirecionamento automático após envio.
- Protocolos no formato PREFIXO-ANO-XXXX; confirmação compartilhada V3 para todos os fluxos.
- Loja Rápida somente reserva; catálogo dinâmico pelo Painel PD.
- Painel administrativo privado separado, com autenticação forte e 2FA.

## Ordem de implementação

1. Verificar e extrair o bundle das telas finais.
2. Importar assets e estruturar as rotas, preservando o visual.
3. Implementar formulários, estados, validações e navegação.
4. Integrar Supabase, uploads, protocolos e Confirmação Universal V3.
5. Integrar Loja Rápida e Painel PD (Dashboard V2; Solicitações V2).
6. Testar desktop, tablet e mobile; revisar preview.
7. Somente após aprovação, preparar merge para `main` e atualizar publicação.

## Segurança

A nova branch utiliza versões de configuração sem valores de credenciais. Como cópias antigas permanecem no histórico e em outras branches públicas, substituir as credenciais antigas nos provedores e usar GitHub Actions Secrets nos fluxos autorizados.

## Etapa 2 — prévia navegável (26/09/2026)

- As 17 telas do bundle aprovado agora são reconstruídas, verificadas e versionadas em `approved-ui/sources-expanded/screens/` nesta branch.
- O script `scripts/montar_preview.py` gera `preview-dist/` sem redesenhar o HTML/CSS de referência.
- `index.html` da prévia abre a Home V15 e `mapa.html` permite revisar as 15 telas públicas e as 2 telas administrativas de demonstração.
- A navegação principal foi conectada na prévia: seis categorias da Home, serviços da área Empresas, entradas de Orçamento e escolhas de Consultoria. A entrada de orçamento particular ativa o modo orçamento no Atendimento V5.
- Os testes do GitHub Actions verificam SHA-256 do bundle, 17 páginas, presença da logo e sintaxe JavaScript. Os arquivos de revisão são disponibilizados como artefato `pd-portal-preview-navegavel`.
- **Ainda não é o site público definitivo:** o artefato navegável deve ser revisado antes de qualquer substituição da `main`. Formulários não enviam dados nem geram protocolos até a integração real do backend.
- **Assets originais pendentes:** 18 arquivos WebP distintos (incluindo as cenas, os heróis e fotos de produtos) não estão no pacote de fontes do GitHub; o build os lista no arquivo `relatorio-assets.json`. A logo PD existente foi reutilizada nas referências principais, inclusive na variante de nome `-2`, apenas como fallback na prévia.
- Não substituir as imagens aprovadas por outras imagens sem validação. Quando o pacote original estiver disponível, incorporar os WebP com os mesmos nomes no diretório `assets/` e regenerar a prévia.
