<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';
require dirname(__DIR__) . '/inc/validar.php';
require dirname(__DIR__) . '/inc/produtos.php';

pd_exigir_metodo('GET', 'PATCH');
$metodo = $_SERVER['REQUEST_METHOD'];
pd_exigir_admin($metodo !== 'GET');
$pdo = pd_db();

if ($metodo === 'GET') {
    $fonte = ($_GET['fonte'] ?? 'solicitacoes') === 'contatos' ? 'contatos' : 'solicitacoes';
    $limite = max(1, min(100, (int)($_GET['limite'] ?? 50)));
    $campos = $fonte === 'contatos'
        ? 'id, protocolo, assunto, status, nome, whatsapp, resumo, aviso_enviado, criado_em, atualizado_em'
        : 'id, protocolo, tipo, status, nome, whatsapp, equipamento, servico, modalidade, cep, descricao, aviso_enviado, criado_em, atualizado_em';
    $tabela = $fonte === 'contatos' ? 'pd_contatos' : 'pd_solicitacoes';
    $linhas = $pdo->query("SELECT $campos FROM $tabela ORDER BY criado_em DESC LIMIT $limite")->fetchAll();
    pd_json([$fonte => $linhas]);
}

$c = pd_ler_json(600);
$id = pd_id_do_corpo($c);
$fonte = ($c['fonte'] ?? 'solicitacoes') === 'contatos' ? 'contatos' : 'solicitacoes';
$validos = $fonte === 'contatos' ? PD_STATUS_CONTATO : PD_STATUS_SOLICITACAO;
$status = $c['status'] ?? '';
if (!is_string($status) || !in_array($status, $validos, true)) pd_falha(422, 'Status inválido.');
$tabela = $fonte === 'contatos' ? 'pd_contatos' : 'pd_solicitacoes';

$q = $pdo->prepare("SELECT * FROM $tabela WHERE id = ?");
$q->execute([$id]);
$atual = $q->fetch();
if (!$atual) pd_falha(404, 'Pedido não encontrado.');
if ($atual['status'] !== $status) {
    $agora = pd_agora();
    $pdo->prepare("UPDATE $tabela SET status = ?, atualizado_em = ? WHERE id = ?")->execute([$status, $agora, $id]);
    $pdo->prepare('INSERT INTO pd_historico_status (id, origem, registro_id, status_anterior, status_novo, criado_em) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([pd_uuid(), $fonte, $id, $atual['status'], $status, $agora]);
}
$q->execute([$id]);
$novo = $q->fetch();
$novo['aviso_enviado'] = (int)$novo['aviso_enviado'];
pd_json([$fonte === 'contatos' ? 'contato' : 'solicitacao' => $novo]);
