# Guia de Contribuição — Família CDIA

Obrigado pelo interesse em contribuir com o **Família CDIA**, a árvore de apadrinhamento open-source do curso de Ciência de Dados e Inteligência Artificial (CI/UFPB)!

---

## 1. Como Adicionar ou Corrigir Apadrinhamentos

Existem duas formas de adicionar novos apadrinhamentos ou atualizar semestres:

### Opção A: Pela Interface Web (`+ Novo Apadrinhamento`)
1. Clique no botão **`+ Novo Apadrinhamento`** no canto superior direito do site.
2. Selecione o(a) **Calouro(a)** e **1 ou mais Padrinhos/Madrinhas** usando a busca integrada ao cadastro ativo do SIGAA (ou importe uma planilha na aba **CSV / JSON**).
3. Caso o backend esteja conectado, os dados são persistidos automaticamente; caso esteja rodando na versão estática, você pode clicar em **"Baixar JSON atualizado"** no rodapé do modal e abrir um Pull Request atualizando `src/data/students.json` e `src/data/sponsorships.json`.

### Opção B: Pelo Pipeline de Reconciliação (`src/data/raw-pdf-sponsorships.json`)
1. Adicione os novos vínculos no arquivo `src/data/raw-pdf-sponsorships.json` (ou adicione um novo apelido confirmado no dicionário `CONFIRMED_MATRICULAS` em `scripts/reconcile_data.py`).
2. Execute o pipeline de reconciliação e o validador de integridade do grafo:
   ```bash
   python3 scripts/reconcile_data.py
   node scripts/validate_graph.mjs
   ```
3. Verifique se o validador reportou **0 duplicatas**, **100% de integridade de arestas** e **grafo acíclico (DAG)**.

---

## 2. Fluxo de Desenvolvimento para Pull Requests

1. Faça um **Fork** do repositório e crie uma branch descritiva:
   ```bash
   git checkout -b feat/minha-melhoria
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Antes de enviar o seu Pull Request, execute as verificações obrigatórias:
   ```bash
   node scripts/validate_graph.mjs
   npm run typecheck
   npm run lint
   npm run build:pages
   ```
4. Faça o commit seguindo o padrão *Conventional Commits* (`feat:`, `fix:`, `docs:`, `chore:`) e abra o Pull Request descrevendo claramente a alteração.

---

## 3. Padrões de Código e Privacidade

- **Sem Duplicatas**: Nunca crie nós duplicados para o mesmo estudante com grafias diferentes; utilize sempre a matrícula oficial do SIGAA ou o pipeline `scripts/reconcile_data.py`.
- **Privacidade**: Não inclua números de telefone, e-mails pessoais ou documentos sensíveis nos arquivos JSON do repositório — mantenha apenas o nome acadêmico, matrícula pública do SIGAA e período de ingresso.
- **Tipagem Estrita**: Todo código TypeScript em `src/` deve respeitar os contratos definidos em `src/data/types.ts` sem uso de `any`.
