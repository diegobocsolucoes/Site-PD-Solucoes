# Solicitações chegam no seu e-mail (sem abrir WhatsApp)

Quando o cliente envia um formulário, o servidor **grava o pedido no Supabase** (Painel PD) e **manda um e-mail** para você com todos os dados e um link "Responder no WhatsApp". O cliente recebe um número de protocolo na tela. Se o e-mail falhar, o pedido continua salvo no Painel.

## Rotas
| Rota | Formulários |
|---|---|
| `POST /api/solicitacoes` | Atendimento e orçamento particular (tela 02) |
| `POST /api/contatos` | Orçamento empresarial, chamado empresarial, parceria, loja rápida |

`/api/contatos` aceita chamadas só da origem `PD_SITE_ORIGIN` (CORS), exige Turnstile em produção, tem campo-isca anti-bot e limite de 5 envios por 30 min por visitante.

## O que configurar (variáveis de ambiente na Vercel)
| Variável | Valor |
|---|---|
| `RESEND_API_KEY` | chave criada em resend.com (grátis até 3.000 e-mails/mês) |
| `PD_NOTIFY_EMAIL` | seu e-mail (aceita vários, separados por vírgula) |
| `PD_NOTIFY_FROM` | remetente, ex.: `PD Soluções <avisos@seudominio.com.br>` (domínio verificado no Resend) |
| `PD_SITE_ORIGIN` | `https://diegobocsolucoes.github.io` (ou o domínio próprio) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PD_RATE_LIMIT_SALT`, `TURNSTILE_SECRET_KEY` | já documentadas em PAINEL_PRODUTOS.md |

Rode no SQL Editor do Supabase: `supabase/migrations/202610160002_contatos.sql` (depois das migrações anteriores).

## Testes
`supabase/tests/contatos-smoke.sql`, `portal/tests/contato.test.ts` e uma simulação ponta a ponta (CORS, origem errada, WhatsApp inválido, bot, limite, e-mail enviado com o conteúdo certo). Não testado com Supabase e Resend reais.

## Estado da configuração (16/10/2026)
- **Supabase:** projeto `PD Solucoes Digitais` (`fqjtjfgcnbjjmjkrmuty`, região sa-east-1) criado, com as migrações de solicitações, produtos e contatos aplicadas e acesso público bloqueado (verificado).
- **Pendente (exige o seu login):** projeto na Vercel, chave do Resend, chaves do Turnstile e a chave secreta do Supabase.

## Passo a passo da Vercel
1. vercel.com → Add New → Project → importar `diegobocsolucoes/Site-PD-Solucoes`.
2. Production Branch: `solicitacoes-por-email`. Root Directory: `portal`. Framework: Next.js.
3. Variáveis de ambiente:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_URL` | `https://fqjtjfgcnbjjmjkrmuty.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública "anon" (Supabase → Settings → API Keys) |
| `SUPABASE_SERVICE_ROLE_KEY` | chave **secreta** (service_role) — nunca no GitHub nem no chat |
| `PD_SITE_ORIGIN` | `https://diegobocsolucoes.github.io` |
| `PD_RATE_LIMIT_SALT` | texto aleatório com 32+ caracteres |
| `PD_ADMIN_USER_ID` | ID do seu usuário em Supabase → Authentication |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | chaves do Cloudflare Turnstile |
| `RESEND_API_KEY` | chave de envio do Resend |
| `PD_NOTIFY_EMAIL` | e-mail que recebe os avisos |
| `PD_NOTIFY_FROM` | `PD Soluções <onboarding@resend.dev>` (sem domínio próprio, o Resend só entrega ao e-mail da própria conta) |
