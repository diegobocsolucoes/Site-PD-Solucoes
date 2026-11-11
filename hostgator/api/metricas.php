<?php
declare(strict_types=1);
/* Contagem anônima de acessos: sem cookies, sem guardar IP (só uma identificação que muda todo dia). */
require __DIR__ . '/inc/boot.php';

pd_exigir_metodo('POST');
function pd_ok_vazio(): never { http_response_code(204); header('Cache-Control: no-store'); exit; }
if (!pd_origem_ok()) pd_ok_vazio();
$ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|facebookexternalhit|preview|headless|monitor|curl|wget|python|scrapy|lighthouse/i', $ua)) pd_ok_vazio();
$c = pd_ler_json(600);
$caminho = is_string($c['c'] ?? null) ? $c['c'] : '';
if (!preg_match('#^/((screens/[a-z0-9-]{3,40}/)?(index\.html)?|privacidade\.html)$#', $caminho)) pd_ok_vazio();
$caminho = preg_replace('#index\.html$#', '', $caminho);

$origem = 'direto';
$ref = is_string($c['r'] ?? null) ? $c['r'] : '';
if ($ref !== '') {
    $host = strtolower((string)(parse_url($ref, PHP_URL_HOST) ?: ''));
    $host = preg_replace('/^www\./', '', $host);
    $meus = array_map(fn($h) => preg_replace('/^www\./', '', strtolower(explode(':', $h)[0])), pd_config()['hosts'] ?? []);
    if ($host !== '') $origem = in_array($host, $meus, true) ? 'interno' : substr($host, 0, 60);
}
$disp = preg_match('/iPad|Tablet/i', $ua) ? 'tablet' : (preg_match('/Mobi|Android|iPhone/i', $ua) ? 'celular' : 'desktop');
$dia = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
if (!pd_limitar('metrica', 240, 3600)) pd_ok_vazio();
$visitante = substr(hash_hmac('sha256', pd_ip() . '|' . $ua . '|' . $dia, (string)(pd_config()['sal'] ?? '')), 0, 16);
try {
    pd_db()->prepare('INSERT INTO pd_acessos (id, dia, caminho, origem, dispositivo, visitante, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)')
        ->execute([pd_uuid(), $dia, $caminho, $origem, $disp, $visitante, pd_agora()]);
    if (random_int(1, 200) === 1) {
        pd_db()->prepare('DELETE FROM pd_acessos WHERE criado_em < ?')->execute([gmdate('Y-m-d H:i:s', time() - 400 * 86400)]);
    }
} catch (Throwable $e) { error_log('PD: métrica: ' . $e->getMessage()); }
pd_ok_vazio();
