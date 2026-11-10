<?php
declare(strict_types=1);
/** Autenticação do Painel PD: senha + TOTP, sessão segura, CSRF e bloqueio por tentativas. */

const PD_TENTATIVAS_MAX = 5;
const PD_BLOQUEIO_SEGUNDOS = 900;      // 15 minutos
const PD_SESSAO_OCIOSA = 1800;         // 30 minutos sem uso
const PD_SESSAO_MAXIMA = 28800;        // 8 horas no total

/* ---------- TOTP (RFC 6238, compatível com Google Authenticator, Authy etc.) ---------- */

function pd_base32_codificar(string $bin): string {
    $alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split($bin) as $c) $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
    $saida = '';
    foreach (str_split($bits, 5) as $grupo) $saida .= $alfabeto[bindec(str_pad($grupo, 5, '0'))];
    return $saida;
}

function pd_base32_decodificar(string $texto): string {
    $alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    $bits = '';
    foreach (str_split(strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $texto) ?? '')) as $c) {
        $bits .= str_pad(decbin((int)strpos($alfabeto, $c)), 5, '0', STR_PAD_LEFT);
    }
    $bin = '';
    foreach (str_split($bits, 8) as $byte) if (strlen($byte) === 8) $bin .= chr(bindec($byte));
    return $bin;
}

function pd_totp_gerar_segredo(): string { return pd_base32_codificar(random_bytes(20)); }

function pd_totp_codigo(string $segredoB32, int $passo): string {
    $chave = pd_base32_decodificar($segredoB32);
    $mac = hash_hmac('sha1', pack('N2', 0, $passo), $chave, true);
    $o = ord($mac[19]) & 0x0f;
    $n = ((ord($mac[$o]) & 0x7f) << 24) | (ord($mac[$o + 1]) << 16) | (ord($mac[$o + 2]) << 8) | ord($mac[$o + 3]);
    return str_pad((string)($n % 1000000), 6, '0', STR_PAD_LEFT);
}

/** Devolve o passo de 30 s aceito (ou null). Passos já usados são recusados (anti-reuso). */
function pd_totp_verificar(string $segredoB32, string $codigo, int $ultimoPasso, ?int $agora = null): ?int {
    if (!preg_match('/^\d{6}$/', $codigo)) return null;
    $atual = intdiv($agora ?? time(), 30);
    for ($d = -1; $d <= 1; $d++) {
        $passo = $atual + $d;
        if ($passo > $ultimoPasso && hash_equals(pd_totp_codigo($segredoB32, $passo), $codigo)) return $passo;
    }
    return null;
}

/* ---------- Sessão ---------- */

function pd_sessao_iniciar(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $dir = pd_config()['sessoes'] ?? '';
    if ($dir !== '') {
        if (!is_dir($dir)) @mkdir($dir, 0700, true);
        if (is_dir($dir) && is_writable($dir)) session_save_path($dir);
    }
    session_name('pdsid');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string)PD_SESSAO_MAXIMA);
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => pd_https(),
        'httponly' => true, 'samesite' => 'Strict']);
    session_start();
    $agora = time();
    if (isset($_SESSION['inicio'])) {
        if ($agora - (int)$_SESSION['inicio'] > PD_SESSAO_MAXIMA || $agora - (int)($_SESSION['ultimo'] ?? 0) > PD_SESSAO_OCIOSA) {
            pd_sessao_destruir();
            session_start();
        }
    }
    $_SESSION['ultimo'] = $agora;
}

function pd_sessao_destruir(): void {
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
    setcookie('pdsid', '', ['expires' => time() - 3600, 'path' => '/', 'secure' => pd_https(), 'httponly' => true, 'samesite' => 'Strict']);
}

function pd_sessao_promover(string $etapa, string $adminId): void {
    session_regenerate_id(true);
    $_SESSION['etapa'] = $etapa;
    $_SESSION['admin_id'] = $adminId;
    $_SESSION['inicio'] = $_SESSION['inicio'] ?? time();
    if ($etapa === 'aal2') $_SESSION['csrf'] = bin2hex(random_bytes(24));
}

/** Exige administrador com senha + segundo fator. Em alterações, exige Origin e token CSRF. */
function pd_exigir_admin(bool $alterando): string {
    pd_sessao_iniciar();
    if (($_SESSION['etapa'] ?? '') !== 'aal2' || empty($_SESSION['admin_id'])) {
        pd_falha(401, 'Sessão expirada. Entre novamente.');
    }
    if ($alterando) {
        if (!pd_origem_ok()) pd_falha(403, 'Origem não autorizada.');
        $enviado = $_SERVER['HTTP_X_PD_CSRF'] ?? '';
        if (!is_string($enviado) || !hash_equals((string)$_SESSION['csrf'], $enviado)) {
            pd_falha(403, 'Sessão inválida. Recarregue o painel.');
        }
    }
    return (string)$_SESSION['admin_id'];
}

/* ---------- Bloqueio por tentativas ---------- */

function pd_admin_buscar(string $usuario): ?array {
    $q = pd_db()->prepare('SELECT * FROM pd_admin WHERE usuario = ?');
    $q->execute([$usuario]);
    $r = $q->fetch();
    return $r ?: null;
}

function pd_admin_bloqueado(array $admin): bool {
    return !empty($admin['bloqueado_ate']) && strtotime($admin['bloqueado_ate'] . ' UTC') > time();
}

function pd_admin_registrar_falha(array $admin): void {
    $tent = (int)$admin['tentativas'] + 1;
    $bloqueio = null;
    if ($tent >= PD_TENTATIVAS_MAX) {
        $bloqueio = gmdate('Y-m-d H:i:s', time() + PD_BLOQUEIO_SEGUNDOS);
        $tent = 0;
    }
    pd_db()->prepare('UPDATE pd_admin SET tentativas = ?, bloqueado_ate = ? WHERE id = ?')
        ->execute([$tent, $bloqueio, $admin['id']]);
}

function pd_admin_zerar_falhas(string $id): void {
    pd_db()->prepare('UPDATE pd_admin SET tentativas = 0, bloqueado_ate = NULL WHERE id = ?')->execute([$id]);
}
