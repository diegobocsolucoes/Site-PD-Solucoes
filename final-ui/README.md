# PD Soluções Digitais — Consolidação das versões finais

Branch canônica de consolidação visual: `portal-ui-final`

Esta branch foi criada a partir de `portal-ui-docs` e reúne a documentação oficial das versões aprovadas antes da integração técnica pelo Codex.

## Regra de segurança
- Não alterar `main` nesta fase.
- Não redesenhar telas aprovadas.
- A implementação deve preservar identidade preto/grafite + verde PD, tipografia em caixa alta, caixas retangulares e logo oficial.
- A branch `portal-ui-final` é a referência de handoff visual.

## Portal público — versões finais
| Tela | Versão canônica | Artefato HTML aprovado |
|---|---|---|
| Home | V15 | `PD_Portal_Home_v15` |
| Atendimento | V5 | `PD_Portal_Atendimento_v5` |
| Confirmação Universal | V3 | `PD_Portal_Confirmacao_v3_selfcontained.html` |
| Área para Empresas | V3 | `PD_Portal_Empresas_v3_selfcontained.html` |
| Planos de Chamados | V2 | `PD_Portal_Planos_Chamados_v2_selfcontained.html` |
| Consultoria de TI | V2 | `PD_Portal_Consultoria_TI_v2_selfcontained.html` |
| Segurança Eletrônica | V2 | `PD_Portal_Seguranca_Eletronica_v2_selfcontained.html` |
| Orçamento Empresarial | V2 | `PD_Portal_Orcamento_Empresarial_v2_selfcontained.html` |
| Loja Rápida | V2 | `PD_Portal_Loja_Rapida_v2_selfcontained.html` |
| Parcerias | V2 | `PD_Portal_Parcerias_v2_selfcontained.html` |
| Consultoria — Entrada | V2 | `PD_Portal_Consultoria_Entrada_v2_selfcontained.html` |
| Consultoria Doméstica | V2 | `PD_Portal_Consultoria_Domestica_v2_selfcontained.html` |
| Consultoria de Setup | V2 | `PD_Portal_Consultoria_Setup_v2_selfcontained.html` |
| Chamado Empresarial | V2 | `PD_Portal_Chamado_Empresarial_v2_selfcontained.html` |
| Solicitar Orçamento — Entrada | V2 | `PD_Portal_Orcamento_Entrada_v2_selfcontained.html` |

## Painel PD — versões aprovadas até agora
| Tela | Versão canônica | Artefato HTML aprovado |
|---|---|---|
| Dashboard Admin | V2 | `PD_Painel_Admin_v2_selfcontained.html` |
| Solicitações | V2 | `PD_Painel_Solicitacoes_v2_selfcontained.html` |

## Documentação
Os arquivos em `docs/` detalham cada versão final, mapa do Portal, protocolos, Loja dinâmica e regras para o Codex.

## Observação sobre os artefatos HTML
O conector GitHub usado nesta conversa grava conteúdo textual, mas não possui ingestão direta dos arquivos locais/ZIP e seus assets binários. Portanto, a consolidação desta branch fixa **versões, nomes, regras e documentação canônica**. O push byte-a-byte dos HTML/ZIP aprovados deve ser feito pelo Codex a partir do pacote de handoff preparado no chat.

Destino recomendado para os arquivos no push do Codex:

```
final-ui/
  portal-publico/
    home-v15/
    atendimento-v5/
    confirmacao-v3/
    empresas-v3/
    planos-chamados-v2/
    consultoria-ti-v2/
    seguranca-eletronica-v2/
    orcamento-empresarial-v2/
    loja-rapida-v2/
    parcerias-v2/
    consultoria-entrada-v2/
    consultoria-domestica-v2/
    consultoria-setup-v2/
    chamado-empresarial-v2/
    orcamento-entrada-v2/
  painel-pd/
    dashboard-v2/
    solicitacoes-v1/
```

Depois que o Codex importar esses artefatos, esta branch deve ser usada como base da implementação integrada.

## Atualização da branch de integração
O pacote das fontes aprovadas está incorporado em `approved-ui/`, vindo da branch `portal-ui-consolidado`. A referência de Solicitações V2 substitui V1 nesta branch, conforme `docs/PAINEL_SOLICITACOES_V2_FINAL.md` e `approved-ui/manifest.json`. Consulte `INTEGRACAO_PREVIEW.md` para a ordem de integração e revisão.
