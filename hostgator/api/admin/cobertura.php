<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';
require dirname(__DIR__) . '/inc/push.php';
require dirname(__DIR__) . '/inc/cobertura.php';

pd_exigir_metodo('GET', 'POST');
$metodo = $_SERVER['REQUEST_METHOD'];
pd_exigir_admin($metodo === 'POST');

function pd_cob_saida(): array {
    $c = pd_cobertura_config();
    return ['cep' => $c['cep'], 'raio' => $c['raio'], 'raio_max' => $c['raio_max'], 'taxa_centavos' => $c['taxa'], 'localizado' => $c['ponto'] !== null,
            'local' => $c['ponto'] ? trim($c['ponto']['bairro'] . ', ' . $c['ponto']['cidade'], ' ,') : ''];
}
if ($metodo === 'POST') {
    $c = pd_ler_json(400);
    $cep = preg_replace('/\D/', '', (string)($c['cep'] ?? ''));
    $raio = is_numeric($c['raio'] ?? null) ? (float)$c['raio'] : 0.0;
    $max = is_numeric($c['raio_max'] ?? null) ? (float)$c['raio_max'] : 0.0;
    $taxa = is_numeric($c['taxa_centavos'] ?? null) ? (int)$c['taxa_centavos'] : -1;
    if (strlen($cep) !== 8) pd_falha(422, 'Informe o CEP-base com 8 números.');
    if ($max < $raio || $max > 200) pd_falha(422, 'O limite de atendimento deve ser igual ou maior que o raio.');
    if ($taxa < 0 || $taxa > 100000) pd_falha(422, 'Informe uma taxa de deslocamento válida.');
    if ($raio < 0.5 || $raio > 100) pd_falha(422, 'O raio deve ficar entre 0,5 e 100 km.');
    if (!pd_cep_localizar($cep)) pd_falha(422, 'Não consegui localizar esse CEP no mapa. Confira o número ou tente o CEP de uma rua próxima.');
    pd_ajuste_gravar('cob_cep', $cep);
    pd_ajuste_gravar('cob_raio', (string)$raio);
    pd_ajuste_gravar('cob_raio_max', (string)$max);
    pd_ajuste_gravar('cob_taxa', (string)$taxa);
    pd_auditar('cobertura', 'raio ' . $raio . ' km', 'Área de atendimento atualizada');
}
pd_json(pd_cob_saida());
