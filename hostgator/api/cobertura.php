<?php
declare(strict_types=1);
require __DIR__ . '/inc/boot.php';
require __DIR__ . '/inc/cobertura.php';

pd_exigir_metodo('GET');
if (!pd_origem_ok()) pd_falha(403, 'Origem não autorizada.');
if (!isset($_GET['cep'])) {
    $c = pd_cobertura_config();
    pd_json(['raio' => $c['raio'], 'raio_max' => $c['raio_max'], 'taxa_centavos' => $c['taxa']]);
}
$cep = preg_replace('/\D/', '', (string)($_GET['cep'] ?? ''));
if (strlen($cep) !== 8) pd_falha(422, 'Informe um CEP com 8 números.');
if (!pd_limitar('cobertura', 40, 3600)) pd_falha(429, 'Muitas consultas. Tente mais tarde.');
$r = pd_cobertura_avaliar($cep);
pd_json(['status' => $r['status'], 'local' => $r['local']] + ($r['status'] === 'taxa' ? ['taxa_centavos' => $r['taxa']] : []));
