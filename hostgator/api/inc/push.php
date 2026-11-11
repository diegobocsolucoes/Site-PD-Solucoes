<?php
declare(strict_types=1);
/*
 * Notificações push (Web Push, RFC 8030 / 8291 / 8292) sem bibliotecas externas.
 * Funciona no iPhone (iOS 16.4+, painel instalado na tela inicial), Android e computador.
 */

function pd_b64u(string $bin): string { return rtrim(strtr(base64_encode($bin), '+/', '-_'), '='); }
function pd_b64u_dec(string $s): string {
    $r = base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4), true);
    return $r === false ? '' : $r;
}

/* ---------- ajustes guardados no banco ---------- */

function pd_ajuste(string $chave): ?string {
    $q = pd_db()->prepare('SELECT valor FROM pd_ajustes WHERE chave = ?');
    $q->execute([$chave]);
    $v = $q->fetchColumn();
    return $v === false ? null : (string)$v;
}
function pd_ajuste_gravar(string $chave, string $valor): void {
    $pdo = pd_db();
    $pdo->prepare('DELETE FROM pd_ajustes WHERE chave = ?')->execute([$chave]);
    $pdo->prepare('INSERT INTO pd_ajustes (chave, valor) VALUES (?, ?)')->execute([$chave, $valor]);
}

/* ---------- chaves VAPID (identificam o servidor da PD perante o Apple/Google) ---------- */

/** Devolve [privada 32 bytes, pública 65 bytes]; cria o par na primeira vez. */
function pd_vapid_chaves(): array {
    $priv = pd_ajuste('vapid_privada');
    $pub = pd_ajuste('vapid_publica');
    if ($priv !== null && $pub !== null) return [pd_b64u_dec($priv), pd_b64u_dec($pub)];
    $k = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$k) throw new RuntimeException('OpenSSL sem suporte a curva P-256.');
    $ec = openssl_pkey_get_details($k)['ec'];
    $d = str_pad($ec['d'], 32, "\0", STR_PAD_LEFT);
    $publica = "\x04" . str_pad($ec['x'], 32, "\0", STR_PAD_LEFT) . str_pad($ec['y'], 32, "\0", STR_PAD_LEFT);
    pd_ajuste_gravar('vapid_privada', pd_b64u($d));
    pd_ajuste_gravar('vapid_publica', pd_b64u($publica));
    return [$d, $publica];
}

/** Monta a chave privada EC (PEM) a partir de d e do ponto público. */
function pd_ec_privada_pem(string $d, string $publica): string {
    $der = "\x30\x77\x02\x01\x01\x04\x20" . $d . "\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07\xa1\x44\x03\x42\x00" . $publica;
    return "-----BEGIN EC PRIVATE KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END EC PRIVATE KEY-----\n";
}

function pd_ec_publica_pem(string $publica): string {
    $der = hex2bin('3059301306072a8648ce3d020106082a8648ce3d030107034200') . $publica;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n";
}

/** Converte assinatura ECDSA em DER para o formato bruto r||s (64 bytes) exigido pelo JWT ES256. */
function pd_der_para_rs(string $der): string {
    $o = 2;
    if (ord($der[1]) & 0x80) $o += ord($der[1]) & 0x7f;
    $partes = [];
    for ($i = 0; $i < 2; $i++) {
        $tam = ord($der[$o + 1]);
        $v = substr($der, $o + 2, $tam);
        $partes[] = str_pad(ltrim($v, "\0"), 32, "\0", STR_PAD_LEFT);
        $o += 2 + $tam;
    }
    return $partes[0] . $partes[1];
}

function pd_vapid_jwt(string $audiencia, string $contato, string $d, string $publica, ?int $exp = null): string {
    $cab = pd_b64u(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $cor = pd_b64u(json_encode(['aud' => $audiencia, 'exp' => $exp ?? time() + 12 * 3600, 'sub' => $contato], JSON_UNESCAPED_SLASHES));
    $dados = $cab . '.' . $cor;
    $pem = pd_ec_privada_pem($d, $publica);
    if (!openssl_sign($dados, $der, $pem, OPENSSL_ALGO_SHA256)) throw new RuntimeException('Falha ao assinar o VAPID.');
    return $dados . '.' . pd_b64u(pd_der_para_rs($der));
}

/* ---------- criptografia da mensagem (aes128gcm, RFC 8291) ---------- */

/**
 * Cifra $texto para um navegador inscrito. Os parâmetros opcionais existem só para testes com vetores fixos.
 * Devolve o corpo da requisição (cabeçalho do registro + texto cifrado).
 */
function pd_push_cifrar(string $texto, string $uaPublica, string $segredoAuth, ?string $asPrivada = null, ?string $asPublica = null, ?string $sal = null): string {
    if (strlen($uaPublica) !== 65 || strlen($segredoAuth) !== 16) throw new InvalidArgumentException('Inscrição inválida.');
    if ($asPrivada === null) {
        $k = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        $ec = openssl_pkey_get_details($k)['ec'];
        $asPrivada = str_pad($ec['d'], 32, "\0", STR_PAD_LEFT);
        $asPublica = "\x04" . str_pad($ec['x'], 32, "\0", STR_PAD_LEFT) . str_pad($ec['y'], 32, "\0", STR_PAD_LEFT);
    }
    $sal = $sal ?? random_bytes(16);
    $minha = openssl_pkey_get_private(pd_ec_privada_pem($asPrivada, $asPublica));
    $dele = openssl_pkey_get_public(pd_ec_publica_pem($uaPublica));
    if (!$minha || !$dele) throw new RuntimeException('Chave de inscrição inválida.');
    $compartilhado = openssl_pkey_derive($dele, $minha, 32);
    if ($compartilhado === false) throw new RuntimeException('Falha no acordo de chaves.');
    $ikm = hash_hkdf('sha256', $compartilhado, 32, "WebPush: info\0" . $uaPublica . $asPublica, $segredoAuth);
    $cek = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $sal);
    $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $sal);
    $tag = '';
    $cifrado = openssl_encrypt($texto . "\x02", 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
    if ($cifrado === false) throw new RuntimeException('Falha ao cifrar.');
    return $sal . pack('N', 4096) . chr(65) . $asPublica . $cifrado . $tag;
}

