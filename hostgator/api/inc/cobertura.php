<?php
declare(strict_types=1);
/*
 * Área de atendimento presencial: raio em km a partir de um CEP-base guardado no painel (nunca vai para o site público).
 * O visitante só recebe "dentro", "fora" ou "indefinido" — nunca coordenadas nem distância.
 */

require_once __DIR__ . '/push.php';

function pd_http_json(string $url): ?array {
    $cab = ['Accept: application/json', 'User-Agent: PD-Solucoes-Digitais/1.0 (portal; contato ' . (pd_config()['aviso']['de'] ?? 'avisos@pdsolucoesdigitais.com.br') . ')'];
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 5, CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_HTTPHEADER => $cab, CURLOPT_FOLLOWLOCATION => false]);
        $r = curl_exec($c); $st = (int)curl_getinfo($c, CURLINFO_HTTP_CODE); curl_close($c);
        if ($r === false || $st < 200 || $st >= 300) return null;
    } else {
        $ctx = stream_context_create(['http' => ['timeout' => 5, 'header' => implode("\r\n", $cab), 'ignore_errors' => true]]);
        $r = @file_get_contents($url, false, $ctx);
        if ($r === false) return null;
    }
    $j = json_decode((string)$r, true);
    return is_array($j) ? $j : null;
}

function pd_distancia_km(float $lat1, float $lon1, float $lat2, float $lon2): float {
    $r = 6371.0088;
    $dLat = deg2rad($lat2 - $lat1); $dLon = deg2rad($lon2 - $lon1);
    $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLon / 2) ** 2;
    return 2 * $r * asin(min(1.0, sqrt($a)));
}

/** Localiza um CEP: ['lat','lon','cidade','bairro'] ou null. Guarda o resultado para não repetir consultas. */
function pd_cep_localizar(string $cep): ?array {
    if (!preg_match('/^\d{8}$/', $cep)) return null;
    $pdo = pd_db();
    $q = $pdo->prepare('SELECT lat, lon, cidade, bairro FROM pd_cep WHERE cep = ?');
    $q->execute([$cep]);
    if ($l = $q->fetch()) return ['lat' => (float)$l['lat'], 'lon' => (float)$l['lon'], 'cidade' => (string)$l['cidade'], 'bairro' => (string)$l['bairro']];

    $achado = null;
    $teste = pd_config()['cobertura_teste'][$cep] ?? null;      // só para testes automáticos
    if (is_array($teste)) $achado = $teste;
    if (!$achado) {                                              // 1) BrasilAPI v2 (já traz coordenadas quando existem)
        $j = pd_http_json('https://brasilapi.com.br/api/cep/v2/' . $cep);
        $co = $j['location']['coordinates'] ?? [];
        if ($j && isset($co['latitude'], $co['longitude']) && is_numeric($co['latitude']) && is_numeric($co['longitude'])) {
            $achado = ['lat' => (float)$co['latitude'], 'lon' => (float)$co['longitude'], 'cidade' => (string)($j['city'] ?? ''), 'bairro' => (string)($j['neighborhood'] ?? '')];
        }
    }
    if (!$achado) {                                              // 2) ViaCEP + OpenStreetMap
        $v = pd_http_json('https://viacep.com.br/ws/' . $cep . '/json/');
        if ($v && empty($v['erro']) && !empty($v['localidade'])) {
            $cidade = (string)$v['localidade']; $bairro = (string)($v['bairro'] ?? ''); $rua = (string)($v['logradouro'] ?? '');
            foreach ([[$rua, $bairro], ['', $bairro], ['', '']] as [$r, $b]) {
                $consulta = trim(implode(', ', array_filter([$r, $b, $cidade, (string)($v['uf'] ?? ''), 'Brasil'])));
                $g = pd_http_json('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' . rawurlencode($consulta));
                if ($g && isset($g[0]['lat'], $g[0]['lon'])) {
                    $achado = ['lat' => (float)$g[0]['lat'], 'lon' => (float)$g[0]['lon'], 'cidade' => $cidade, 'bairro' => $bairro];
                    break;
                }
            }
        }
    }
    if (!$achado) return null;
    try {
        $pdo->prepare('INSERT INTO pd_cep (cep, lat, lon, cidade, bairro, criado_em) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$cep, $achado['lat'], $achado['lon'], substr($achado['cidade'], 0, 60), substr($achado['bairro'], 0, 80), pd_agora()]);
    } catch (Throwable $e) { /* já existia: tudo bem */ }
    return $achado;
}

/** Configuração da área: ['cep' => string, 'raio' => float, 'ponto' => ?array]. */
function pd_cobertura_config(): array {
    $cep = preg_replace('/\D/', '', (string)(pd_ajuste('cob_cep') ?? ''));
    $raio = (float)(pd_ajuste('cob_raio') ?? 5);
    $raio = $raio > 0 ? $raio : 5.0;
    $max = (float)(pd_ajuste('cob_raio_max') ?? 10);
    $taxa = pd_ajuste('cob_taxa');
    return ['cep' => $cep, 'raio' => $raio, 'raio_max' => $max > $raio ? $max : $raio, 'taxa' => $taxa === null ? 325 : (int)$taxa,
            'ponto' => strlen($cep) === 8 ? pd_cep_localizar($cep) : null];
}

/** Avalia um CEP: ['status' => dentro (até o raio) | taxa (entre o raio e o limite, com taxa de deslocamento) | longe (além do limite) | indefinido, 'local' => 'Bairro, Cidade']. */
function pd_cobertura_avaliar(string $cep): array {
    $cep = preg_replace('/\D/', '', $cep);
    $cfg = pd_cobertura_config();
    if (!$cfg['ponto'] || strlen($cep) !== 8) return ['status' => 'indefinido', 'local' => ''];
    $p = pd_cep_localizar($cep);
    if (!$p) return ['status' => 'indefinido', 'local' => ''];
    $km = pd_distancia_km($cfg['ponto']['lat'], $cfg['ponto']['lon'], $p['lat'], $p['lon']);
    $status = $km <= $cfg['raio'] ? 'dentro' : ($km <= $cfg['raio_max'] ? 'taxa' : 'longe');
    return ['status' => $status, 'taxa' => $cfg['taxa'], 'local' => trim($p['bairro'] . ($p['bairro'] && $p['cidade'] ? ', ' : '') . $p['cidade']),
            'km' => round($km, 1)];                                // km só é usado internamente (painel); nunca enviado ao visitante
}
