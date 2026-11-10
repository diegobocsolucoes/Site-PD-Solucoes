<?php
declare(strict_types=1);
/*
 * Instalador de uso único: cria as tabelas e o administrador (com segundo fator).
 * Depois de concluir, APAGUE este arquivo do servidor.
 */
require __DIR__ . '/api/inc/boot.php';
require __DIR__ . '/api/inc/schema.php';
require __DIR__ . '/api/inc/admin.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
$e = fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

function pagina(string $titulo, string $corpo): never {
    echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<meta name="robots" content="noindex"><title>' . $titulo . '</title><style>'
       . 'body{font:16px/1.5 Arial,sans-serif;background:#07120a;color:#f2fff5;margin:0;padding:24px}main{max-width:620px;margin:auto}'
       . 'h1{color:#79d497;font-size:24px}label{display:block;margin:14px 0 4px;font-weight:700}input{width:100%;box-sizing:border-box;padding:12px;'
       . 'background:#0b1910;color:#fff;border:1px solid #4b8058;border-radius:5px;font-size:16px}button{margin-top:18px;padding:13px 22px;background:#21603a;'
       . 'color:#fff;border:1px solid #79d497;border-radius:5px;font-weight:700;font-size:16px;cursor:pointer}.ok{color:#9be5ae}.err{color:#ffb4b4}'
       . 'code{display:block;padding:12px;background:#111a14;border:1px solid #416c4c;overflow-wrap:anywhere;margin:8px 0}li{margin:4px 0}</style></head><body><main>'
       . $corpo . '</main></body></html>';
    exit;
}

$cfg = pd_config();
$privado = (string)($cfg['dir_privado'] ?? '');
$lock = $privado . '/instalado.lock';
$token = (string)($cfg['instalacao_token'] ?? '');
if ($token === '' || strlen($token) < 16 || $privado === '') {
    pagina('Instalação', '<h1>Configuração incompleta</h1><p class="err">Defina <b>instalacao_token</b> (16+ caracteres) e <b>dir_privado</b> no config.php.</p>');
}
if (is_file($lock)) {
    pagina('Instalação', '<h1>Instalação já concluída</h1><p>Por segurança, <b>apague o arquivo instalar.php</b> do servidor.</p>'
        . '<p>Para refazer o acesso do administrador (senha ou celular perdido), apague também o arquivo <b>pd-privado/instalado.lock</b> e abra esta página de novo.</p>');
}

$checagens = [
    'PHP 8.0 ou mais novo (' . PHP_VERSION . ')' => version_compare(PHP_VERSION, '8.0.0', '>='),
    'Extensão PDO MySQL' => extension_loaded('pdo_mysql') || extension_loaded('pdo_sqlite'),
    'Extensão mbstring' => extension_loaded('mbstring'),
    'Pasta privada gravável' => is_writable($privado),
];
$uploads = __DIR__ . '/uploads';
if (!is_dir($uploads)) @mkdir($uploads, 0755, true);
$checagens['Pasta de fotos gravável'] = is_dir($uploads) && is_writable($uploads);
$lista = '';
$tudoOk = true;
foreach ($checagens as $nome => $ok) { $lista .= '<li class="' . ($ok ? 'ok' : 'err') . '">' . ($ok ? '✔ ' : '✘ ') . $e($nome) . '</li>'; $tudoOk = $tudoOk && $ok; }

