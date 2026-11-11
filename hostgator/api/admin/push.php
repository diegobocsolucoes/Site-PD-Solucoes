<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';
require dirname(__DIR__) . '/inc/validar.php';
require dirname(__DIR__) . '/inc/produtos.php';
require dirname(__DIR__) . '/inc/push.php';

pd_exigir_metodo('GET', 'POST');
$metodo = $_SERVER['REQUEST_METHOD'];
$adminId = pd_exigir_admin($metodo === 'POST');
$pdo = pd_db();

function pd_endpoint_permitido(string $url): bool {
    $p = parse_url($url);
    if (!$p || ($p['scheme'] ?? '') !== 'https' || empty($p['host']) || isset($p['port']) || isset($p['user'])) return false;
    $h = strtolower($p['host']);
    foreach (['web.push.apple.com', 'push.apple.com', 'fcm.googleapis.com', 'android.googleapis.com',
              'push.services.mozilla.com', 'notify.windows.com'] as $ok) {
        if ($h === $ok || str_ends_with($h, '.' . $ok)) return true;
    }
    return false;
}
function pd_lista_aparelhos(PDO $pdo, string $adminId): array {
    $q = $pdo->prepare('SELECT id, agente, ultimo_ok, falhas, criado_em FROM pd_push WHERE admin_id = ? ORDER BY criado_em DESC');
    $q->execute([$adminId]);
    return $q->fetchAll();
}

if ($metodo === 'GET') {
    [, $publica] = pd_vapid_chaves();
    pd_json(['chave' => pd_b64u($publica), 'aparelhos' => pd_lista_aparelhos($pdo, $adminId)]);
}

$c = pd_ler_json(3000);
$acao = $c['acao'] ?? '';
if ($acao === 'inscrever') {
    $i = $c['inscricao'] ?? null;
    $ep = is_array($i) && is_string($i['endpoint'] ?? null) ? $i['endpoint'] : '';
    $p256 = is_array($i['keys'] ?? null) && is_string($i['keys']['p256dh'] ?? null) ? $i['keys']['p256dh'] : '';
    $auth = is_array($i['keys'] ?? null) && is_string($i['keys']['auth'] ?? null) ? $i['keys']['auth'] : '';
    if (strlen($ep) < 20 || strlen($ep) > 700 || !pd_endpoint_permitido($ep)) pd_falha(422, 'Este aparelho não é compatível com notificações.');
    if (strlen(pd_b64u_dec($p256)) !== 65 || strlen(pd_b64u_dec($auth)) !== 16) pd_falha(422, 'Inscrição inválida.');
    $agente = substr(pd_linha_segura(is_string($c['agente'] ?? null) ? $c['agente'] : ''), 0, 120);
    $hash = hash('sha256', $ep);
    $pdo->prepare('DELETE FROM pd_push WHERE endpoint_hash = ?')->execute([$hash]);
    $pdo->prepare('INSERT INTO pd_push (id, admin_id, endpoint, endpoint_hash, p256dh, auth, agente, falhas, ultimo_ok, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)')
        ->execute([pd_uuid(), $adminId, $ep, $hash, $p256, $auth, $agente, pd_agora()]);
    pd_auditar('push_ativar', $agente, 'Celular cadastrado para receber avisos');
    pd_log('info', 'push', 'Novo celular cadastrado para notificações.');
    pd_json(['ok' => true, 'aparelhos' => pd_lista_aparelhos($pdo, $adminId)], 201);
}
if ($acao === 'remover') {
    $id = $c['id'] ?? '';
    if (!is_string($id) || !preg_match(PD_UUID_RE, $id)) pd_falha(422, 'Aparelho inválido.');
    $pdo->prepare('DELETE FROM pd_push WHERE id = ? AND admin_id = ?')->execute([$id, $adminId]);
    pd_auditar('push_remover', '', 'Celular removido das notificações');
    pd_json(['ok' => true, 'aparelhos' => pd_lista_aparelhos($pdo, $adminId)]);
}
if ($acao === 'testar') {
    $r = pd_push_avisar('Teste do Painel PD', 'Se você está vendo isto, os avisos de novos pedidos estão funcionando.', '/painel/', 'teste');
    pd_auditar('push_teste', '', $r['enviados'] . ' de ' . $r['total'] . ' enviados');
    pd_json(['ok' => $r['enviados'] > 0, 'resultado' => $r, 'aparelhos' => pd_lista_aparelhos($pdo, $adminId)]);
}
pd_falha(422, 'Ação inválida.');
