# Painel PD — Produtos da Loja Rápida

Branch: `painel-produtos`, derivada de `fase3-formularios-protocolos`. A `main` e o site publicado não foram alterados.

## O que existe

- **`/painel` > aba "LOJA RÁPIDA — PRODUTOS"** (mesma entrada com e-mail, senha e autenticador da fila de solicitações). Permite:
  cadastrar produto, editar, alterar preço, estoque, categoria, descrição, status (Disponível / Poucas unidades / Indisponível), destaque e ordem, enviar/trocar/remover a foto, **ocultar sem excluir**, excluir, e ver a prévia de como o cartão aparece na loja.
- **Loja Rápida pública** (`/telas/screens/08-loja-rapida-v2/`): lê os produtos ativos em `GET /api/produtos`. Os filtros por categoria e a lista do formulário são montados a partir dos produtos cadastrados.
- **Sem produtos cadastrados** (ou sem banco configurado): a loja mostra "CATÁLOGO EM MONTAGEM" com botão de WhatsApp, em vez dos produtos de exemplo do desenho.
- Preço em branco aparece como "A CONFIRMAR". O estoque exato e a observação interna **nunca** vão para a loja pública, só o status.

## Segurança

- Rotas `/api/admin/produtos` e `/api/admin/produtos/foto`: só o administrador (UUID em `PD_ADMIN_USER_ID`) com segundo fator (AAL2), mais conferência da origem nas alterações. Mesma barreira da fila de solicitações.
- Banco: tabela `pd_produtos` com RLS ligada e **nenhuma permissão** para `anon`/`authenticated`; só a API servidor (service_role). Checagens de tamanho, status, preço e formato do caminho da foto também no banco.
- Fotos: bucket `produtos` (leitura pública pelos links, gravação só pelo servidor). O servidor aceita WEBP/JPG/PNG até 2 MB e confere pelos primeiros bytes do arquivo, não pelo nome. O painel reduz a foto para no máximo 1000 px em WEBP antes de enviar.
- A loja pública monta os cartões com `textContent`, então nenhum texto digitado no painel vira HTML.

## Para ativar

1. Criar o projeto Supabase de **homologação** (a conta ainda não tem projeto; o Supabase mostra o custo antes de criar).
2. No SQL Editor, executar `supabase/migrations/202609260001_solicitacoes.sql` e depois `supabase/migrations/202610160001_produtos.sql` (este também cria o bucket de fotos).
3. Criar o usuário administrador e o autenticador, e publicar a pasta `portal/` na Vercel, conforme `FASE3_HOMOLOGACAO.md`. **Não há variáveis de ambiente novas.**
4. Testar com dados fictícios: cadastrar produto com foto, ocultar, mostrar, excluir, e conferir a loja pública.

## Testes feitos

- Banco: `supabase/tests/produtos-smoke.sql` (PostgreSQL 16): permissões, RLS, regras de validação, gatilho de atualização, migração repetível.
- `portal/tests/produto.test.ts`: validação, leitura de preço, formato da foto, campos que não podem vazar para a loja.
- Fluxo completo contra um **Supabase simulado** (não o real): segurança (sem login, sem 2º fator, origem errada), validação, cadastro, foto falsa recusada, troca de foto removendo a antiga, ocultar, excluir, e a tela do painel e a loja pública num navegador (14 verificações).
- **Ainda não testado contra um Supabase real**, nem o armazenamento de fotos real. Fazer na homologação.

## Limitações

- Uma foto principal por produto (fotos adicionais não implementadas).
- O formulário "Reservar produto" da loja continua sem enviar pedido nem gerar protocolo `PD-LJ`; hoje a loja só orienta o contato pelo WhatsApp.
- O site publicado no GitHub Pages é estático: a loja dinâmica e o painel só funcionam na hospedagem do Next.js.
