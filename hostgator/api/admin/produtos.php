<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';
require dirname(__DIR__) . '/inc/validar.php';
require dirname(__DIR__) . '/inc/produtos.php';

pd_exigir_metodo('GET', 'POST', 'PATCH', 'DELETE');
$metodo = $_SERVER['REQUEST_METHOD'];
pd_exigir_admin($metodo !== 'GET');
$pdo = pd_db();

if ($metodo === 'GET') {
    $linhas = $pdo->query('SELECT * FROM pd_produtos ORDER BY destaque DESC, ordem ASC, nome ASC LIMIT 500')->fetchAll();
    pd_json(['produtos' => array_map('pd_produto_saida', $linhas)]);
}

$corpo = pd_ler_json(4000);

if ($metodo === 'POST') {
    [$d, $erro] = pd_validar_produto($corpo, false);
    if ($erro !== null) pd_falha(422, $erro);
    $padrao = ['descricao' => '', 'preco_centavos' => null, 'quantidade' => 0, 'status' => 'disponivel',
               'ativo' => 1, 'destaque' => 0, 'ordem' => 0, 'observacao_interna' => null];
    $d = $d + $padrao;
    $id = pd_uuid();
    $agora = pd_agora();
    $pdo->prepare('INSERT INTO pd_produtos (id, nome, categoria, descricao, preco_centavos, quantidade, status, ativo, destaque, ordem, foto_path, observacao_interna, criado_em, atualizado_em)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)')
        ->execute([$id, $d['nome'], $d['categoria'], $d['descricao'], $d['preco_centavos'], $d['quantidade'], $d['status'],
                   $d['ativo'], $d['destaque'], $d['ordem'], $d['observacao_interna'], $agora, $agora]);
    pd_auditar('produto_criar', $d['nome'], 'Produto cadastrado');
    pd_json(['produto' => pd_produto_saida(pd_produto_buscar($id))], 201);
}

$id = pd_id_do_corpo($corpo);
$atual = pd_produto_buscar($id);
if (!$atual) pd_falha(404, 'Produto não encontrado.');

if ($metodo === 'PATCH') {
    unset($corpo['id']);
    [$d, $erro] = pd_validar_produto($corpo, true);
    if ($erro !== null) pd_falha(422, $erro);
    $permitidos = ['nome','categoria','descricao','preco_centavos','quantidade','status','ativo','destaque','ordem','observacao_interna'];
    $sets = []; $vals = [];
    foreach ($d as $campo => $valor) {
        if (!in_array($campo, $permitidos, true)) continue;      // nomes de coluna nunca vêm do cliente
        $sets[] = "$campo = ?"; $vals[] = $valor;
    }
    $sets[] = 'atualizado_em = ?'; $vals[] = pd_agora(); $vals[] = $id;
    $pdo->prepare('UPDATE pd_produtos SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
    pd_auditar('produto_editar', (string)$atual['nome'], 'Campos: ' . implode(', ', array_keys($d)));
    pd_json(['produto' => pd_produto_saida(pd_produto_buscar($id))]);
}

// DELETE: remove o produto e o arquivo da foto.
$pdo->prepare('DELETE FROM pd_produtos WHERE id = ?')->execute([$id]);
pd_foto_apagar_arquivo($atual['foto_path']);
pd_auditar('produto_excluir', (string)$atual['nome'], 'Produto excluído');
pd_json(['ok' => true]);
