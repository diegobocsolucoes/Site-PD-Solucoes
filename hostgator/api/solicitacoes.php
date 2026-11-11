<?php
declare(strict_types=1);
require __DIR__ . '/inc/boot.php';
require __DIR__ . '/inc/validar.php';
require __DIR__ . '/inc/push.php';

pd_exigir_metodo('POST');
if (!pd_origem_ok()) pd_falha(403, 'Origem não autorizada.');
[$d, $erro] = pd_validar_solicitacao(pd_ler_json(8192));
if ($erro !== null) pd_falha(422, $erro);
if (!pd_turnstile_ok($d['turnstile'])) pd_falha(422, 'Conclua a verificação de segurança.');
if (!pd_limitar('solicitacao', 3, 1800)) pd_falha(429, 'Limite temporário de solicitações. Tente novamente mais tarde.');

try {
    $pdo = pd_db();
    $id = pd_uuid();
    $protocolo = pd_proximo_protocolo($d['tipo'] === 'servico' ? 'PD-SV' : 'PD-OR');
    $agora = pd_agora();
    $pdo->prepare('INSERT INTO pd_solicitacoes (id, protocolo, tipo, status, nome, whatsapp, equipamento, servico, modalidade, cep, descricao, aviso_enviado, criado_em, atualizado_em)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)')
        ->execute([$id, $protocolo, $d['tipo'], 'novo', $d['nome'], $d['whatsapp'], $d['equipamento'], $d['servico'],
                   $d['modalidade'], $d['cep'], $d['descricao'], $agora, $agora]);
} catch (Throwable $e) {
    error_log('PD: falha ao salvar solicitação: ' . $e->getMessage());
    pd_falha(503, 'Serviço indisponível. Nenhum protocolo foi confirmado.');
}

$titulo = $d['tipo'] === 'orcamento' ? 'Orçamento particular' : 'Atendimento particular';
$texto = "Nova solicitação pelo site — $titulo\nProtocolo: $protocolo\nCliente: {$d['nome']}\nWhatsApp: {$d['whatsapp']}\n"
       . "Responder no WhatsApp: " . pd_link_whatsapp($d['whatsapp']) . "\n\nDADOS DO PEDIDO\n"
       . "Equipamento: {$d['equipamento']}\nServiço: {$d['servico']}\n"
       . 'Modalidade: ' . ($d['modalidade'] === 'presencial' ? 'No endereço' : 'Entrega agendada') . "\n"
       . ($d['cep'] ? "CEP: {$d['cep']}\n" : '') . "Problema: {$d['descricao']}\n\n"
       . "Esta mensagem é automática. O pedido também está salvo no Painel PD.";
if (pd_enviar_aviso("[PD] $titulo — {$d['nome']} ($protocolo)", $texto)) {
    $pdo->prepare('UPDATE pd_solicitacoes SET aviso_enviado = 1 WHERE id = ?')->execute([$id]);
}
pd_responder_e_continuar([
    'protocolo' => $protocolo,
    'resumo' => ['tipo' => $d['tipo'], 'equipamento' => $d['equipamento'], 'servico' => $d['servico'],
                 'modalidade' => $d['modalidade'], 'cep' => $d['cep'], 'whatsapp' => pd_mascarar_whatsapp($d['whatsapp'])],
    'aviso' => 'Recebemos a solicitação. O atendimento dependerá de confirmação pelo WhatsApp.',
], 201);
pd_log('info', 'pedido', "Novo pedido $protocolo ($titulo).");
pd_push_avisar('Nova solicitação — ' . $titulo, $d['nome'] . ' • ' . $d['servico'] . " ($protocolo)", '/painel/', 'pedido-' . $protocolo);
