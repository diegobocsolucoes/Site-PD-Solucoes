<?php
declare(strict_types=1);
/** Regras de validação (mesmas do portal original). Retornam [dados, erro]. */

const PD_SERVICOS = ['formatacao','lento','nao-liga','limpeza','windows','ssd','checkup','virus','travamentos',
    'superaquecimento','programas','backup','wifi','hardware','novo-pc','otimizacao','tela-azul','atualizacoes',
    'transferencia','recuperacao','audio','usb','montagem','outro'];
const PD_ASSUNTOS = ['orcamento-empresarial' => 'Orçamento empresarial', 'chamado-empresarial' => 'Chamado empresarial',
    'parceria' => 'Proposta de parceria', 'loja-rapida' => 'Consulta da Loja Rápida',
    'plano-chamados' => 'Pedido de plano de chamados', 'consultoria-ti' => 'Consultoria de TI', 'seguranca-eletronica' => 'Segurança eletrônica'];
const PD_CATEGORIAS = ['comercial' => 'Comercial', 'chamados' => 'Chamados', 'empresas' => 'Empresas',
    'parcerias' => 'Parcerias', 'loja' => 'Loja Rápida', 'outros' => 'Outros'];
const PD_CATEGORIA_PADRAO = ['orcamento-empresarial' => 'comercial', 'plano-chamados' => 'comercial', 'chamado-empresarial' => 'chamados',
    'consultoria-ti' => 'empresas', 'seguranca-eletronica' => 'empresas', 'parceria' => 'parcerias', 'loja-rapida' => 'loja'];
function pd_categoria_padrao(string $assunto): string { return PD_CATEGORIA_PADRAO[$assunto] ?? 'outros'; }

const PD_STATUS_SOLICITACAO = ['novo','aguardando_contato','cliente_contatado','orcamento_enviado','aguardando_cliente',
    'agendado','em_atendimento','aguardando_peca_cliente','concluido','cancelado','nao_convertido'];
const PD_STATUS_CONTATO = ['novo','contatado','em_andamento','concluido','cancelado'];
const PD_STATUS_PRODUTO = ['disponivel','poucas_unidades','indisponivel'];

function pd_txt(mixed $v): string {
    return is_string($v) ? trim($v) : '';
}
function pd_limpar(string $s): string {
    $s = preg_replace('/[\x00-\x08\x0b-\x1f\x7f]/u', ' ', $s) ?? '';
    return trim(preg_replace('/\s+/u', ' ', $s) ?? '');
}
function pd_len(string $s): int { return mb_strlen($s, 'UTF-8'); }

function pd_whatsapp_valido(string $bruto): ?string {
    $n = preg_replace('/\D/', '', $bruto) ?? '';
    return preg_match('/^(?:\d{10,11}|55\d{10,11})$/', $n) ? $n : null;
}

function pd_validar_solicitacao(array $r): array {
    if (pd_txt($r['site_url'] ?? '') !== '') return [null, 'Solicitação inválida.'];
    $tipo = pd_txt($r['tipo'] ?? '');
    $nome = pd_limpar(pd_txt($r['nome'] ?? ''));
    $zap = pd_whatsapp_valido(pd_txt($r['whatsapp'] ?? ''));
    $equip = pd_txt($r['equipamento'] ?? '');
    $serv = pd_txt($r['servico'] ?? '');
    $mod = pd_txt($r['modalidade'] ?? '');
    $cep = preg_replace('/\D/', '', pd_txt($r['cep'] ?? '')) ?? '';
    $desc = pd_limpar(pd_txt($r['descricao'] ?? ''));
    if (!in_array($tipo, ['servico', 'orcamento'], true)) return [null, 'Selecione atendimento ou orçamento.'];
    if (pd_len($nome) < 2 || pd_len($nome) > 100) return [null, 'Informe seu nome (2 a 100 caracteres).'];
    if ($zap === null) return [null, 'Informe um WhatsApp válido com DDD.'];
    if (!in_array($equip, ['desktop', 'notebook'], true)) return [null, 'Selecione desktop ou notebook.'];
    if (!in_array($serv, PD_SERVICOS, true)) return [null, 'Escolha o serviço desejado.'];
    if (!in_array($mod, ['presencial', 'entrega'], true)) return [null, 'Selecione a modalidade de atendimento.'];
    if ($mod === 'presencial' && !preg_match('/^\d{8}$/', $cep)) return [null, 'Para atendimento no endereço, informe o CEP.'];
    if ($cep !== '' && !preg_match('/^\d{8}$/', $cep)) return [null, 'CEP inválido.'];
    if (pd_len($desc) < 10 || pd_len($desc) > 500) return [null, 'Descreva o problema (10 a 500 caracteres).'];
    return [[
        'tipo' => $tipo, 'nome' => $nome, 'whatsapp' => $zap, 'equipamento' => $equip, 'servico' => $serv,
        'modalidade' => $mod, 'cep' => $cep === '' ? null : $cep, 'descricao' => $desc,
        'turnstile' => pd_txt($r['turnstileToken'] ?? ''),
    ], null];
}

