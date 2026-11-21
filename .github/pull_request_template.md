## Objetivo
<!-- Descreva de forma clara e objetiva o que este PR resolve ou adiciona -->

## Alterações Realizadas
- [ ] Descreva a principal alteração realizada.

## Como Testar
1. Descreva os passos ou comandos usados para validar esta alteração.
2. Registre resultados relevantes ou casos de borda verificados.

## Capturas de Tela (se houver alteração visual)
<!-- Cole capturas de tela em modo Claro/Escuro ou Mobile se aplicável -->

## Checklist de Verificação
- [ ] `node scripts/validate_graph.mjs` passou — zero duplicatas, arestas íntegras e grafo acíclico (aplicável quando houver alteração em `src/data/` ou `scripts/`)
- [ ] `npm run typecheck` e `npm run lint` passaram sem erros
- [ ] `npm run build:pages` gerou a exportação estática (`out/`) com sucesso
- [ ] Nenhum dado pessoal sensível (telefone, e-mail, etc.) foi incluído nos arquivos JSON
