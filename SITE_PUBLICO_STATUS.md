# Publicação oficial — refinamentos em andamento

## Fonte de verdade
- Design aprovado: `portal-ui-final` e pacote `portal-ui-consolidado`, com Home V15 e demais telas públicas V5/V2/V3.
- O site estático oficial é publicado da `main` pelo GitHub Pages.
- A implementação full stack de formulários e Painel PD permanece isolada em `fase3-formularios-protocolos`, sem exposição das chaves privadas.
- O banco Supabase de homologação está provisionado e a migração `pd_solicitacoes_homologacao` foi aplicada. Isso não torna a versão estática um portal de protocolos.

## Refinamento de 26/09/2026
- Recuperada a fotografia **original** da Home V15 a partir de `preview-v15/assets/scene-v15-1.b64` e `scene-v15-2.b64` (a página original `preview-v15/index.html` referenciava as duas partes).
- Inseridos links acessíveis de navegação no rodapé e retorno à área de empresas.
- Criada uma página de privacidade e contato para esclarecer a operação do site estático.
- Botões finais de atendimento, orçamento empresarial, chamado empresarial, parcerias e Loja Rápida preparam uma mensagem contextual que o cliente revisa e abre voluntariamente no WhatsApp. Nenhum protocolo, agendamento ou confirmação de estoque é gerado sem backend.
- O catálogo público deixou de mostrar preços ilustrativos e disponibilidade fictícia. O conteúdo permanece demonstrativo enquanto a Loja Rápida dinâmica não estiver integrada ao Painel PD.
- O workflow de implantação testa imagens originais presentes, 15 telas públicas, privacidade, rotas públicas e impede cópia das telas administrativas estáticas.

## Pendências mantidas
- A Issue #2 descreve imagens restantes em falta; não substituir fotos aprovadas por imagens novas não autorizadas. O fallback usa apenas o fundo institucional existente.
- Implementar e implantar a versão Next.js em hospedagem que execute API Routes, com ambiente de preview, Turnstile, segredos no servidor e ligação ao Supabase; Vercel ainda sem projeto criado.
- Confirmar segurança e fluxo de solicitação real antes de migrar o atendimento público para o backend.
