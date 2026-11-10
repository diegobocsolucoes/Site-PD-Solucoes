<?php
declare(strict_types=1);
require dirname(__DIR__) . '/inc/boot.php';
require dirname(__DIR__) . '/inc/admin.php';
require dirname(__DIR__) . '/inc/validar.php';
require dirname(__DIR__) . '/inc/produtos.php';

const PD_FOTO_MAX = 2097152;           // 2 MB
pd_exigir_metodo('POST', 'DELETE');
$metodo = $_SERVER['REQUEST_METHOD'];
pd_exigir_admin(true);
$pdo = pd_db();

if ($metodo === 'DELETE') {
    $id = pd_id_do_corpo(pd_ler_json(300));
    $p = pd_produto_buscar($id);
    if (!$p) pd_falha(404, 'Produto não encontrado.');
    $pdo->prepare('UPDATE pd_produtos SET foto_path = NULL, atualizado_em = ? WHERE id = ?')->execute([pd_agora(), $id]);
    pd_foto_apagar_arquivo($p['foto_path']);
    pd_json(['produto' => pd_produto_saida(pd_produto_buscar($id))]);
}

$id = pd_id_do_corpo($_POST);
$p = pd_produto_buscar($id);
if (!$p) pd_falha(404, 'Produto não encontrado.');
$arq = $_FILES['arquivo'] ?? null;
if (!$arq || ($arq['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($arq['tmp_name'])) pd_falha(422, 'Envie uma foto.');
if ($arq['size'] > PD_FOTO_MAX) pd_falha(413, 'A foto deve ter até 2 MB.');
$bytes = file_get_contents($arq['tmp_name']);
$tipo = $bytes === false ? null : pd_tipo_imagem($bytes);
if ($tipo === null) pd_falha(415, 'Use uma foto WEBP, JPG ou PNG.');
$info = @getimagesizefromstring($bytes);
if ($info === false || $info[0] < 1 || $info[1] < 1 || $info[0] > 6000 || $info[1] > 6000) pd_falha(415, 'Imagem inválida.');

$caminho = $id . '/' . time() . '.' . $tipo;
$destino = pd_uploads_dir() . '/' . $caminho;
if (!is_dir(dirname($destino)) && !@mkdir(dirname($destino), 0755, true)) {
    error_log('PD: sem permissão para criar a pasta de fotos.');
    pd_falha(503, 'Não foi possível salvar a foto.');
}
if (file_put_contents($destino, $bytes) === false) pd_falha(503, 'Não foi possível salvar a foto.');
@chmod($destino, 0644);
$pdo->prepare('UPDATE pd_produtos SET foto_path = ?, atualizado_em = ? WHERE id = ?')->execute([$caminho, pd_agora(), $id]);
if ($p['foto_path'] && $p['foto_path'] !== $caminho) pd_foto_apagar_arquivo($p['foto_path']);
pd_json(['produto' => pd_produto_saida(pd_produto_buscar($id))]);