function pd_validar_contato(array $r): array {
    if (pd_txt($r['site_url'] ?? '') !== '') return [null, 'Solicitação inválida.'];
    $assunto = pd_txt($r['assunto'] ?? '');
    if (!array_key_exists($assunto, PD_ASSUNTOS)) return [null, 'Assunto inválido.'];
    $nome = pd_limpar(pd_txt($r['nome'] ?? ''));
    if (pd_len($nome) < 2 || pd_len($nome) > 100) return [null, 'Informe o nome (2 a 100 caracteres).'];
    $zap = pd_whatsapp_valido(pd_txt($r['whatsapp'] ?? ''));
    if ($zap === null) return [null, 'Informe um WhatsApp válido com DDD.'];
    $linhas = $r['linhas'] ?? null;
    if (!is_array($linhas) || count($linhas) < 1 || count($linhas) > 25) return [null, 'Dados do pedido ausentes.'];
    $limpas = [];
    foreach ($linhas as $l) {
        $t = mb_substr(pd_limpar(is_string($l) ? $l : ''), 0, 400, 'UTF-8');
        if ($t !== '') $limpas[] = $t;
    }
    $resumo = implode("\n", $limpas);
    if (pd_len($resumo) < 10 || pd_len($resumo) > 2500) return [null, 'Dados do pedido inválidos.'];
    return [['assunto' => $assunto, 'nome' => $nome, 'whatsapp' => $zap, 'linhas' => $limpas, 'resumo' => $resumo,
             'turnstile' => pd_txt($r['turnstileToken'] ?? '')], null];
}

/** Produto vindo do painel. $parcial=true: edição (valida só o que foi enviado). */
function pd_validar_produto(array $r, bool $parcial): array {
    $d = [];
    $enviou = fn(string $c) => !$parcial || array_key_exists($c, $r);
    if ($enviou('nome')) {
        $v = pd_limpar(pd_txt($r['nome'] ?? ''));
        if (pd_len($v) < 2 || pd_len($v) > 80) return [null, 'Informe o nome do produto (2 a 80 caracteres).'];
        $d['nome'] = $v;
    }
    if ($enviou('categoria')) {
        $v = pd_limpar(pd_txt($r['categoria'] ?? ''));
        if (pd_len($v) < 2 || pd_len($v) > 40) return [null, 'Informe a categoria (2 a 40 caracteres).'];
        $d['categoria'] = $v;
    }
    if ($enviou('descricao')) {
        $v = pd_limpar(pd_txt($r['descricao'] ?? ''));
        if (pd_len($v) > 240) return [null, 'A descrição aceita até 240 caracteres.'];
        $d['descricao'] = $v;
    }
    if ($enviou('preco_centavos')) {
        $v = $r['preco_centavos'] ?? null;
        if ($v === null || $v === '') $d['preco_centavos'] = null;
        elseif (is_int($v) && $v >= 0 && $v <= 100000000) $d['preco_centavos'] = $v;
        else return [null, 'Preço inválido.'];
    }
    foreach (['quantidade' => 'Quantidade inválida (0 a 100000).', 'ordem' => 'Ordem inválida (0 a 100000).'] as $c => $msg) {
        if (!$enviou($c)) continue;
        $v = $r[$c] ?? 0;
        if (!is_int($v) || $v < 0 || $v > 100000) return [null, $msg];
        $d[$c] = $v;
    }
    if ($enviou('status')) {
        $v = $r['status'] ?? 'disponivel';
        if (!is_string($v) || !in_array($v, PD_STATUS_PRODUTO, true)) return [null, 'Status inválido.'];
        $d['status'] = $v;
    }
    foreach (['ativo' => true, 'destaque' => false] as $c => $padrao) {
        if (!$enviou($c)) continue;
        $v = array_key_exists($c, $r) ? $r[$c] : $padrao;
        if (!is_bool($v)) return [null, "Valor inválido em $c."];
        $d[$c] = $v ? 1 : 0;
    }
    if ($enviou('observacao_interna')) {
        $v = pd_txt($r['observacao_interna'] ?? '');
        if (pd_len($v) > 500) return [null, 'A observação interna aceita até 500 caracteres.'];
        $d['observacao_interna'] = $v === '' ? null : $v;
    }
    if ($parcial && !$d) return [null, 'Nenhum campo para atualizar.'];
    return [$d, null];
}

/** Identifica a imagem pelos primeiros bytes; não confia no nome nem no tipo informado. */
function pd_tipo_imagem(string $b): ?string {
    if (strlen($b) >= 8 && str_starts_with($b, "\x89PNG\r\n\x1a\n")) return 'png';
    if (strlen($b) >= 3 && str_starts_with($b, "\xff\xd8\xff")) return 'jpg';
    if (strlen($b) >= 12 && str_starts_with($b, 'RIFF') && substr($b, 8, 4) === 'WEBP') return 'webp';
    return null;
}
