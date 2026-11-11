<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';

pd_exigir_metodo('POST');
if (!pd_origem_ok()) pd_falha(403, 'Origem não autorizada.');
if (!pd_limitar('login', 10, 900)) pd_falha(429, 'Muitas tentativas. Aguarde alguns minutos.');
$c = pd_ler_json(2048);
$usuario = is_string($c['usuario'] ?? null) ? trim($c['usuario']) : '';
$senha = is_string($c['senha'] ?? null) ? $c['senha'] : '';
if ($usuario === '' || $senha === '' || strlen($usuario) > 60 || strlen($senha) > 256) pd_falha(401, 'Usuário ou senha inválidos.');

$admin = pd_admin_buscar($usuario);
// Hash falso mantém o tempo de resposta igual quando o usuário não existe.
$hash = $admin['senha_hash'] ?? '$2y$10$.yzjaKgTGuH5rT0FP7Ww2uGE5u3EPwQ7GdBB451ZM2KQmVxEO8P9.';
$senhaOk = password_verify($senha, $hash);
if ($admin && pd_admin_bloqueado($admin)) { pd_auditar('login_bloqueado', '', 'Tentativa durante bloqueio', $usuario); pd_falha(429, 'Acesso bloqueado temporariamente por tentativas incorretas. Tente mais tarde.'); }
if (!$admin || !$senhaOk) {
    if ($admin) pd_admin_registrar_falha($admin);
    pd_auditar('login_falha', '', 'Senha incorreta' . ($admin ? '' : ' (usuário inexistente)'), substr($usuario, 0, 60));
    pd_falha(401, 'Usuário ou senha inválidos.');
}
pd_sessao_iniciar();
pd_sessao_promover('senha_ok', $admin['id']);
pd_json(['etapa' => 'totp']);
