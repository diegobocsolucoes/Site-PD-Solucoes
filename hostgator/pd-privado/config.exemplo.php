<?php
/*
 * Configuração privada da PD Soluções Digitais.
 * Esta pasta (pd-privado) fica FORA de public_html: o navegador nunca acessa estes dados.
 * Copie para config.php e preencha os campos marcados com PREENCHER.
 */
return [
    // MySQL criado no cPanel (Bancos de Dados MySQL). Use o nome completo, com o prefixo da sua conta.
    'db' => [
        'dsn'     => 'mysql:host=localhost;dbname=PREENCHER_banco;charset=utf8mb4',
        'usuario' => 'PREENCHER_usuario',
        'senha'   => 'PREENCHER_senha',
    ],
    // Domínios que podem enviar formulários e entrar no painel.
    'hosts' => ['{{DOMINIO}}', 'www.{{DOMINIO}}'],
    // Textos aleatórios longos (já gerados no pacote). Não compartilhe.
    'sal' => '{{SAL}}',
    'instalacao_token' => '{{TOKEN}}',
    // Onde chegam os avisos de novos pedidos. O remetente deve ser um e-mail do seu domínio.
    'aviso' => [
        'para' => '{{EMAIL_AVISO}}',
        'de'   => 'avisos@{{DOMINIO}}',
        'nome' => 'PD Soluções Digitais',
        'modo' => 'mail',
    ],
    // Opcional: chave SECRETA do Cloudflare Turnstile (antirrobô). Deixe vazio para desligar.
    'turnstile_segredo' => '',
    // Use true somente se o site estiver atrás de um proxy (ex.: Cloudflare) que informa o IP real.
    'confiar_proxy' => false,
    'sessoes' => __DIR__ . '/sessoes',
    'dir_privado' => __DIR__,
];
