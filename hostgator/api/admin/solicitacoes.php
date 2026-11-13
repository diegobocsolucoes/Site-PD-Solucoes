<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';
require dirname(__DIR__) . '/inc/validar.php';
require dirname(__DIR__) . '/inc/produtos.php';

pd_exigir_metodo('GET', 'PATCH', 'DELETE');
$metodo = $_SERVER['REQUEST_METHOD'];
pd_exigir_admin($metodo !== 'GET');
$pdo = pd_db();

if ($metodo === 'GET') {
    $fonte = ($_GET['fonte'] ?? 'solicitacoes') === 'contatos' ? 'contatos' : 'solicitacoes';
    $limite = max(1, min(100, (int)($_GET['limite'] ?? 50)));
    $campos = $fonte === 'contatos'
        ? 'id, protocolo, assunto, categoria, status, nome, whatsapp, email, retorno, resumo, aviso_enviado, criado_em, atualizado_em'
        : 'id, protocolo, tipo, status, nome, whatsapp, equipamento, servico, modalidade, cep, cobertura, descricao, aviso_enviado, criado_em, atualizado_em';
    $tabela = $fonte === 'contatos' ? 'pd_contatos' : 'pd_solicitacoes';
    $linhas = $pdo->query("SELECT $campos FROM $tabela ORDER BY criado_em DESC LIMIT $limite")->fetchAll();
    if ($fonte === 'contatos') foreach ($linhas as &$l) {
        if (!isset(PD_CATEGORIAS[(string)$l['categoria']])) $l['categoria'] = pd_categoria_padrao((string)$l['assunto']);
    }
    unset($l);
    pd_json([$fonte => $linhas, 'categorias' => PD_CATEGORIAS]);
}

$c = pd_ler_json(600);
$id = pd_id_do_corpo($c);
$fonte = ($c['fonte'] ?? 'solicitacoes') === 'contatos' ? 'contatos' : 'solicitacoes';
if ($metodo === 'DELETE') {
    $tab = $fonte === 'contatos' ? 'pd_contatos' : 'pd_solicitacoes';
    $q = $pdo->prepare("SELECT protocolo, nome FROM $tab WHERE id = ?");
    $q->execute([$id]);
    $p = $q->fetch();
    if (!$p) pd_falha(404, 'Pedido não encontrado.');
    $pdo->prepare("DELETE FROM $tab WHERE id = ?")->execute([$id]);
    $pdo->prepare('DELETE FROM pd_notas WHERE origem = ? AND registro_id = ?')->execute([$fonte, $id]);
    $pdo->prepare('DELETE FROM pd_historico_status WHERE origem = ? AND registro_id = ?')->execute([$fonte, $id]);
    pd_auditar('pedido_excluir', (string)$p['protocolo'], 'Pedido de ' . $p['nome'] . ' excluído');
    pd_json(['ok' => true]);
}
$validos = $fonte === 'contatos' ? PD_STATUS_CONTATO : PD_STATUS_SOLICITACAO;
$status = $c['status'] ?? null;
$categoria = $c['categoria'] ?? null;
if ($status === null && $categoria === null) pd_falha(422, 'Nada para atualizar.');
if ($status !== null && (!is_string($status) || !in_array($status, $validos, true))) pd_falha(422, 'Status inválido.');
if ($categoria !== null && ($fonte !== 'contatos' || !is_string($categoria) || !isset(PD_CATEGORIAS[$categoria]))) pd_falha(422, 'Categoria inválida.');
$tabela = $fonte === 'contatos' ? 'pd_contatos' : 'pd_solicitacoes';

$q = $pdo->prepare("SELECT * FROM $tabela WHERE id = ?");
$q->execute([$id]);
$atual = $q->fetch();
if (!$atual) pd_falha(404, 'Pedido não encontrado.');
if ($categoria !== null) {
    $antiga = isset(PD_CATEGORIAS[(string)$atual['categoria']]) ? $atual['categoria'] : pd_categoria_padrao((string)$atual['assunto']);
    if ($antiga !== $categoria) {
        $pdo->prepare('UPDATE pd_contatos SET categoria = ?, atualizado_em = ? WHERE id = ?')->execute([$categoria, pd_agora(), $id]);
        pd_auditar('categoria', (string)$atual['protocolo'], $antiga . ' → ' . $categoria);
    }
}
if ($status !== null && $atual['status'] !== $status) {
    $agora = pd_agora();
    $pdo->prepare("UPDATE $tabela SET status = ?, atualizado_em = ? WHERE id = ?")->execute([$status, $agora, $id]);
    $pdo->prepare('INSERT INTO pd_historico_status (id, origem, registro_id, status_anterior, status_novo, criado_em) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([pd_uuid(), $fonte, $id, $atual['status'], $status, $agora]);
    pd_auditar('status', (string)$atual['protocolo'], $atual['status'] . ' → ' . $status);
}
$q->execute([$id]);
$novo = $q->fetch();
$novo['aviso_enviado'] = (int)$novo['aviso_enviado'];
if ($fonte === 'contatos' && !isset(PD_CATEGORIAS[(string)$novo['categoria']])) $novo['categoria'] = pd_categoria_padrao((string)$novo['assunto']);
pd_json([$fonte === 'contatos' ? 'contato' : 'solicitacao' => $novo]);
