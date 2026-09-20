# Portal do Cliente — STATUS VISUAL FINAL DO PORTAL PÚBLICO

Branch de documentação: `portal-ui-docs`

## Situação geral
A fase de desenho visual do **Portal público** está concluída.

Todas as telas públicas necessárias ao fluxo definido foram desenhadas em HTML/CSS, refinadas por versões e aprovadas visualmente.

A próxima fase é a **integração técnica pelo Codex**: transformar essas referências em uma aplicação única, responsiva e funcional, preservando fielmente a identidade visual aprovada.

## Linguagem visual oficial
- Fundo preto / grafite escuro.
- Verde oficial PD como destaque.
- Branco e cinza claro para leitura.
- Tipografia em CAIXA ALTA.
- Caixas retangulares para títulos, frases, opções e ações.
- Logo oficial PD; não redesenhar ou substituir.
- Interface tecnológica, limpa e contínua.
- Rolagem vertical normal.
- Um cabeçalho principal por página e rodapé único no final.
- Responsividade para desktop, tablet e mobile.
- Sem preços antecipados quando o fluxo exige análise/revisão.

## Telas públicas aprovadas

### Entrada e navegação
1. **HOME V15**
2. **CONSULTORIA — ENTRADA V2 FINAL**
3. **SOLICITAR ORÇAMENTO — ENTRADA V2 FINAL**

### Cliente / Particular
4. **ATENDIMENTO V5 FINAL**
5. **CONSULTORIA DE COMPUTADOR DOMÉSTICO V2 FINAL**
6. **CONSULTORIA DE SETUP V2 FINAL**

### Empresas
7. **ÁREA PARA EMPRESAS V3 FINAL**
8. **CHAMADO / ATENDIMENTO EMPRESARIAL V2 FINAL**
9. **PLANOS DE CHAMADOS V2 FINAL**
10. **CONSULTORIA DE TI V2 FINAL**
11. **SEGURANÇA ELETRÔNICA V2 FINAL**
12. **ORÇAMENTO EMPRESARIAL V2 FINAL**

### Outros fluxos
13. **LOJA RÁPIDA V2 FINAL**
14. **PARCERIAS V2 FINAL**

### Encerramento universal
15. **CONFIRMAÇÃO UNIVERSAL V3 FINAL**

## Mapa final de navegação

```
HOME
├── ATENDIMENTO
│   ├── SOLICITAR ATENDIMENTO
│   └── SOLICITAR ORÇAMENTO
│       └── CONFIRMAÇÃO PD-SV / PD-OR
│
├── ÁREA PARA EMPRESAS
│   ├── ABRIR CHAMADO / ATENDIMENTO
│   │   └── CONFIRMAÇÃO PD-EMP
│   ├── PLANOS DE CHAMADOS
│   │   └── CONFIRMAÇÃO PD-EMP
│   ├── CONSULTORIA DE TI
│   │   └── CONFIRMAÇÃO PD-TI
│   ├── SEGURANÇA ELETRÔNICA
│   │   └── CONFIRMAÇÃO PD-SE
│   └── ORÇAMENTO EMPRESARIAL
│       └── CONFIRMAÇÃO PD-OR
│
├── SOLICITAR ORÇAMENTO
│   ├── CLIENTE / PARTICULAR
│   │   └── ATENDIMENTO V5 EM MODO ORÇAMENTO
│   │       └── CONFIRMAÇÃO PD-OR
│   └── EMPRESA
│       └── ORÇAMENTO EMPRESARIAL V2
│           └── CONFIRMAÇÃO PD-OR
│
├── CONSULTORIA
│   ├── CLIENTE / PARTICULAR
│   │   ├── COMPUTADOR DOMÉSTICO
│   │   │   └── CONFIRMAÇÃO PD-CD
│   │   └── SETUP
│   │       └── CONFIRMAÇÃO PD-ST
│   └── EMPRESA
│       ├── CONSULTORIA DE TI
│       │   └── CONFIRMAÇÃO PD-TI
│       └── SEGURANÇA ELETRÔNICA
│           └── CONFIRMAÇÃO PD-SE
│
├── LOJA RÁPIDA
│   └── RESERVA
│       └── CONFIRMAÇÃO PD-LJ
│
└── PARCERIAS
    └── CADASTRO
        └── CONFIRMAÇÃO PD-PAR
```

## Protocolos oficiais
- `PD-SV` — Serviço
- `PD-OR` — Orçamento
- `PD-EMP` — Empresa
- `PD-TI` — Consultoria de TI
- `PD-SE` — Segurança Eletrônica
- `PD-CD` — Consultoria de Computador Doméstico
- `PD-ST` — Consultoria de Setup
- `PD-LJ` — Loja Rápida
- `PD-PAR` — Parcerias

Formato público: `PREFIXO-ANO-XXXX`.

## Regras globais confirmadas
- Cliente público não cria conta.
- Sem login para solicitações públicas.
- Sem CPF para pessoa física.
- CNPJ opcional para empresa/parceria.
- WhatsApp obrigatório nos fluxos de solicitação.
- Retorno pelo WhatsApp.
- Envio não confirma automaticamente atendimento, agendamento, contratação, consultoria, reserva ou parceria.
- Não redirecionar automaticamente para WhatsApp após envio.
- Preços aparecem apenas quando fizer sentido no fluxo/revisão.
- Orçamentos: validade padrão de 7 dias.
- Loja Rápida: reserva, não e-commerce.
- Loja não representa estabelecimento físico aberto ao público.
- Produtos da Loja serão dinâmicos e administrados pelo Painel PD.
- Equipamentos técnicos de reparo: Desktop e Notebook.
- Cobertura presencial: Contagem, condicionada às regras de rota/distância definidas no projeto.

## Confirmação
Usar **CONFIRMAÇÃO UNIVERSAL V3** em todos os fluxos.
Não criar telas finais independentes.

## Situação após revisão global
Não foi identificada nenhuma tela pública principal faltante no mapa aprovado.

O que resta é implementação técnica, estados intermediários, validações, persistência, backend, uploads, cálculo de rota, geração de protocolo, dados dinâmicos e integração do Painel PD.

## Próxima fase
**Integração técnica no Codex**.

Ordem sugerida:
1. Consolidar design system e assets oficiais.
2. Criar rotas/páginas a partir das versões finais.
3. Implementar navegação entre telas.
4. Implementar componentes reutilizáveis.
5. Implementar formulários e validação.
6. Implementar banco/Supabase.
7. Implementar uploads.
8. Implementar protocolos.
9. Implementar Confirmação Universal V3 dinâmica.
10. Implementar Loja Rápida dinâmica.
11. Criar Painel PD / Admin.
12. Testar desktop/mobile.
13. Publicar preview antes de merge definitivo.

## Regra para Codex
As versões finais são referências aprovadas. Não redesenhar, não trocar identidade visual e não simplificar fluxos sem decisão explícita do projeto.
