<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';

pd_exigir_metodo('GET');
pd_exigir_admin(false);
$fonte = in_array($_GET['fonte'] ?? '', ['contatos', 'auditoria'], true) ? $_GET['fonte'] : 'solicitacoes';
$tabela = ['contatos' => 'pd_contatos', 'auditoria' => 'pd_auditoria'][$fonte] ?? 'pd_solicitacoes';
$campos = $fonte === 'auditoria'
    ? ['criado_em', 'usuario', 'acao', 'alvo', 'detalhe']
    : ($fonte === 'contatos'
    ? ['protocolo', 'assunto', 'status', 'nome', 'whatsapp', 'resumo', 'criado_em', 'atualizado_em']
    : ['protocolo', 'tipo', 'status', 'nome', 'whatsapp', 'equipamento', 'servico', 'modalidade', 'cep', 'cobertura', 'descricao', 'criado_em', 'atualizado_em']);
$linhas = pd_db()->query('SELECT ' . implode(', ', $campos) . " FROM $tabela ORDER BY criado_em DESC LIMIT 5000")->fetchAll();
pd_auditar('exportar', $fonte, count($linhas) . ' registros exportados (CSV)');
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="pd-' . $fonte . '-' . gmdate('Ymd-His') . '.csv"');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$saida = fopen('php://output', 'w');
fwrite($saida, "\xEF\xBB\xBF");                       // Excel reconhece os acentos
fputcsv($saida, $campos, ';');
foreach ($linhas as $l) {
    $linha = [];
    foreach ($campos as $c) {                          // evita fórmulas maliciosas no Excel
        $v = (string)$l[$c];
        $linha[] = preg_match('/^[=+\-@\t\r]/', $v) ? "'" . $v : $v;
    }
    fputcsv($saida, $linha, ';');
}
fclose($saida);
