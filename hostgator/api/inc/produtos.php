<?php
declare(strict_types=1);

const PD_UUID_RE = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

function pd_uploads_dir(): string {
    $dir = pd_config()['uploads'] ?? (dirname(__DIR__, 2) . '/uploads/produtos');
    return rtrim($dir, '/');
}

function pd_produto_saida(array $p): array {
    return [
        'id' => $p['id'], 'nome' => $p['nome'], 'categoria' => $p['categoria'], 'descricao' => $p['descricao'],
        'preco_centavos' => $p['preco_centavos'] === null ? null : (int)$p['preco_centavos'],
        'quantidade' => (int)$p['quantidade'], 'status' => $p['status'],
        'ativo' => (bool)$p['ativo'], 'destaque' => (bool)$p['destaque'], 'ordem' => (int)$p['ordem'],
        'foto_path' => $p['foto_path'], 'foto_url' => $p['foto_path'] ? '/uploads/produtos/' . $p['foto_path'] : null,
        'observacao_interna' => $p['observacao_interna'], 'criado_em' => $p['criado_em'], 'atualizado_em' => $p['atualizado_em'],
    ];
}

function pd_produto_buscar(string $id): ?array {
    $q = pd_db()->prepare('SELECT * FROM pd_produtos WHERE id = ?');
    $q->execute([$id]);
    $r = $q->fetch();
    return $r ?: null;
}

/** Apaga um arquivo de foto com segurança (só dentro da pasta de uploads, só nomes esperados). */
function pd_foto_apagar_arquivo(?string $caminho): void {
    if (!$caminho || !preg_match('#^[0-9a-f-]{36}/[0-9]{10,16}\.(webp|jpg|png)$#', $caminho)) return;
    $arq = pd_uploads_dir() . '/' . $caminho;
    if (is_file($arq)) @unlink($arq);
    $pasta = dirname($arq);
    if (is_dir($pasta) && count(scandir($pasta) ?: []) <= 2) @rmdir($pasta);
}

function pd_id_do_corpo(array $corpo): string {
    $id = $corpo['id'] ?? '';
    if (!is_string($id) || !preg_match(PD_UUID_RE, $id)) pd_falha(422, 'Produto inválido.');
    return strtolower($id);
}
