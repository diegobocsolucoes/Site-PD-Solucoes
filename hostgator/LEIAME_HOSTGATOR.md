# PD Soluções Digitais — publicação na HostGator (tudo em um lugar)

Este pacote contém **o site, o formulário que grava os pedidos, o Painel PD e o aviso por e-mail**, tudo na mesma hospedagem.
Domínio deste pacote: **{{DOMINIO}}** · Os avisos chegam em: **{{EMAIL}}**

## O que contratar
- Plano de **Hospedagem de Sites** da HostGator com **cPanel**, PHP 8 e MySQL (qualquer plano "P" ou superior serve) e **SSL gratuito** (Let's Encrypt/AutoSSL).
- Domínio (.com.br ou .com). A HostGator costuma dar o primeiro ano junto com o plano.

## Passo a passo (cerca de 20 minutos)
1. **Entre no cPanel** (link e senha vêm no e-mail de boas-vindas da HostGator).
2. **SSL**: em *SSL/TLS Status* confirme que `{{DOMINIO}}` e `www.{{DOMINIO}}` estão com cadeado (rode *Run AutoSSL* se faltar).
3. **PHP**: em *Selecionar Versão do PHP*, escolha **8.1 ou superior** e confirme que estão marcadas as extensões `pdo_mysql`, `mbstring`, `gd` (ou `imagick`).
4. **Banco de dados**: em *Bancos de Dados MySQL*:
   - crie um banco (ex.: `pd`), um usuário e uma senha forte;
   - em "Adicionar usuário ao banco", dê **TODOS OS PRIVILÉGIOS**;
   - anote o nome completo do banco e do usuário (a HostGator coloca um prefixo, ex.: `conta_pd`).
5. **Enviar os arquivos** (*Gerenciador de Arquivos*):
   - Na pasta inicial (a que contém `public_html`) clique em *Carregar* e envie **pd-hostgator.zip**; clique com o botão direito → *Extract*.
   - O zip cria duas pastas: `public_html` (o site) e `pd-privado` (senhas e configurações — **fica fora do site público, não mova**).
   - Se a extração criar uma pasta extra, mova o conteúdo para que fique assim:
     ```
     /home/SEU_USUARIO/public_html/   ← site, api, painel, uploads, instalar.php
     /home/SEU_USUARIO/pd-privado/    ← config.php, sessoes
     ```
   - Ative *Configurações → Mostrar arquivos ocultos* (para ver os `.htaccess`).
6. **Configurar o banco**: abra `pd-privado/config.php` (botão *Editar*) e preencha só as 3 linhas do bloco `db`:
   `dbname=` (nome do banco), `usuario` e `senha`. Salve.
7. **Instalar**: abra `https://{{DOMINIO}}/instalar.php`.
   - Código de instalação: `{{TOKEN}}` (o mesmo que está no `config.php`).
   - Escolha seu **usuário** e uma **senha de 12+ caracteres**.
   - A tela mostra uma **chave do autenticador**. No celular, abra o Google Authenticator / Microsoft Authenticator / Authy → *Inserir chave de configuração* → cole a chave. **Ela só aparece uma vez.**
8. **Apague `public_html/instalar.php`** no Gerenciador de Arquivos.
9. **Entre no painel**: `https://{{DOMINIO}}/painel/` com usuário, senha e o código de 6 dígitos do celular.
10. **E-mail de aviso**: em *Contas de E-mail* crie `avisos@{{DOMINIO}}` (é o remetente dos avisos; sem ele alguns provedores mandam para o spam). Em *Entregabilidade de e-mail* confirme que SPF e DKIM estão "válidos".
11. **Teste de ponta a ponta**: no site, envie uma solicitação de teste. Ela deve aparecer em *Painel PD → SOLICITAÇÕES* e um e-mail deve chegar em {{EMAIL}} (olhe também o spam na primeira vez).

## Usando o painel
- **SOLICITAÇÕES / OUTROS PEDIDOS**: lista com busca, botão do WhatsApp do cliente e mudança de status.
- **LOJA RÁPIDA — PRODUTOS**: cadastre nome, categoria, preço (vazio = "A CONFIRMAR"), estoque, status e foto. *OCULTAR* tira da loja sem apagar; *EXCLUIR* apaga de vez. Enquanto não houver produto, o site mostra "Catálogo em montagem".

## Fotos novas do site
As imagens antigas do catálogo/home foram perdidas; coloque as novas em `public_html/assets/` com os mesmos nomes (formato `.webp`).

## Segurança já incluída
- Pedidos só são aceitos vindos do seu domínio; campo-isca anti-robô e limite de envios por pessoa.
- Senha com hash forte, **segundo fator obrigatório**, bloqueio após 5 tentativas erradas, sessão que expira.
- Banco com consultas preparadas; fotos validadas pelo conteúdo e proibidas de executar código.
- `pd-privado` fora do site; `instalar.php` trava depois do uso.
- Opcional: ative o **Cloudflare Turnstile** (grátis) gerando as chaves e refazendo o pacote com `--turnstile-site` e `--turnstile-segredo`.

## Perdeu o celular ou a senha?
Apague `pd-privado/instalado.lock`, envie de novo `instalar.php` (do pacote) e refaça o passo 7 com o mesmo usuário — ele troca a senha e gera nova chave.

## Backup
O cPanel tem *Backup* (baixe uma cópia completa do banco e de `public_html/uploads` de tempos em tempos).

## Limitações honestas
- O envio de e-mail usa o `mail()` da própria HostGator. Costuma funcionar bem com `avisos@{{DOMINIO}}` criado, mas se algum aviso não chegar, o pedido **continua salvo no painel** (o painel mostra "Aviso por e-mail: não enviado").
- Não há pagamento online nem reserva automática de estoque (como já era no site).
