<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';

pd_exigir_metodo('POST');
if (!pd_origem_ok()) pd_falha(403, 'Origem não autorizada.');
pd_sessao_iniciar();
pd_sessao_destruir();
pd_json(['ok' => true]);
