<?php
declare(strict_types=1);
/* Teste de conexão com o banco. Apague este arquivo depois de usar. Não guarda a senha digitada. */
require __DIR__ . '/api/inc/boot.php';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
$e = fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

/** Grava usuário, senha e hosts no config.php, com aspas seguras. Retorna mensagem de erro ou ''. */
function pd_gravar_config(string $arquivo, string $u, string $s, string $host): string {
    $t = @file_get_contents($arquivo);
    if ($t === false || !is_writable($arquivo)) return 'Não foi possível ler/gravar o config.php.';
    $q = fn(string $v): string => "'" . str_replace(["\\", "'"], ["\\\\", "\\'"], $v) . "'";
    $n1 = $n2 = $n3 = 0;
    $t = preg_replace_callback("/('usuario'\\s*=>\\s*)'(?:[^'\\\\]|\\\\.)*'/", fn($m) => $m[1] . $q($u), $t, 1, $n1);
    $t = preg_replace_callback("/('senha'\\s*=>\\s*)'(?:[^'\\\\]|\\\\.)*'/", fn($m) => $m[1] . $q($s), $t, 1, $n2);
    $dom = preg_replace('/^www\\./i', '', strtolower($host));
    $t = preg_replace_callback("/('hosts'\\s*=>\\s*)\\[[^\\]]*\\]/", fn($m) => $m[1] . '[' . $q($dom) . ', ' . $q('www.' . $dom) . ']', $t, 1, $n3);
    if ($n1 !== 1 || $n2 !== 1) return 'Não encontrei as linhas usuario/senha no config.php.';
    return file_put_contents($arquivo, $t) === false ? 'Falha ao gravar o config.php.' : '';
}
$cfg = pd_config();
$token = (string)($cfg['instalacao_token'] ?? '');
$saida = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if ($token === '' || !hash_equals($token, (string)($_POST['token'] ?? ''))) {
        $saida = '<p class="err">Código de instalação incorreto.</p>';
    } else {
        $u = (string)($_POST['usuario'] ?? ''); $s = (string)($_POST['senha'] ?? ''); $b = (string)($_POST['banco'] ?? '');
        $cu = (string)($cfg['db']['usuario'] ?? ''); $cs = (string)($cfg['db']['senha'] ?? '');
        $saida .= '<p>Usuário digitado = usuário do config.php: <b>' . ($u === $cu ? 'SIM' : 'NÃO') . '</b></p>';
        $saida .= '<p>Senha digitada = senha do config.php: <b>' . (hash_equals($cs, $s) ? 'SIM' : 'NÃO') . '</b> '
                . '(digitada: ' . strlen($s) . ' caracteres; no config.php: ' . strlen($cs) . ' caracteres)</p>';
        $saida .= '<p>Extensões: pdo_mysql ' . (extension_loaded('pdo_mysql') ? 'sim' : 'NÃO') . '</p><ul>';
        foreach (['localhost', '127.0.0.1'] as $host) {
            foreach (['com banco' => ";dbname=$b", 'sem banco' => ''] as $rotulo => $extra) {
                try {
                    new PDO("mysql:host=$host$extra;charset=utf8mb4", $u, $s, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]);
                    $saida .= '<li class="ok">✔ ' . $e("$host ($rotulo): conectou") . '</li>';
                } catch (Throwable $ex) {
                    $m = str_replace($s, '***', $ex->getMessage());
                    $saida .= '<li class="err">✘ ' . $e("$host ($rotulo): " . mb_substr($m, 0, 200)) . '</li>';
                }
            }
        }
        $saida .= '</ul>';
        $conectou = false;
        try {
            new PDO("mysql:host=localhost;dbname=$b;charset=utf8mb4", $u, $s, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]);
            $conectou = true;
        } catch (Throwable $ex) { /* já mostrado acima */ }
        if (!empty($_POST['gravar'])) {
            if (!$conectou) $saida .= '<p class="err">Não gravei: a conexão com o banco não funcionou com esses dados.</p>';
            else {
                $falha = pd_gravar_config((string)($GLOBALS['pd_config_arquivo'] ?? ''), $u, $s, (string)($_SERVER['HTTP_HOST'] ?? ''));
                $saida .= $falha === '' ? '<p class="ok"><b>✔ Gravado no config.php</b> (usuário, senha e domínios). Agora abra o instalar.php.</p>'
                                        : '<p class="err">' . $e($falha) . '</p>';
            }
        }
    }
}
echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Teste do banco</title><style>'
   . 'body{font:16px/1.5 Arial,sans-serif;background:#07120a;color:#f2fff5;margin:0;padding:24px}main{max-width:640px;margin:auto}label{display:block;margin:12px 0 4px;font-weight:700}'
   . 'input{width:100%;box-sizing:border-box;padding:12px;background:#0b1910;color:#fff;border:1px solid #4b8058;border-radius:5px;font-size:16px}'
   . 'button{margin-top:16px;padding:12px 20px;background:#21603a;color:#fff;border:1px solid #79d497;border-radius:5px;font-weight:700;cursor:pointer}.ok{color:#9be5ae}.err{color:#ffb4b4}</style></head><body><main>'
   . '<h1>Teste do banco</h1>' . $saida
   . '<form method="post" autocomplete="off"><label>Código de instalação</label><input name="token" type="password" required>'
   . '<label>Usuário do MySQL (ex.: pablo299_pdsite)</label><input name="usuario" required>'
   . '<label>Senha do MySQL (digite aqui, sem copiar do config.php)</label><input name="senha" type="text" required>'
   . '<label>Nome do banco (ex.: pablo299_pd)</label><input name="banco" required><label><input type="checkbox" name="gravar" value="1" style="width:auto"> Se conectar, gravar estes dados no config.php</label><button>TESTAR</button></form>'
   . '<p>Depois do teste, apague este arquivo (testa-banco.php).</p></main></body></html>';
