<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';

pd_exigir_metodo('GET');
pd_sessao_iniciar();
if (($_SESSION['etapa'] ?? '') !== 'aal2') pd_json(['autenticado' => false]);
$q = pd_db()->prepare('SELECT usuario FROM pd_admin WHERE id = ?');
$q->execute([$_SESSION['admin_id']]);
$u = $q->fetchColumn();
if (!$u) { pd_sessao_destruir(); pd_json(['autenticado' => false]); }
pd_json(['autenticado' => true, 'csrf' => $_SESSION['csrf'], 'usuario' => $u]);
