# Fase 5 — API de solicitações no Supabase (homologação)

Branch: fase5-api-supabase-homologacao. Projeto: PD Soluções Digitais — Homologação.

## Entrega
API para atendimento particular (PD-SV) e orçamento particular (PD-OR),
reutilizando a função SQL pd_criar_solicitacao e as tabelas privadas já existentes.
O endpoint exige origem autorizada, Turnstile real, validação e limite de 3 pedidos
em 30 minutos por HMAC de IP. Não salva IP bruto nem devolve número completo.

## Segredos pendentes
No painel do Supabase, em Edge Functions > Secrets, configurar:
- TURNSTILE_SECRET_KEY: segredo REAL do Cloudflare Turnstile para diegobocsolucoes.github.io;
- PD_RATE_LIMIT_SALT: cadeia aleatória secreta de no mínimo 24 caracteres;
- Opcional: PD_ALLOWED_ORIGIN e PD_TURNSTILE_HOSTNAME para domínio próprio.
Os segredos predefinidos SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar
disponíveis no Edge Runtime. Jamais inseri-los no JavaScript público ou no GitHub.

## Operação
O endpoint GET /health informa ativo:false enquanto faltarem segredos.
Todos os POSTs são rejeitados com HTTP 503 nesse estado, sem registro de pedidos.
Depois de configurar segredos, testar dados fictícios, captcha, origem, rate limit,
confirmação PD-SV e PD-OR, privacidade e histórico antes de ligar o site oficial.

URL de diagnóstico:
https://lpalswuyhgupcgiycibt.supabase.co/functions/v1/solicitacoes-publicas/health

verify_jwt=false somente nesta função de atendimento público sem login,
que implementa verificação Turnstile obrigatória ANTES do acesso privilegiado.
O Painel PD continua privado, com MFA no projeto Next.js separado.

Limitação: o site oficial permanece em funcionamento via WhatsApp até 
que a configuração Cloudflare esteja concluída e os testes end-to-end passem.
Vercel ainda sem projeto; esta função evita dependência de hospedagem Next.js
para o fluxo básico de solicitação.
