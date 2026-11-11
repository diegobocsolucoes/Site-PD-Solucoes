<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';

pd_exigir_metodo('GET', 'POST');
pd_exigir_admin($_SERVER['REQUEST_METHOD'] === 'POST');
$pdo = pd_db();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $c = pd_ler_json(300);
    if (($c['acao'] ?? '') !== 'zerar_acessos') pd_falha(422, 'Ação inválida.');
    $n = (int)$pdo->query('SELECT COUNT(*) FROM pd_acessos')->fetchColumn();
    $pdo->exec('DELETE FROM pd_acessos');
    pd_auditar('acessos_zerar', '', $n . ' registros de acesso apagados');
    pd_json(['ok' => true, 'apagados' => $n]);
}
$tz = new DateTimeZone('America/Sao_Paulo');
$dias = in_array((int)($_GET['dias'] ?? 30), [7, 30, 90], true) ? (int)$_GET['dias'] : 30;
$hoje = new DateTime('today', $tz);
$inicio = (clone $hoje)->modify('-' . ($dias - 1) . ' days');
$de = $inicio->format('Y-m-d');

const PD_PAGINAS = ['/' => 'Início', '/privacidade.html' => 'Privacidade', '/screens/01-home-v15/' => 'Início',
    '/screens/02-atendimento-v5/' => 'Atendimento', '/screens/03-area-empresas-v3/' => 'Área para Empresas',
    '/screens/04-planos-chamados-v2/' => 'Planos de chamados', '/screens/05-consultoria-ti-v2/' => 'Consultoria de TI',
    '/screens/06-seguranca-eletronica-v2/' => 'Segurança eletrônica', '/screens/07-orcamento-empresarial-v2/' => 'Orçamento empresarial',
    '/screens/08-loja-rapida-v2/' => 'Loja Rápida', '/screens/09-parcerias-v2/' => 'Parcerias',
    '/screens/10-consultoria-entrada-v2/' => 'Consultoria', '/screens/11-consultoria-domestica-v2/' => 'Consultoria doméstica',
    '/screens/12-consultoria-setup-v2/' => 'Consultoria de setup', '/screens/13-chamado-empresarial-v2/' => 'Chamado empresarial',
    '/screens/14-orcamento-entrada-v2/' => 'Solicitar orçamento', '/screens/15-confirmacao-universal-v3/' => 'Confirmação'];

// série diária de acessos
$q = $pdo->prepare('SELECT dia, COUNT(*) AS visualizacoes, COUNT(DISTINCT visitante) AS visitantes FROM pd_acessos WHERE dia >= ? GROUP BY dia');
$q->execute([$de]);
$porDia = [];
foreach ($q->fetchAll() as $l) $porDia[$l['dia']] = $l;

// pedidos por dia (horário de Brasília)
$pedidosDia = [];
foreach (['pd_solicitacoes', 'pd_contatos'] as $t) {
    $q = $pdo->prepare("SELECT criado_em FROM $t WHERE criado_em >= ?");
    $q->execute([gmdate('Y-m-d H:i:s', $inicio->getTimestamp() - 86400)]);
    foreach ($q->fetchAll() as $l) {
        $d = (new DateTime($l['criado_em'] . ' UTC'))->setTimezone($tz)->format('Y-m-d');
        $pedidosDia[$d] = ($pedidosDia[$d] ?? 0) + 1;
    }
}
$serie = []; $totalV = 0; $totalU = 0; $totalP = 0;
for ($d = clone $inicio; $d <= $hoje; $d->modify('+1 day')) {
    $k = $d->format('Y-m-d');
    $v = (int)($porDia[$k]['visualizacoes'] ?? 0); $u = (int)($porDia[$k]['visitantes'] ?? 0); $p = (int)($pedidosDia[$k] ?? 0);
    $serie[] = ['dia' => $k, 'visualizacoes' => $v, 'visitantes' => $u, 'pedidos' => $p];
    $totalV += $v; $totalU += $u; $totalP += $p;
}
$agrupar = function (string $coluna, int $limite) use ($pdo, $de): array {
    $q = $pdo->prepare("SELECT $coluna AS nome, COUNT(*) AS total FROM pd_acessos WHERE dia >= ? GROUP BY $coluna ORDER BY total DESC LIMIT $limite");
    $q->execute([$de]);
    return array_map(fn($l) => ['nome' => $l['nome'], 'total' => (int)$l['total']], $q->fetchAll());
};
$paginas = array_map(function ($l) { $l['nome'] = PD_PAGINAS[$l['nome']] ?? $l['nome']; return $l; }, $agrupar('caminho', 10));

// situação dos pedidos
$situacao = [];
foreach (['solicitacoes' => 'pd_solicitacoes', 'contatos' => 'pd_contatos'] as $nome => $t) {
    $situacao[$nome] = [];
    foreach ($pdo->query("SELECT status, COUNT(*) AS total FROM $t GROUP BY status")->fetchAll() as $l) $situacao[$nome][$l['status']] = (int)$l['total'];
}
$novos = ($situacao['solicitacoes']['novo'] ?? 0) + ($situacao['contatos']['novo'] ?? 0);
$push = (int)$pdo->query('SELECT COUNT(*) FROM pd_push')->fetchColumn();
$hojeK = $hoje->format('Y-m-d');
pd_json([
    'dias' => $dias,
    'totais' => ['visualizacoes' => $totalV, 'visitantes' => $totalU, 'pedidos' => $totalP,
                 'conversao' => ($totalU > 0 && $totalP <= $totalU) ? round($totalP * 100 / $totalU, 1) : null,
                 'hoje_visualizacoes' => (int)($porDia[$hojeK]['visualizacoes'] ?? 0), 'hoje_visitantes' => (int)($porDia[$hojeK]['visitantes'] ?? 0),
                 'hoje_pedidos' => (int)($pedidosDia[$hojeK] ?? 0)],
    'serie' => $serie, 'paginas' => $paginas, 'origens' => $agrupar('origem', 8), 'dispositivos' => $agrupar('dispositivo', 3),
    'situacao' => $situacao, 'novos' => $novos, 'celulares' => $push,
]);
