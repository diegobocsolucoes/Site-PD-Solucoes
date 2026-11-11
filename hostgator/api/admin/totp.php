<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';

pd_exigir_metodo('POST');
if (!pd_origem_ok()) pd_falha(403, 'Origem não autorizada.');
pd_sessao_iniciar();
if (($_SESSION['etapa'] ?? '') !== 'senha_ok' || empty($_SESSION['admin_id'])) pd_falha(401, 'Entre com usuário e senha primeiro.');
$c = pd_ler_json(512);
$codigo = is_string($c['codigo'] ?? null) ? preg_replace('/\s+/', '', $c['codigo']) : '';

$q = pd_db()->prepare('SELECT * FROM pd_admin WHERE id = ?');
$q->execute([$_SESSION['admin_id']]);
$admin = $q->fetch();
if (!$admin) { pd_sessao_destruir(); pd_falha(401, 'Sessão inválida.'); }
if (pd_admin_bloqueado($admin)) { pd_sessao_destruir(); pd_falha(429, 'Acesso bloqueado temporariamente. Tente mais tarde.'); }

$passo = pd_totp_verificar($admin['totp_segredo'], (string)$codigo, (int)$admin['totp_ultimo_passo']);
if ($passo === null) {
    pd_admin_registrar_falha($admin);
    $depois = pd_admin_buscar($admin['usuario']);
    if ($depois && pd_admin_bloqueado($depois)) { pd_sessao_destruir(); pd_falha(429, 'Acesso bloqueado temporariamente. Tente mais tarde.'); }
    pd_auditar('login_falha_2fa', '', 'Código do autenticador incorreto', $admin['usuario'], $admin['id']);
    pd_falha(401, 'Código inválido ou já utilizado.');
}
pd_db()->prepare('UPDATE pd_admin SET totp_ultimo_passo = ? WHERE id = ?')->execute([$passo, $admin['id']]);
pd_admin_zerar_falhas($admin['id']);
pd_sessao_promover('aal2', $admin['id']);
pd_auditar('login', '', 'Entrada no painel', $admin['usuario'], $admin['id']);
pd_json(['autenticado' => true, 'csrf' => $_SESSION['csrf'], 'usuario' => $admin['usuario']]);
