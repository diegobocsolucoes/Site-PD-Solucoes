<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';
require dirname(__DIR__) . '/inc/validar.php';
require dirname(__DIR__) . '/inc/produtos.php';

pd_exigir_metodo('GET', 'POST');
$metodo = $_SERVER['REQUEST_METHOD'];
pd_exigir_admin($metodo === 'POST');
$pdo = pd_db();
$dados = $metodo === 'GET' ? $_GET : pd_ler_json(1500);
$origem = ($dados['fonte'] ?? '') === 'contatos' ? 'contatos' : 'solicitacoes';
$id = $dados['id'] ?? '';
if (!is_string($id) || !preg_match(PD_UUID_RE, $id)) pd_falha(422, 'Pedido inválido.');
$tabela = $origem === 'contatos' ? 'pd_contatos' : 'pd_solicitacoes';
$q = $pdo->prepare("SELECT protocolo FROM $tabela WHERE id = ?");
$q->execute([$id]);
$protocolo = $q->fetchColumn();
if ($protocolo === false) pd_falha(404, 'Pedido não encontrado.');

if ($metodo === 'POST') {
    $texto = is_string($dados['texto'] ?? null) ? trim(preg_replace('/\r\n?/', "\n", $dados['texto']) ?? '') : '';
    if (mb_strlen($texto) < 1 || mb_strlen($texto) > 1000) pd_falha(422, 'Escreva a nota (até 1000 caracteres).');
    $pdo->prepare('INSERT INTO pd_notas (id, origem, registro_id, texto, criado_em) VALUES (?, ?, ?, ?, ?)')
        ->execute([pd_uuid(), $origem, $id, $texto, pd_agora()]);
    pd_auditar('nota', (string)$protocolo, 'Nota interna adicionada');
}
$n = $pdo->prepare('SELECT texto, criado_em FROM pd_notas WHERE origem = ? AND registro_id = ? ORDER BY criado_em DESC LIMIT 50');
$n->execute([$origem, $id]);
$h = $pdo->prepare('SELECT status_anterior, status_novo, criado_em FROM pd_historico_status WHERE origem = ? AND registro_id = ? ORDER BY criado_em DESC LIMIT 50');
$h->execute([$origem, $id]);
pd_json(['notas' => $n->fetchAll(), 'historico' => $h->fetchAll()]);
