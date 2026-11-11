<?php
declare(strict_types=1);
/* Teste de conexão com o banco. Apague este arquivo depois de usar. Não guarda a senha digitada. */
require __DIR__ . '/api/inc/boot.php';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'");
$e = fn(string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
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
   . '<label>Nome do banco (ex.: pablo299_pd)</label><input name="banco" required><button>TESTAR</button></form>'
   . '<p>Depois do teste, apague este arquivo (testa-banco.php).</p></main></body></html>';
