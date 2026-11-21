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
   git clone https://github.com/<seu-usuario>/familia-cdia.git
   cd familia-cdia
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

Em produção, os dados vivos ficam no backend do **Google Cloud Run**, persistidos em um bucket do **Google Cloud Storage** montado em `/app/data`. Os arquivos `src/data/*.json` no Git servem apenas como **snapshot estático inicial (seed)** — editar esses JSONs em um Pull Request **não** atualiza a produção automaticamente.

### A) Adicionar novos apadrinhamentos (alunos ativos no SIGAA)
- Faça diretamente pelo site no botão **`+ Novo Apadrinhamento`** (formulário individual com autocomplete do SIGAA ou importação em lote via **CSV / JSON**, com `1+` padrinhos).
- O envio grava imediatamente na API do Cloud Run — não é necessário abrir PR nem editar arquivos locais.

### B) Corrigir/remover vínculos existentes ou incluir estudantes fora do SIGAA ativo
- Como a API pública expõe apenas consulta (`GET`) e adição (`POST`) para matrículas ativas do SIGAA, abra uma **Issue** informando nome completo, matrícula SIGAA (se houver), turma e os vínculos corretos para que os mantenedores atualizem os dados no Cloud Run / Cloud Storage.

### C) Atualizar o snapshot/seed histórico ou desenvolvimento local (manutenção)
- Para manter o dataset seed no Git ou preparar uma nova carga do SIGAA, atualize `src/data/raw-pdf-sponsorships.json` (ou mapeamentos em `scripts/reconcile_data.py`) e execute:
  ```bash
  python3 scripts/reconcile_data.py
  node scripts/validate_graph.mjs
  ```
- O botão **"Baixar JSON atualizado"** no modal gera um backup/snapshot do estado atual retornado pela API.

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
node scripts/validate_graph.mjs # se houver alteração em src/data/ ou scripts/
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
- [ ] `node scripts/validate_graph.mjs` passou sem duplicatas nem ciclos (quando houver alteração em `src/data/` ou `scripts/`)
- [ ] `npm run typecheck` e `npm run lint` passaram sem erros
- [ ] `npm run build:pages` gerou a exportação estática sem falhas
- [ ] Nenhum dado sensível (telefone/e-mail) foi incluído nos arquivos JSON
```
