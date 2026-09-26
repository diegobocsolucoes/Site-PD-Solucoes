# Bundle das fontes HTML/CSS aprovadas

Este diretório guarda um arquivo compactado contendo **todas as fontes HTML/CSS aprovadas** do Portal do Cliente e do Painel PD.

O arquivo foi dividido em partes Base64 pequenas apenas para permitir a transferência segura pelo conector do GitHub.

## Reconstruir

No Linux/macOS ou no terminal do ambiente do Codex:

```sh
cd approved-ui/bundle
sh rebuild.sh
```

O script:

1. junta `part-00` até `part-10`;
2. decodifica Base64;
3. verifica o SHA-256;
4. extrai as fontes para `approved-ui/sources-expanded/`.

SHA-256 esperado:

```
58036ab81b2203c6bc79253c60a344c48f7de803a83cb3551b6b7ef34fde9cc2
```

## Conteúdo

O bundle inclui as versões aprovadas listadas no `approved-ui/manifest.json`, incluindo Portal público e Painel PD.

## Regra para Codex

Estas fontes são referências aprovadas. Não redesenhar as telas durante a integração técnica. Adaptar somente o necessário para componentização, rotas, dados reais, responsividade e backend, preservando a aparência e os fluxos aprovados.

Os assets binários completos também estão no pacote consolidado local entregue no chat; durante a integração, eles devem ser copiados/otimizados para a estrutura final do projeto.
