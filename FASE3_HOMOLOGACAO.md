# Fase 3 — Formulários, protocolos e fila administrativa

## Estado da implementação

- Branch: `fase3-formularios-protocolos`, derivada de `integracao-portal-preview`. A `main` continua com a publicação atual.
- A Home V15 e o Atendimento V5 são servidos a partir das fontes HTML/CSS aprovadas, sem redesenho; `portal/scripts/preparar-telas.mjs` prepara as 15 telas públicas no build Next.js.
- **Atendimento particular e orçamento particular** são o primeiro fluxo integrado à API. Outros 13 fluxos públicos permanecem na fase de referência/navegação, sem registro real.
- A Confirmação Universal V3 só exibe protocolo retornado pela API após inserção confirmada; não simula pedido em caso de falha. Resumo é passado na sessão temporária do navegador, sem dados pessoais na URL.
- API `POST /api/solicitacoes`: valida nome, WhatsApp, equipamento, serviço, modalidade, CEP quando presencial e descrição; exige captcha Turnstile e origem autorizada em produção, usa limite de 3 solicitações a cada 30 minutos por HMAC do IP.
- Supabase/PostgreSQL: tabela privada de solicitações, histórico de status, RLS ativa, função de inserção exclusiva para `service_role`, prefixos `PD-SV` e `PD-OR` com sequência atômica.
- `/painel`: primeira fila administrativa funcional, separada da tela visual V2 de referência. Exige autenticação Supabase e segundo fator TOTP (nível AAL2), verifica UID autorizado no servidor. CRUD de status é limitado à API protegida; dados públicos nunca recebem permissão de leitura na tabela.
- A migração e os testes rodam em PostgreSQL de teste no GitHub Actions. O workflow também testa validação TypeScript, lógica de formulários, sintaxe do runtime e build Next.js.

## Preparar o ambiente Supabase (pendente de conexão)

1. Conectar um projeto Supabase e executar `supabase/migrations/202609260001_solicitacoes.sql` **no projeto escolhido**, após revisar nomes/schema. Usar um projeto de homologação primeiro.
2. Criar um único usuário administrativo em Supabase Auth e configurar TOTP com aplicativo autenticador. No servidor, informar o UUID desse usuário em `PD_ADMIN_USER_ID`. O segundo fator é validado pelo endpoint privado.
3. No provedor do app Next.js, cadastrar as variáveis conforme `portal/.env.example`. Nunca publicar `SUPABASE_SERVICE_ROLE_KEY` nem o segredo Turnstile em arquivos, GitHub Pages ou código enviado ao navegador.
4. Criar Turnstile para o domínio e preencher `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY`. Cadastrar `PD_SITE_ORIGIN` com a origem exata (HTTPS); configurar o proxy confiável responsável por `x-forwarded-for`.
5. Publicar a pasta `portal/` em hospedagem que execute Next.js e suas API Routes (por exemplo Vercel), usando ambiente de **preview**. GitHub Pages serve apenas arquivos estáticos e não executa esta API.
6. Testar os fluxos com dados fictícios: serviço PD-SV, orçamento PD-OR, recusa de dados inválidos, bloqueio anti-spam, confirmação V3, login + TOTP, histórico de status e contato pelo WhatsApp. Não inserir dados reais de clientes antes de verificar privacidade, retenção e permissões.
7. Apenas após homologação, revisar o PR e discutir publicação do domínio definitivo. Nunca fazer merge automático em `main`.

## Limitações ainda abertas

- As 18 imagens WebP originais listadas na Issue #2 ainda precisam ser importadas. A logo versionada existe como fallback na preview.
- Cobertura presencial continua **sujeita à confirmação**, porque distância/rota, disponibilidade e preço de deslocamento ainda não são calculados pelo backend. CEP não é confirmação de cobertura.
- Os fluxos empresas, consultorias, segurança, loja e parcerias ainda não enviam solicitações. Não incluir promessas de agendamento automático, reserva ou cobrança online.
- O dashboard V2 e a tela Solicitações V2 aprovados permanecem como referências visuais; a fila funcional criada é uma camada inicial, não foi redesenhada para substituir a referência oficial.
- É necessário revogar/rotacionar credenciais antigas que ficaram em commits públicos. Esta branch não as reutiliza.
- Rate limiting por IP depende de cabeçalhos do proxy de confiança; proteger o app contra requisições diretas a origens alternativas e considerar Turnstile e limites no CDN.

## Arquivos

- `portal/app/api/solicitacoes/route.ts`
- `portal/app/api/admin/solicitacoes/route.ts`
- `portal/app/painel/page.tsx`
- `portal/public/pd-runtime.js`
- `portal/lib/solicitacao.ts`
- `portal/lib/supabase-server.ts`
- `supabase/migrations/202609260001_solicitacoes.sql`
- `supabase/tests/solicitacoes-smoke.sql`
- `.github/workflows/fase3-validar.yml`

## Conexões externas verificadas em 26/09/2026

- **Supabase:** conexão autorizada; existe a organização `PD SOLUCOES DIGITAIS`, mas a conta ainda não possui projetos. Não há banco remoto em que aplicar a migração neste momento. Criar um projeto exige escolher expressamente a organização e confirmar o custo exibido pelo Supabase antes da criação.
- **Vercel:** conexão autorizada; a equipe `pablosouza624-5415` foi localizada, mas ainda não há projetos hospedados. Não há prévia Next.js pública publicada por essa conta neste momento.
- **GitHub:** o build, os testes de TypeScript e os testes SQL/segurança da branch foram concluídos com sucesso; isso valida o código de desenvolvimento, **não equivale a um teste de ponta a ponta com o Supabase remoto**.

### Configuração de projeto Vercel quando houver banco de homologação

1. Importar o repositório `diegobocsolucoes/Site-PD-Solucoes` no Vercel.
2. Definir **Root Directory**: `portal`, **Framework Preset**: `Next.js`; manter o diretório pai com `approved-ui/sources-expanded/` disponível no clone completo.
3. Para preview, usar a branch `fase3-formularios-protocolos`. Não conectar a publicação principal de produção até homologar, nem apontar o deploy da branch `main` atual para esta aplicação sem revisão.
4. Definir as variáveis do arquivo `portal/.env.example` no ambiente **Preview**, separando chaves públicas e privadas. `SUPABASE_SERVICE_ROLE_KEY` e `TURNSTILE_SECRET_KEY` são exclusivamente de servidor.
5. Configurar `PD_SITE_ORIGIN` com a URL HTTPS exata do preview. Cada URL de preview variável exige estratégia explícita de origens autorizadas; não usar `*` nem aceitar qualquer origem.
6. Executar cenário de homologação com dados fictícios: envio de serviço/orçamento, consulta de protocolo, autenticação do administrador com TOTP e mudança de status.
7. Após confirmar funcionamento e autorização, considerar publicação definitiva. GitHub Pages não executa as rotas API do Next.js.

**Bloqueio atual:** sem projeto Supabase remoto e sem projeto Vercel, não é possível comprovar a recepção de solicitações reais na nuvem ou apresentar URL de preview funcional.
