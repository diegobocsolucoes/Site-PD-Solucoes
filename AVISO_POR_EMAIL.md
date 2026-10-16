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
