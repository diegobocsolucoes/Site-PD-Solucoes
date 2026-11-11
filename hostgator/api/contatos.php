<?php
declare(strict_types=1);
require __DIR__ . '/inc/boot.php';
require __DIR__ . '/inc/validar.php';
require __DIR__ . '/inc/push.php';

pd_exigir_metodo('POST');
if (!pd_origem_ok()) pd_falha(403, 'Origem não autorizada.');
[$d, $erro] = pd_validar_contato(pd_ler_json(12000));
if ($erro !== null) pd_falha(422, $erro);
if (!pd_turnstile_ok($d['turnstile'])) pd_falha(422, 'Conclua a verificação de segurança.');
if (!pd_limitar('contato', 5, 1800)) pd_falha(429, 'Limite temporário de solicitações. Tente novamente mais tarde.');

try {
    $pdo = pd_db();
    $id = pd_uuid();
    $protocolo = pd_proximo_protocolo('PD-CT');
    $agora = pd_agora();
    $pdo->prepare('INSERT INTO pd_contatos (id, protocolo, assunto, categoria, status, nome, whatsapp, resumo, aviso_enviado, criado_em, atualizado_em)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)')
        ->execute([$id, $protocolo, $d['assunto'], pd_categoria_padrao($d['assunto']), 'novo', $d['nome'], $d['whatsapp'], $d['resumo'], $agora, $agora]);
} catch (Throwable $e) {
    error_log('PD: falha ao salvar contato: ' . $e->getMessage());
    pd_falha(503, 'Serviço indisponível. Nenhum protocolo foi confirmado.');
}

$titulo = PD_ASSUNTOS[$d['assunto']];
$texto = "Nova solicitação pelo site — $titulo\nProtocolo: $protocolo\nCliente: {$d['nome']}\nWhatsApp: {$d['whatsapp']}\n"
       . "Responder no WhatsApp: " . pd_link_whatsapp($d['whatsapp']) . "\n\nDADOS DO PEDIDO\n{$d['resumo']}\n\n"
       . "Esta mensagem é automática. O pedido também está salvo no Painel PD.";
if (pd_enviar_aviso("[PD] $titulo — {$d['nome']} ($protocolo)", $texto)) {
    $pdo->prepare('UPDATE pd_contatos SET aviso_enviado = 1 WHERE id = ?')->execute([$id]);
}
pd_responder_e_continuar(['protocolo' => $protocolo,
         'aviso' => 'Recebemos a sua solicitação. A PD retorna pelo WhatsApp informado para confirmar.'], 201);
pd_log('info', 'pedido', "Novo pedido $protocolo ($titulo).");
pd_push_avisar('Novo pedido — ' . $titulo . ' (' . PD_CATEGORIAS[pd_categoria_padrao($d['assunto'])] . ')', $d['nome'] . " ($protocolo)", '/painel/', 'pedido-' . $protocolo);
