<?php
declare(strict_types=1);
/*
 * Núcleo da API da PD Soluções Digitais (PHP 8 + MySQL).
 * Este arquivo só define funções: não imprime nada quando aberto direto.
 */

function pd_cabecalhos_json(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
}

function pd_json(array $dados, int $status = 200): never {
    http_response_code($status);
    pd_cabecalhos_json();
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function pd_falha(int $status, string $mensagem): never {
    pd_json(['erro' => $mensagem], $status);
}

function pd_config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $candidatos = [];
    $forcado = getenv('PD_CONFIG');
    if ($forcado) $candidatos[] = $forcado;
    // Procura pd-privado/config.php acima da pasta pública (fora do alcance do navegador).
    $dir = __DIR__;
    for ($i = 0; $i < 6; $i++) {
        $candidatos[] = $dir . '/pd-privado/config.php';
        $dir = dirname($dir);
    }
    foreach ($candidatos as $arquivo) {
        if (is_file($arquivo)) {
            $cfg = require $arquivo;
            if (is_array($cfg)) return $cfg;
        }
    }
    pd_falha(503, 'Atendimento temporariamente indisponível.');
}

function pd_db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $db = pd_config()['db'] ?? [];
    try {
        $pdo = new PDO($db['dsn'] ?? '', $db['usuario'] ?? null, $db['senha'] ?? null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (Throwable $e) {
        error_log('PD: falha ao conectar no banco: ' . $e->getMessage());
        pd_falha(503, 'Serviço indisponível. Tente novamente em instantes.');
    }
    return $pdo;
}

function pd_agora(): string { return gmdate('Y-m-d H:i:s'); }

function pd_uuid(): string {
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    $h = bin2hex($b);
    return substr($h, 0, 8) . '-' . substr($h, 8, 4) . '-' . substr($h, 12, 4) . '-' . substr($h, 16, 4) . '-' . substr($h, 20, 12);
}

function pd_https(): bool {
    return (($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? '') !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function pd_ip(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'sem-ip';
    if (!empty(pd_config()['confiar_proxy'])) {
        $xff = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '')[0]);
        if ($xff !== '' && filter_var($xff, FILTER_VALIDATE_IP)) $ip = $xff;
    }
    return $ip;
}

function pd_hash_ip(): string {
    return hash_hmac('sha256', pd_ip(), (string)(pd_config()['sal'] ?? ''));
}

/** Aceita só chamadas vindas do próprio site (Origin ou Referer com o domínio configurado). */
function pd_origem_ok(): bool {
    $hosts = pd_config()['hosts'] ?? [];
    $fonte = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($fonte === '') $fonte = $_SERVER['HTTP_REFERER'] ?? '';
    if ($fonte === '') return false;
    $parte = parse_url($fonte);
    if (!$parte || empty($parte['host'])) return false;
    $host = strtolower($parte['host']) . (isset($parte['port']) ? ':' . $parte['port'] : '');
    return in_array($host, array_map('strtolower', $hosts), true);
}

function pd_ler_json(int $limite): array {
    $tipo = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($tipo, 'application/json') !== 0) pd_falha(415, 'Envie os dados em JSON.');
    $corpo = file_get_contents('php://input', false, null, 0, $limite + 1);
    if ($corpo === false || strlen($corpo) > $limite) pd_falha(413, 'Solicitação muito grande.');
    $dados = json_decode($corpo, true);
    if (!is_array($dados)) pd_falha(400, 'JSON inválido.');
    return $dados;
}

function pd_exigir_metodo(string ...$metodos): void {
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', $metodos, true)) {
        header('Allow: ' . implode(', ', $metodos));
        pd_falha(405, 'Método não permitido.');
    }
}

/** Limite de envios por visitante. Retorna false quando passou do máximo. */
function pd_limitar(string $escopo, int $maximo, int $janelaSegundos): bool {
    $pdo = pd_db();
    $chave = hash('sha256', $escopo . '|' . pd_hash_ip());
    $corte = gmdate('Y-m-d H:i:s', time() - $janelaSegundos);
    $q = $pdo->prepare('SELECT COUNT(*) FROM pd_limite WHERE chave = ? AND criado_em > ?');
    $q->execute([$chave, $corte]);
    if ((int)$q->fetchColumn() >= $maximo) return false;
    $pdo->prepare('INSERT INTO pd_limite (id, chave, criado_em) VALUES (?, ?, ?)')
        ->execute([pd_uuid(), $chave, pd_agora()]);
    if (random_int(1, 50) === 1) {
        $pdo->prepare('DELETE FROM pd_limite WHERE criado_em < ?')
            ->execute([gmdate('Y-m-d H:i:s', time() - 86400)]);
    }
    return true;
}

