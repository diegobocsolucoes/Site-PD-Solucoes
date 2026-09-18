# Loja Rápida — Administração de Produtos

Status: regra funcional definida para implementação futura.

## Regra principal
A Loja Rápida pública deve ser dinâmica. Produtos, preços, fotos, estoque e status não devem ficar fixos no código.

## Acesso administrativo
O gerenciamento NÃO deve aparecer para clientes na Loja Rápida pública.
Deve existir dentro do Painel PD, área privada do administrador/proprietário.

Rota/área sugerida:
Painel PD > Loja Rápida > Produtos

## Ações do administrador
- Cadastrar novo produto
- Editar produto existente
- Alterar preço
- Enviar/trocar foto
- Alterar categoria
- Alterar descrição
- Alterar estoque/quantidade
- Alterar status
- Destacar produto
- Ocultar produto sem excluir
- Remover produto
- Visualizar como aparecerá na Loja Rápida

## Campos do produto
- Nome do produto
- Categoria
- Descrição curta
- Preço
- Foto principal
- Fotos adicionais (opcional)
- Quantidade em estoque
- Status: Disponível / Poucas unidades / Indisponível
- Produto ativo: sim/não
- Destaque: sim/não
- Ordem de exibição
- Observação interna (não pública)

## Regras públicas
- Cliente não precisa de login.
- Cliente pode consultar e reservar.
- Reserva não é pagamento online.
- Estoque, valor e disponibilidade devem ser confirmados pelo WhatsApp.
- Não apresentar endereço como loja física.
- Retirada/encontro somente mediante agendamento.
- Entrega dentro da área atendida conforme confirmação da PD.

## Implementação futura
- Banco: Supabase/PostgreSQL
- Fotos: Supabase Storage
- Painel privado com autenticação forte e 2FA
- Loja consulta os produtos dinamicamente
- Mudanças no painel refletem automaticamente na Loja Rápida sem editar HTML

## Regra para Codex
Não hardcodar catálogo definitivo no front-end. A versão visual pode usar produtos de exemplo, mas a implementação final deve consumir os produtos do banco e permitir CRUD completo no Painel PD.
