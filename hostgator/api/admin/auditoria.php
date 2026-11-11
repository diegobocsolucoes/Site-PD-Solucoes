<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';

pd_exigir_metodo('GET');
pd_exigir_admin(false);
$limite = max(1, min(200, (int)($_GET['limite'] ?? 100)));
$pagina = max(0, (int)($_GET['pagina'] ?? 0));
$acao = is_string($_GET['acao'] ?? null) && preg_match('/^[a-z_]{2,40}$/', $_GET['acao']) ? $_GET['acao'] : '';
$onde = $acao !== '' ? ' WHERE acao = ?' : '';
$q = pd_db()->prepare("SELECT acao, usuario, alvo, detalhe, ip_hash, criado_em FROM pd_auditoria$onde ORDER BY criado_em DESC, id DESC LIMIT $limite OFFSET " . ($pagina * $limite));
$q->execute($acao !== '' ? [$acao] : []);
$total = pd_db()->prepare("SELECT COUNT(*) FROM pd_auditoria$onde");
$total->execute($acao !== '' ? [$acao] : []);
pd_json(['registros' => $q->fetchAll(), 'total' => (int)$total->fetchColumn(), 'pagina' => $pagina, 'limite' => $limite]);
