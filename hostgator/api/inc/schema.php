<?php
declare(strict_types=1);
/** Tabelas do sistema. Funciona em MySQL/MariaDB (produção) e SQLite (testes). */

function pd_schema(string $driver): array {
    $mysql = ($driver === 'mysql');
    $fim = $mysql ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
    $k = fn(string $nome, string $cols) => $mysql ? ",\n  KEY $nome ($cols)" : '';
    $idx = fn(string $tabela, string $nome, string $cols) =>
        $mysql ? [] : ["CREATE INDEX IF NOT EXISTS $nome ON $tabela ($cols)"];

    $sql = [];
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_admin (
  id CHAR(36) NOT NULL PRIMARY KEY,
  usuario VARCHAR(60) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  totp_segredo VARCHAR(64) NOT NULL,
  totp_ultimo_passo BIGINT NOT NULL DEFAULT 0,
  tentativas INT NOT NULL DEFAULT 0,
  bloqueado_ate DATETIME NULL,
  criado_em DATETIME NOT NULL
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_contagem (
  chave VARCHAR(30) NOT NULL PRIMARY KEY,
  valor BIGINT NOT NULL
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_limite (
  id CHAR(36) NOT NULL PRIMARY KEY,
  chave CHAR(64) NOT NULL,
  criado_em DATETIME NOT NULL" . $k('pd_limite_idx', 'chave, criado_em') . "
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_solicitacoes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  protocolo VARCHAR(30) NOT NULL UNIQUE,
  tipo VARCHAR(12) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'novo',
  nome VARCHAR(100) NOT NULL,
  whatsapp VARCHAR(13) NOT NULL,
  equipamento VARCHAR(10) NOT NULL,
  servico VARCHAR(50) NOT NULL,
  modalidade VARCHAR(10) NOT NULL,
  cep CHAR(8) NULL,
  descricao TEXT NOT NULL,
  aviso_enviado TINYINT NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL,
  atualizado_em DATETIME NOT NULL" . $k('pd_solicitacoes_idx', 'criado_em') . "
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_contatos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  protocolo VARCHAR(30) NOT NULL UNIQUE,
  assunto VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'novo',
  nome VARCHAR(100) NOT NULL,
  whatsapp VARCHAR(13) NOT NULL,
  resumo TEXT NOT NULL,
  aviso_enviado TINYINT NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL,
  atualizado_em DATETIME NOT NULL" . $k('pd_contatos_idx', 'criado_em') . "
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_historico_status (
  id CHAR(36) NOT NULL PRIMARY KEY,
  origem VARCHAR(12) NOT NULL,
  registro_id CHAR(36) NOT NULL,
  status_anterior VARCHAR(30) NULL,
  status_novo VARCHAR(30) NOT NULL,
  criado_em DATETIME NOT NULL" . $k('pd_historico_idx', 'registro_id, criado_em') . "
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_produtos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL,
  categoria VARCHAR(40) NOT NULL,
  descricao VARCHAR(240) NOT NULL DEFAULT '',
  preco_centavos INT NULL,
  quantidade INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'disponivel',
  ativo TINYINT NOT NULL DEFAULT 1,
  destaque TINYINT NOT NULL DEFAULT 0,
  ordem INT NOT NULL DEFAULT 0,
  foto_path VARCHAR(120) NULL,
  observacao_interna VARCHAR(500) NULL,
  criado_em DATETIME NOT NULL,
  atualizado_em DATETIME NOT NULL" . $k('pd_produtos_idx', 'ativo, destaque, ordem') . "
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_acessos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  dia CHAR(10) NOT NULL,
  caminho VARCHAR(80) NOT NULL,
  origem VARCHAR(60) NOT NULL,
  dispositivo VARCHAR(8) NOT NULL,
  visitante CHAR(16) NOT NULL,
  criado_em DATETIME NOT NULL" . $k('pd_acessos_idx', 'dia') . "
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_auditoria (
  id CHAR(36) NOT NULL PRIMARY KEY,
  admin_id CHAR(36) NULL,
  usuario VARCHAR(60) NOT NULL,
  acao VARCHAR(40) NOT NULL,
  alvo VARCHAR(80) NOT NULL DEFAULT '',
  detalhe VARCHAR(300) NOT NULL DEFAULT '',
  ip_hash CHAR(16) NOT NULL,
  criado_em DATETIME NOT NULL" . $k('pd_auditoria_idx', 'criado_em') . "
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nivel VARCHAR(8) NOT NULL,
  evento VARCHAR(40) NOT NULL,
  mensagem VARCHAR(300) NOT NULL,
  criado_em DATETIME NOT NULL" . $k('pd_logs_idx', 'criado_em') . "
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_push (
  id CHAR(36) NOT NULL PRIMARY KEY,
  admin_id CHAR(36) NOT NULL,
  endpoint VARCHAR(700) NOT NULL,
  endpoint_hash CHAR(64) NOT NULL UNIQUE,
  p256dh VARCHAR(120) NOT NULL,
  auth VARCHAR(60) NOT NULL,
  agente VARCHAR(120) NOT NULL DEFAULT '',
  falhas INT NOT NULL DEFAULT 0,
  ultimo_ok DATETIME NULL,
  criado_em DATETIME NOT NULL
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_ajustes (
  chave VARCHAR(40) NOT NULL PRIMARY KEY,
  valor TEXT NOT NULL
)$fim";
    $sql[] = "CREATE TABLE IF NOT EXISTS pd_notas (
  id CHAR(36) NOT NULL PRIMARY KEY,
  origem VARCHAR(12) NOT NULL,
  registro_id CHAR(36) NOT NULL,
  texto VARCHAR(1000) NOT NULL,
  criado_em DATETIME NOT NULL" . $k('pd_notas_idx', 'registro_id, criado_em') . "
)$fim";
    foreach ([['pd_limite', 'pd_limite_idx', 'chave, criado_em'], ['pd_solicitacoes', 'pd_solicitacoes_idx', 'criado_em'],
              ['pd_contatos', 'pd_contatos_idx', 'criado_em'], ['pd_historico_status', 'pd_historico_idx', 'registro_id, criado_em'],
              ['pd_produtos', 'pd_produtos_idx', 'ativo, destaque, ordem'],
              ['pd_acessos', 'pd_acessos_idx', 'dia'], ['pd_auditoria', 'pd_auditoria_idx', 'criado_em'],
              ['pd_logs', 'pd_logs_idx', 'criado_em'], ['pd_notas', 'pd_notas_idx', 'registro_id, criado_em']] as [$t, $n, $c]) {
        foreach ($idx($t, $n, $c) as $s) $sql[] = $s;
    }
    return $sql;
}

function pd_criar_tabelas(PDO $pdo): void {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    foreach (pd_schema($driver === 'mysql' ? 'mysql' : 'sqlite') as $s) $pdo->exec($s);
    $existe = $pdo->query("SELECT COUNT(*) FROM pd_contagem WHERE chave = 'protocolo'")->fetchColumn();
    if ((int)$existe === 0) $pdo->exec("INSERT INTO pd_contagem (chave, valor) VALUES ('protocolo', 0)");
}

const PD_SCHEMA_VERSAO = 2;

/** Atualiza bancos já instalados (cria as tabelas novas uma única vez). Nunca derruba a página. */
function pd_migrar(PDO $pdo): void {
    try {
        $v = $pdo->query("SELECT valor FROM pd_contagem WHERE chave = 'schema'")->fetchColumn();
        if ($v !== false && (int)$v >= PD_SCHEMA_VERSAO) return;
        $tem = $pdo->query("SELECT COUNT(*) FROM pd_contagem WHERE chave = 'protocolo'")->fetchColumn();
        if ((int)$tem === 0) return;                       // instalação ainda não concluída
        pd_criar_tabelas($pdo);
        if ($v === false) $pdo->exec("INSERT INTO pd_contagem (chave, valor) VALUES ('schema', " . PD_SCHEMA_VERSAO . ")");
        else $pdo->exec("UPDATE pd_contagem SET valor = " . PD_SCHEMA_VERSAO . " WHERE chave = 'schema'");
    } catch (Throwable $e) {
        error_log('PD: migração do banco: ' . $e->getMessage());
    }
}
