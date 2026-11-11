<?php
// Imita o .htaccess da HostGator para o servidor embutido do PHP.
$u = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$raiz = $_SERVER['DOCUMENT_ROOT'];
if (preg_match('#^/api/(contatos|solicitacoes|produtos|metricas)$#', $u, $m)) { require "$raiz/api/$m[1].php"; return true; }
if (preg_match('#^/api/admin/(login|totp|sessao|sair|solicitacoes|produtos|foto|metricas|auditoria|logs|push|notas|exportar)$#', $u, $m)) { require "$raiz/api/admin/$m[1].php"; return true; }
if (preg_match('#^/(api/inc|uploads)/.*\.php$#', $u) || preg_match('#^/api/inc/#', $u)) { http_response_code(403); echo 'negado'; return true; }
if ($u === '/painel') { header('Location: /painel/'); return true; }
$arq = $raiz . $u;
if (is_dir($arq) && is_file("$arq/index.html")) { header('Content-Type: text/html; charset=utf-8'); readfile("$arq/index.html"); return true; }
if (is_file($arq)) return false;
http_response_code(404); readfile("$raiz/404.html"); return true;