/* ---------- envio ---------- */

/** Envia uma notificação a uma inscrição. Devolve [status HTTP, resposta] (status 0 = falha de rede). */
function pd_push_enviar(array $insc, array $mensagem): array {
    [$d, $publica] = pd_vapid_chaves();
    $partes = parse_url($insc['endpoint']);
    if (!$partes || ($partes['scheme'] ?? '') !== 'https' || empty($partes['host'])) return [0, 'endpoint inválido'];
    $aud = 'https://' . $partes['host'] . (isset($partes['port']) ? ':' . $partes['port'] : '');
    $contato = 'mailto:' . (filter_var(pd_config()['aviso']['de'] ?? '', FILTER_VALIDATE_EMAIL) ?: 'avisos@pdsolucoesdigitais.com.br');
    try {
        $jwt = pd_vapid_jwt($aud, $contato, $d, $publica);
        $corpo = pd_push_cifrar(json_encode($mensagem, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            pd_b64u_dec($insc['p256dh']), pd_b64u_dec($insc['auth']));
    } catch (Throwable $e) { return [0, $e->getMessage()]; }
    $cab = ['Content-Type: application/octet-stream', 'Content-Encoding: aes128gcm', 'TTL: 86400', 'Urgency: high',
            'Authorization: vapid t=' . $jwt . ', k=' . pd_b64u($publica), 'Content-Length: ' . strlen($corpo)];
    if (function_exists('curl_init')) {
        $c = curl_init($insc['endpoint']);
        curl_setopt_array($c, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $corpo, CURLOPT_HTTPHEADER => $cab,
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4]);
        $r = curl_exec($c);
        $status = (int)curl_getinfo($c, CURLINFO_HTTP_CODE);
        $erro = curl_error($c);
        curl_close($c);
        return [$status, $r === false ? $erro : (string)$r];
    }
    $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => implode("\r\n", $cab), 'content' => $corpo,
        'timeout' => 8, 'ignore_errors' => true]]);
    $r = @file_get_contents($insc['endpoint'], false, $ctx);
    $status = 0;
    foreach ($http_response_header ?? [] as $h) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $m)) $status = (int)$m[1];
    return [$status, $r === false ? 'sem resposta' : (string)$r];
}

/** Avisa todos os celulares inscritos. Remove inscrições mortas (404/410). Nunca lança erro. */
function pd_push_avisar(string $titulo, string $texto, string $url = '/painel/', string $tag = 'pedido'): array {
    $res = ['enviados' => 0, 'falhas' => 0, 'total' => 0];
    try {
        $pdo = pd_db();
        $inscritos = $pdo->query('SELECT * FROM pd_push')->fetchAll();
        $res['total'] = count($inscritos);
        $mensagem = ['titulo' => $titulo, 'texto' => $texto, 'url' => $url, 'tag' => $tag];
        foreach ($inscritos as $i) {
            [$status, $resp] = pd_push_enviar($i, $mensagem);
            if ($status >= 200 && $status < 300) {
                $res['enviados']++;
                $pdo->prepare('UPDATE pd_push SET falhas = 0, ultimo_ok = ? WHERE id = ?')->execute([pd_agora(), $i['id']]);
            } elseif ($status === 404 || $status === 410) {
                $pdo->prepare('DELETE FROM pd_push WHERE id = ?')->execute([$i['id']]);
                pd_log('aviso', 'push', 'Celular removido: o aparelho cancelou as notificações (' . $status . ').');
                $res['falhas']++;
            } else {
                $res['falhas']++;
                $pdo->prepare('UPDATE pd_push SET falhas = falhas + 1 WHERE id = ?')->execute([$i['id']]);
                pd_log('erro', 'push', 'Falha ao notificar celular (HTTP ' . $status . '): ' . substr((string)$resp, 0, 150));
            }
        }
    } catch (Throwable $e) {
        pd_log('erro', 'push', 'Erro nas notificações: ' . $e->getMessage());
    }
    return $res;
}
