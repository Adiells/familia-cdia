# Família CDIA — Árvore de Apadrinhamento (CI/UFPB)

Plataforma open-source de genealogia acadêmica e visualização interativa da árvore de apadrinhamento do curso de **Ciência de Dados e Inteligência Artificial (CDIA)** do Centro de Informática (CI) da **Universidade Federal da Paraíba (UFPB)**.

---

## Funcionalidades Principais

- **Árvore Genealógica Estratificada por Período (`@xyflow/react` + `@dagrejs/dagre`)**:
  - Visualização interativa em camadas por semestre de ingresso (`2021.2` a `2026.2`) com minimização automática de cruzamentos e roteamento em curvas Bezier em leque.
  - **Destaque e Isolamento de Linhagem**: Ao clicar em qualquer estudante, o grafo destaca toda a sua árvore de ancestrais (padrinhos, avós acadêmicos) em **verde esmeralda** e seus descendentes (afilhados, netos acadêmicos) em **azul céu**, permitindo também isolar apenas a sub-árvore da família.
- **Explorador de Linhagens & Ranking Genealógico**:
  - Painel comparativo das maiores famílias acadêmicas do curso, contabilizando descendentes totais, afilhados diretos e ancestrais.
- **Busca Global Instantânea (`⌘K` / `Ctrl+K`)**:
  - Paleta de comando insensível a acentos que localiza estudantes por nome completo, apelido, matrícula ou período de ingresso e centraliza a câmera da árvore no card correspondente.
- **Adição de Novos Apadrinhamentos (`1+` Padrinhos)**:
  - Formulário com autocomplete integrado ao cadastro ativo do SIGAA UFPB (prevenindo duplicatas por erro de digitação) e suporte a importação em lote via **CSV / JSON** com quantidade flexível de padrinhos (`1`, `2` ou mais).
- **Arquitetura Desacoplada (GitHub Pages + Google Cloud Run)**:
  - **Frontend Estático (`output: 'export'`)**: Carregamento instantâneo a 60fps diretamente via CDN do GitHub Pages com hidratação assíncrona em background.
  - **Microsserviço Backend (`backend/server.mjs`)**: API Node.js sem dependências externas, pronta para deploy em container no Google Cloud Run com fallback automático para `localStorage` quando offline.

---

## Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router / Static Export), React 19, TypeScript (`strict: true`) |
| **Estilização** | Tailwind CSS v4, Lucide React, Light/Dark Theme |
| **Motor de Grafo** | React Flow (`@xyflow/react`), Dagre (`@dagrejs/dagre`) |
| **Backend API** | Node.js 22 HTTP Server (`backend/server.mjs`), Docker (`backend/Dockerfile`) |
| **Pipeline de Dados** | Python 3 (`scripts/scrape_sigaa.py`, `scripts/reconcile_data.py`), Node Validator (`scripts/validate_graph.mjs`) |

---

## Estrutura do Projeto

```text
familiacdia/
├── .github/workflows/       # Pipeline CI/CD (GitHub Pages)
├── backend/                 # Microsserviço Node.js standalone para Google Cloud Run
│   ├── Dockerfile
│   ├── package.json
│   └── server.mjs
├── scripts/                 # Scripts de extração SIGAA, reconciliação e validação do DAG
│   ├── build-pages.mjs
│   ├── reconcile_data.py
│   ├── scrape_sigaa.py
│   └── validate_graph.mjs
└── src/
    ├── app/                 # Páginas e estilos globais Next.js (App Router)
    ├── components/
    │   ├── admin/           # Modal de adição e importação CSV/JSON de apadrinhamentos
    │   ├── layout/          # Header, StatsBar e ThemeToggle
    │   ├── search/          # Busca global por comando (Cmd+K / Ctrl+K)
    │   ├── student/         # StudentDrawer (perfil e genealogia) e CohortBadge
    │   └── tree/            # FamilyTreeCanvas, StudentNode, SponsorshipEdge e TreeControls
    ├── data/                # Contratos TypeScript e datasets canônicos em JSON
    └── lib/                 # Motor de layout estratificado do grafo, busca fuzzy e cliente API
```

---

## Como Executar Localmente

### Pré-requisitos
- **Node.js** `>= 20` e **npm**
- **Python** `>= 3.10` (necessário apenas para rodar os scripts de reconciliação em `scripts/`)

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente (opcional)
```bash
cp .env.example .env.local
```

### 3. Iniciar os servidores de desenvolvimento
Em um terminal, inicie o microsserviço da API (porta `8080`):
```bash
npm run dev:backend
```

Em outro terminal, inicie o frontend Next.js (porta `3000`):
```bash
npm run dev
```
Acesse `http://localhost:3000`.

---

## Scripts Disponíveis

- `npm run dev`: Inicia o frontend Next.js em modo de desenvolvimento (`http://localhost:3000`).
- `npm run dev:backend`: Inicia a API standalone (`backend/server.mjs`) na porta `8080`.
- `npm run build`: Gera o build de produção do frontend.
- `npm run build:pages`: Gera a exportação 100% estática na pasta `out/` para o **GitHub Pages**.
- `npm run typecheck`: Executa a validação de tipos do TypeScript (`tsc --noEmit`).
- `npm run lint`: Executa o ESLint em `src/`.
- `python3 scripts/reconcile_data.py && node scripts/validate_graph.mjs`: Reconcilia os registros brutos (`src/data/raw-pdf-sponsorships.json`) com a base do SIGAA (`src/data/sigaa-students.json`) e valida a integridade do grafo (zero duplicatas e ausência de ciclos).

---

## Deploy (GitHub Pages + Google Cloud Run)

Consulte o guia detalhado em **[DEPLOY.md](./DEPLOY.md)**:
1. **Frontend no GitHub Pages**: Automatizado via GitHub Actions (`.github/workflows/deploy-pages.yml`).
2. **Backend no Google Cloud Run**: Deploy via CLI com `gcloud run deploy` a partir da pasta `backend/` (com bucket Cloud Storage montado em `/app/data`).

---

## Como Contribuir

Contribuições da comunidade acadêmica de CDIA e do Centro de Informática da UFPB são muito bem-vindas! Leia o nosso **[Guia de Contribuição (CONTRIBUTING.md)](./CONTRIBUTING.md)** para conferir o fluxo de branches, padrão de commits, estrutura de Pull Requests e instruções para atualização de dados.

---

## Licença

Distribuído sob a **[Licença MIT](./LICENSE)**.
