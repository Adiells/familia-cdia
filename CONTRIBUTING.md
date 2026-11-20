# Guia de Contribuição (Contributing Guide)

Obrigado pelo interesse em contribuir com o projeto **Família CDIA**! Este documento descreve o fluxo de trabalho, padrões de código, convenções de commit, estrutura de Pull Requests e procedimentos para atualização dos dados da árvore de apadrinhamento.

---

## Sumário

1. [Código de Conduta e Privacidade](#1-código-de-conduta-e-privacidade)
2. [Como Reportar Bugs ou Sugerir Funcionalidades](#2-como-reportar-bugs-ou-sugerir-funcionalidades)
3. [Configuração do Ambiente de Desenvolvimento](#3-configuração-do-ambiente-de-desenvolvimento)
4. [Como Adicionar ou Corrigir Apadrinhamentos](#4-como-adicionar-ou-corrigir-apadrinhamentos)
5. [Padrão de Branches e Commits](#5-padrão-de-branches-e-commits)
6. [Estrutura e Checklist de Pull Request (PR)](#6-estrutura-e-checklist-de-pull-request-pr)

---

## 1. Código de Conduta e Privacidade

- **Respeito e Colaboração**: Este é um projeto acadêmico comunitário mantido por e para estudantes do Centro de Informática da UFPB. Mantenha todas as discussões construtivas e acolhedoras.
- **Proteção de Dados Pessoais**: **Nunca** inclua números de telefone, e-mails pessoais, CPF, endereços ou informações privadas nos arquivos JSON ou commits. Os registros públicos devem conter exclusivamente o nome acadêmico, a matrícula pública do SIGAA UFPB e o semestre de ingresso.

---

## 2. Como Reportar Bugs ou Sugerir Funcionalidades

Antes de abrir uma nova *Issue*, verifique se já não existe uma discussão aberta sobre o tema.

- **Relato de Bug**: Inclua os passos para reproduzir, o comportamento esperado, o comportamento atual, capturas de tela (se aplicável) e o ambiente (navegador / dispositivo desktop ou mobile).
- **Correção de Dados na Árvore**: Informe o nome completo do estudante, a matrícula no SIGAA, o semestre de ingresso correto e os nomes dos padrinhos/afilhados envolvidos.

---

## 3. Configuração do Ambiente de Desenvolvimento

1. Faça um **Fork** do repositório no GitHub e clone o seu fork:
   ```bash
   git clone https://github.com/<seu-usuario>/familiacdia.git
   cd familiacdia
   ```
2. Instale as dependências Node.js:
   ```bash
   npm install
   ```
3. Inicie o backend standalone (`porta 8080`) e o frontend Next.js (`porta 3000`):
   ```bash
   # Terminal 1 — Backend API
   npm run dev:backend

   # Terminal 2 — Frontend Next.js
   npm run dev
   ```

---

## 4. Como Adicionar ou Corrigir Apadrinhamentos

### Opção A: Via Pipeline de Dados (`src/data/raw-pdf-sponsorships.json`)
1. Adicione os novos vínculos na chave do semestre correspondente em `src/data/raw-pdf-sponsorships.json` (ou registre um apelido/abreviação confirmado em `CONFIRMED_MATRICULAS` dentro de `scripts/reconcile_data.py`).
2. Execute o script de reconciliação e o validador do grafo:
   ```bash
   python3 scripts/reconcile_data.py
   node scripts/validate_graph.mjs
   ```
3. Certifique-se de que `node scripts/validate_graph.mjs` passe sem erros (**zero IDs duplicados**, **100% das arestas válidas** e **grafo acíclico**).

### Opção B: Via Interface Web (`+ Novo Apadrinhamento`)
1. Utilize o botão **`+ Novo Apadrinhamento`** para cadastrar manualmente (com autocomplete do SIGAA) ou importar via **CSV / JSON** (`1` ou mais padrinhos por estudante).
2. Clique em **"Baixar JSON atualizado"** no rodapé do modal para exportar os dados validados e atualizar `src/data/students.json` e `src/data/sponsorships.json`.

---

## 5. Padrão de Branches e Commits

### Nomenclatura de Branches
Utilize prefixos claros de acordo com o tipo de alteração:
- `feat/<descricao-curta>`: Nova funcionalidade (ex: `feat/export-image-button`)
- `fix/<descricao-curta>`: Correção de bug ou layout (ex: `fix/mobile-drawer-scroll`)
- `data/<descricao-curta>`: Adição ou correção de apadrinhamentos (ex: `data/add-2027-1-cohort`)
- `docs/<descricao-curta>`: Melhorias na documentação (ex: `docs/update-deploy-guide`)
- `refactor/<descricao-curta>`: Refatoração interna de código

### Conventional Commits
Seguimos a especificação [Conventional Commits](https://www.conventionalcommits.org/):
```text
<tipo>(<escopo opcional>): <descrição concisa no imperativo>
```
Exemplos:
- `feat(tree): add lineage depth filter to toolbar`
- `fix(api): allow single godparent in CSV batch import`
- `data(2026.2): reconcile new freshman sponsorship pairings`
- `docs(readme): add Cloud Run environment variables table`

---

## 6. Estrutura e Checklist de Pull Request (PR)

Antes de abrir o seu Pull Request, execute a suíte de validação localmente:

```bash
node scripts/validate_graph.mjs
npm run typecheck
npm run lint
npm run build:pages
```

### Template Recomendado para Descrição do PR

Ao abrir um Pull Request no GitHub, estruture a descrição seguindo o modelo abaixo:

```markdown
## Objetivo
Descreva de forma clara e objetiva o que este PR resolve ou adiciona.

## Alterações Realizadas
- [ ] Item 1 (ex: Adicionados novos apadrinhamentos do semestre 2027.1)
- [ ] Item 2 (ex: Ajustado contraste dos badges no tema claro)

## Como Testar
1. Execute `npm run dev:backend` e `npm run dev`
2. Acesse `http://localhost:3000`
3. Verifique que...

## Capturas de Tela (se houver mudança visual)
<!-- Adicione prints antes/depois em Desktop e Mobile (390x844) -->

## Checklist de Verificação
- [ ] `node scripts/validate_graph.mjs` passou sem duplicatas nem ciclos
- [ ] `npm run typecheck` e `npm run lint` passaram sem erros
- [ ] `npm run build:pages` gerou a exportação estática sem falhas
- [ ] Nenhum dado sensível (telefone/e-mail) foi incluído nos arquivos JSON
```
