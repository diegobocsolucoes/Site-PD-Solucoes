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
