<?php
declare(strict_types=1);
require __DIR__ . '/inc/boot.php';

pd_exigir_metodo('GET');
$q = pd_db()->query('SELECT titulo, texto, preco, botao, destino, arte FROM pd_slides WHERE ativo = 1 ORDER BY ordem ASC, criado_em ASC LIMIT 12');
header('Cache-Control: public, max-age=60');
pd_json(['slides' => $q->fetchAll()]);
