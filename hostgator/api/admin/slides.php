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

function pd_slides_lista(PDO $pdo): array {
    return array_map(function ($l) { $l['ativo'] = (int)$l['ativo'] === 1; $l['ordem'] = (int)$l['ordem']; return $l; },
        $pdo->query('SELECT id, ordem, titulo, texto, preco, botao, destino, ativo FROM pd_slides ORDER BY ordem ASC, criado_em ASC LIMIT 50')->fetchAll());
}
function pd_slide_validar(array $c, bool $parcial): array {
    $d = [];
    $txt = fn($k, $min, $max) => (is_string($c[$k] ?? null) ? trim(pd_linha_segura($c[$k])) : '');
    foreach (['titulo' => [3, 80], 'texto' => [5, 240], 'botao' => [2, 40]] as $k => [$min, $max]) {
        if ($parcial && !array_key_exists($k, $c)) continue;
        $v = $txt($k, $min, $max);
        if (mb_strlen($v) < $min || mb_strlen($v) > $max) return [null, "Campo '$k' deve ter de $min a $max caracteres."];
        $d[$k] = $v;
    }
    if (!$parcial || array_key_exists('preco', $c)) {
        $v = $txt('preco', 0, 60);
        if (mb_strlen($v) > 60) return [null, 'O preço pode ter até 60 caracteres.'];
        $d['preco'] = $v === '' ? null : $v;
    }
    if (!$parcial || array_key_exists('destino', $c)) {
        $v = is_string($c['destino'] ?? null) ? trim($c['destino']) : '';
        if (!preg_match('#^(screens/[a-z0-9-]{3,40}/index\.html|index\.html|privacidade\.html|https://wa\.me/\d{10,15}(\?[A-Za-z0-9%._~&=+-]{0,300})?)$#', $v)) return [null, 'Destino inválido. Escolha uma tela do site ou um link do WhatsApp.'];
        $d['destino'] = $v;
    }
    if (array_key_exists('ordem', $c)) {
        if (!is_int($c['ordem']) || $c['ordem'] < 0 || $c['ordem'] > 10000) return [null, 'Ordem inválida.'];
        $d['ordem'] = $c['ordem'];
    }
    if (array_key_exists('ativo', $c)) { if (!is_bool($c['ativo'])) return [null, 'Valor inválido.']; $d['ativo'] = $c['ativo'] ? 1 : 0; }
    return [$d, null];
}

if ($metodo === 'GET') pd_json(['slides' => pd_slides_lista($pdo)]);

$c = pd_ler_json(2000);
if ($metodo === 'POST') {
    [$d, $erro] = pd_slide_validar($c, false);
    if ($erro !== null) pd_falha(422, $erro);
    if ((int)$pdo->query('SELECT COUNT(*) FROM pd_slides')->fetchColumn() >= 12) pd_falha(422, 'Limite de 12 destaques.');
    $d += ['ordem' => ((int)$pdo->query('SELECT COALESCE(MAX(ordem), 0) FROM pd_slides')->fetchColumn()) + 10, 'ativo' => 1];
    $agora = pd_agora();
    $pdo->prepare('INSERT INTO pd_slides (id, ordem, titulo, texto, preco, botao, destino, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([pd_uuid(), $d['ordem'], $d['titulo'], $d['texto'], $d['preco'], $d['botao'], $d['destino'], $d['ativo'], $agora, $agora]);
    pd_auditar('slide_criar', $d['titulo'], 'Destaque criado');
    pd_json(['slides' => pd_slides_lista($pdo)], 201);
}
$id = pd_id_do_corpo($c);
$q = $pdo->prepare('SELECT titulo FROM pd_slides WHERE id = ?'); $q->execute([$id]);
$atual = $q->fetch();
if (!$atual) pd_falha(404, 'Destaque não encontrado.');
if ($metodo === 'DELETE') {
    $pdo->prepare('DELETE FROM pd_slides WHERE id = ?')->execute([$id]);
    pd_auditar('slide_excluir', (string)$atual['titulo'], 'Destaque excluído');
    pd_json(['slides' => pd_slides_lista($pdo)]);
}
unset($c['id']);
[$d, $erro] = pd_slide_validar($c, true);
if ($erro !== null) pd_falha(422, $erro);
if (!$d) pd_falha(422, 'Nada para atualizar.');
$ok = ['ordem', 'titulo', 'texto', 'preco', 'botao', 'destino', 'ativo'];
$sets = []; $vals = [];
foreach ($d as $k => $v) { if (in_array($k, $ok, true)) { $sets[] = "$k = ?"; $vals[] = $v; } }
$sets[] = 'atualizado_em = ?'; $vals[] = pd_agora(); $vals[] = $id;
$pdo->prepare('UPDATE pd_slides SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
pd_auditar('slide_editar', (string)$atual['titulo'], 'Campos: ' . implode(', ', array_keys($d)));
pd_json(['slides' => pd_slides_lista($pdo)]);
