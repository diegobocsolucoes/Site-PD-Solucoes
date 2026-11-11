<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';

pd_exigir_metodo('GET');
pd_exigir_admin(false);
$limite = max(1, min(200, (int)($_GET['limite'] ?? 100)));
$nivel = in_array($_GET['nivel'] ?? '', ['info', 'aviso', 'erro'], true) ? $_GET['nivel'] : '';
$q = pd_db()->prepare('SELECT nivel, evento, mensagem, criado_em FROM pd_logs' . ($nivel !== '' ? ' WHERE nivel = ?' : '') . " ORDER BY criado_em DESC, id DESC LIMIT $limite");
$q->execute($nivel !== '' ? [$nivel] : []);
$erros = pd_db()->prepare("SELECT COUNT(*) FROM pd_logs WHERE nivel = 'erro' AND criado_em > ?");
$erros->execute([gmdate('Y-m-d H:i:s', time() - 86400)]);
pd_json(['registros' => $q->fetchAll(), 'erros_24h' => (int)$erros->fetchColumn()]);
