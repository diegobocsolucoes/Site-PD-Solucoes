<?php
declare(strict_types=1);
require __DIR__ . '/inc/boot.php';

pd_exigir_metodo('GET');
try {
    $linhas = pd_db()->query('SELECT id, nome, categoria, descricao, preco_centavos, status, destaque, foto_path
        FROM pd_produtos WHERE ativo = 1 ORDER BY destaque DESC, ordem ASC, nome ASC LIMIT 200')->fetchAll();
} catch (Throwable $e) {
    error_log('PD: falha ao listar produtos: ' . $e->getMessage());
    pd_falha(503, 'Catálogo indisponível.');
}
// Só campos públicos: nunca estoque exato nem observação interna.
$produtos = array_map(fn($p) => [
    'id' => $p['id'], 'nome' => $p['nome'], 'categoria' => $p['categoria'], 'descricao' => $p['descricao'],
    'preco_centavos' => $p['preco_centavos'] === null ? null : (int)$p['preco_centavos'],
    'status' => $p['status'], 'destaque' => (bool)$p['destaque'],
    'foto_url' => $p['foto_path'] ? '/uploads/produtos/' . $p['foto_path'] : null,
], $linhas);
header('Cache-Control: public, max-age=30');
http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
echo json_encode(['produtos' => $produtos], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