function pd_proximo_protocolo(string $prefixo): string {
    $pdo = pd_db();
    $pdo->beginTransaction();
    try {
        $pdo->exec("UPDATE pd_contagem SET valor = valor + 1 WHERE chave = 'protocolo'");
        $n = (int)$pdo->query("SELECT valor FROM pd_contagem WHERE chave = 'protocolo'")->fetchColumn();
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
    $ano = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('Y');
    return $prefixo . '-' . $ano . '-' . ($n < 10000 ? str_pad((string)$n, 4, '0', STR_PAD_LEFT) : (string)$n);
}

function pd_turnstile_ok(string $token): bool {
    $segredo = pd_config()['turnstile_segredo'] ?? '';
    if ($segredo === '') return true;            // proteção opcional: só vale se configurada
    if ($token === '' || strlen($token) > 2048) return false;
    $dados = http_build_query(['secret' => $segredo, 'response' => $token, 'remoteip' => pd_ip()]);
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'timeout' => 7,
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'content' => $dados,
    ]]);
    $r = @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $ctx);
    if ($r === false) return false;
    $j = json_decode($r, true);
    return is_array($j) && ($j['success'] ?? false) === true;
}

function pd_linha_segura(string $s): string {
    return trim(preg_replace('/[\r\n\x00-\x1f\x7f]+/', ' ', $s) ?? '');
}

/** Envia o aviso para o e-mail do dono. Nunca lança erro: o pedido já está salvo. */
function pd_enviar_aviso(string $assunto, string $texto): bool {
    $a = pd_config()['aviso'] ?? [];
    $para = array_filter(array_map('trim', explode(',', (string)($a['para'] ?? ''))));
    $de = pd_linha_segura((string)($a['de'] ?? ''));
    if (!$para || $de === '' || !filter_var($de, FILTER_VALIDATE_EMAIL)) {
        error_log('PD: aviso por e-mail não configurado.');
        return false;
    }
    foreach ($para as $p) if (!filter_var($p, FILTER_VALIDATE_EMAIL)) { error_log('PD: e-mail de destino inválido.'); return false; }
    $nome = pd_linha_segura((string)($a['nome'] ?? 'PD Soluções Digitais'));
    $assunto = pd_linha_segura($assunto);
    $texto = str_replace(["\r\n", "\r"], "\n", $texto);
    if (($a['modo'] ?? 'mail') === 'arquivo') {          // usado nos testes
        return file_put_contents($a['arquivo'], "TO: " . implode(',', $para) . "\nSUBJECT: $assunto\n$texto\n---\n", FILE_APPEND) !== false;
    }
    $cabecalhos = [
        'From' => mb_encode_mimeheader($nome, 'UTF-8') . ' <' . $de . '>',
        'MIME-Version' => '1.0',
        'Content-Type' => 'text/plain; charset=UTF-8',
        'Content-Transfer-Encoding' => '8bit',
        'X-Mailer' => 'PD-Portal',
    ];
    try {
        return @mail(implode(',', $para), mb_encode_mimeheader($assunto, 'UTF-8'),
            str_replace("\n", "\r\n", $texto), $cabecalhos, '-f' . $de);
    } catch (Throwable $e) {
        error_log('PD: falha no envio de e-mail: ' . $e->getMessage());
        return false;
    }
}

function pd_link_whatsapp(string $numero): string {
    $n = preg_replace('/\D/', '', $numero) ?? '';
    return 'https://wa.me/' . ((str_starts_with($n, '55') && strlen($n) >= 12) ? $n : '55' . $n);
}

function pd_mascarar_whatsapp(string $numero): string {
    $n = preg_replace('/\D/', '', $numero) ?? '';
    if (str_starts_with($n, '55') && strlen($n) >= 12) $n = substr($n, 2);
    return '(' . substr($n, 0, 2) . ') ' . str_repeat('*', max(0, strlen($n) - 6)) . '-' . substr($n, -4);
}