$erro = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && $tudoOk) {
    $t = (string)($_POST['token'] ?? '');
    $usuario = trim((string)($_POST['usuario'] ?? ''));
    $senha = (string)($_POST['senha'] ?? '');
    if (!hash_equals($token, $t)) $erro = 'Código de instalação incorreto (está no config.php, campo instalacao_token).';
    elseif (!preg_match('/^[a-z0-9._-]{3,60}$/', $usuario)) $erro = 'Usuário: 3 a 60 caracteres (letras minúsculas, números, ponto, hífen ou sublinhado).';
    elseif (strlen($senha) < 12) $erro = 'A senha precisa ter pelo menos 12 caracteres.';
    elseif ($senha !== (string)($_POST['senha2'] ?? '')) $erro = 'As senhas não conferem.';
    else {
        try {
            $db = $cfg['db'] ?? [];
            $pdo = new PDO($db['dsn'] ?? '', $db['usuario'] ?? null, $db['senha'] ?? null,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
            pd_criar_tabelas($pdo);
            $segredo = pd_totp_gerar_segredo();
            $hash = password_hash($senha, PASSWORD_DEFAULT);
            $q = $pdo->prepare('SELECT id FROM pd_admin WHERE usuario = ?');
            $q->execute([$usuario]);
            if ($q->fetchColumn()) {
                $pdo->prepare('UPDATE pd_admin SET senha_hash = ?, totp_segredo = ?, totp_ultimo_passo = 0, tentativas = 0, bloqueado_ate = NULL WHERE usuario = ?')
                    ->execute([$hash, $segredo, $usuario]);
            } else {
                $pdo->prepare('INSERT INTO pd_admin (id, usuario, senha_hash, totp_segredo, criado_em) VALUES (?, ?, ?, ?, ?)')
                    ->execute([pd_uuid(), $usuario, $hash, $segredo, pd_agora()]);
            }
            if (file_put_contents($lock, 'instalado em ' . gmdate('c') . "\n") === false) throw new RuntimeException('Não foi possível gravar o arquivo de trava.');
            $uri = 'otpauth://totp/' . rawurlencode('PD Painel:' . $usuario) . '?secret=' . $segredo . '&issuer=' . rawurlencode('PD Painel');
            pagina('Instalação concluída', '<h1>Instalação concluída</h1>'
                . '<p>Tabelas criadas e administrador <b>' . $e($usuario) . '</b> cadastrado.</p>'
                . '<h2>Cadastre o segundo fator agora</h2><p>No Google Authenticator, Microsoft Authenticator ou Authy, escolha <b>Inserir chave de configuração</b> '
                . '(conta: PD Painel, tipo: baseado em tempo) e digite esta chave. Ela <b>não será mostrada de novo</b>:</p>'
                . '<code>' . $e($segredo) . '</code><p>Se preferir, o link para apps que aceitam: <code>' . $e($uri) . '</code></p>'
                . '<h2>Agora</h2><ol><li>Apague o arquivo <b>instalar.php</b> do servidor (Gerenciador de Arquivos).</li>'
                . '<li>Abra <b>/painel/</b> e entre com usuário, senha e o código de 6 dígitos.</li></ol>');
        } catch (Throwable $ex) {
            error_log('PD instalador: ' . $ex->getMessage());
            $erro = 'Não foi possível concluir. Confira os dados do banco no config.php (nome, usuário e senha do MySQL) e tente de novo.';
        }
    }
}

$campo = fn(string $n, string $r, string $t = 'text', string $extra = '') =>
    '<label for="' . $n . '">' . $r . '</label><input id="' . $n . '" name="' . $n . '" type="' . $t . '" required ' . $extra . '>';
pagina('Instalação do Painel PD',
    '<h1>Instalação do Painel PD</h1><ul>' . $lista . '</ul>'
    . ($erro !== '' ? '<p class="err" role="alert">' . $e($erro) . '</p>' : '')
    . ($tudoOk ? '<form method="post" autocomplete="off">'
        . $campo('token', 'Código de instalação (campo instalacao_token do config.php)', 'password')
        . $campo('usuario', 'Usuário do administrador', 'text', 'minlength="3" maxlength="60" value="' . $e((string)($_POST['usuario'] ?? '')) . '"')
        . $campo('senha', 'Senha (mínimo 12 caracteres)', 'password', 'minlength="12"')
        . $campo('senha2', 'Repita a senha', 'password', 'minlength="12"')
        . '<button>INSTALAR</button></form>' : '<p class="err">Corrija os itens marcados com ✘ antes de continuar.</p>'));
