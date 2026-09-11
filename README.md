# BRAiN — Obsidian Vault Explorer

MVP completo para transformar um projeto **Obsidian Vault** em uma interface visual estilo BRAiN, usando os `[[wikilinks]]` do Obsidian como relacionamentos.

## O que já funciona

- Leitura recursiva de `.md` do Vault.
- Ignora `.obsidian`, `.trash` e `node_modules`.
- Frontmatter YAML via `gray-matter`.
- Extração automática de `[[wikilinks]]`.
- Backlinks implícitos: o grafo é derivado dos links existentes.
- Classificação automática por pasta (`clientes`, `projetos`, `reunioes`, etc.) ou `type` no frontmatter.
- Grafo force-directed com D3.js.
- Busca de notas.
- Filtro por tipo.
- Visualização de Markdown.
- Monitoramento do Vault com `chokidar`: alterações são reindexadas automaticamente.
- Brain Health Score demonstrativo baseado em frescor, conexão, documentação, atividade e validação.
- Tela de saúde com radar.
- Tela de reuniões e memória.
- API REST local.

## Requisitos

- Node.js 20+ recomendado.
- npm 10+.
- Um Vault Obsidian existente ou o `vault-demo` incluído.

## Instalação

```bash
cd brain-obsidian
npm install
```

## Rodar com o Vault de demonstração

```bash
npm run dev
```

Abra:

```text
http://localhost:5173
```

API:

```text
http://localhost:5210/api/health
http://localhost:5210/api/graph
http://localhost:5210/api/files
```

## Conectar seu Vault Obsidian

Copie:

```text
server/.env.example
```

para:

```text
server/.env
```

Edite `VAULT_PATH`.

### Windows

```env
VAULT_PATH=C:\\Users\\SeuUsuario\\Documents\\MeuVault
PORT=5210
CORS_ORIGIN=http://localhost:5173
```

### WSL/Linux

```env
VAULT_PATH=/home/seuusuario/MeuVault
PORT=5210
CORS_ORIGIN=http://localhost:5173
```

Depois:

```bash
npm run dev
```

## Convenção de pastas recomendada

```text
MeuVault/
├── clientes/
├── projetos/
├── reunioes/
├── ferramentas/
├── memoria/
├── documentos/
├── fontes/
├── rotinas/
└── conteudo/
```

A pasta influencia o tipo visual do nó.

## Frontmatter recomendado

```yaml
---
type: projeto
status: ativo
validated: true
score: 90
---
```

Para validação pendente:

```yaml
---
type: projeto
status: pending
validation: pending
---
```

## Relacionamentos Obsidian

O relacionamento básico é o próprio Wikilink:

```markdown
# Projeto X

Cliente: [[Cliente ABC]]

Ferramentas:
- [[OpenClaw]]
- [[Claude]]

Reuniões:
- [[2026-09-09 - Arquitetura]]
```

O servidor transforma isso em arestas do grafo.

Também funciona:

```markdown
[[Nota|nome exibido]]
```

## Arquitetura

```text
Obsidian Vault
      │
      │ .md + YAML + [[wikilinks]]
      ▼
Node.js / Express
      │
      ├── Parser Markdown
      ├── Frontmatter
      ├── Indexação
      ├── Graph Builder
      ├── Health Engine
      └── File Watcher
      │
      ▼
REST API :5210
      │
      ▼
React + D3
      │
      ├── Visão
      ├── Explorar
      ├── Memória
      ├── Reuniões
      └── Saúde
```

## Próximas evoluções recomendadas

1. Busca semântica com embeddings.
2. Inspector de nó com backlinks e propriedades.
3. Edição de Markdown pela interface.
4. Relações tipadas (`uses`, `belongs_to`, `discussed_in`, etc.).
5. Timeline de alterações.
6. SQLite/FTS5 para acelerar grandes Vaults.
7. Integração OpenClaw.
8. Ingestão de WhatsApp/reuniões.
9. Fila de validação humana.
10. Agentes que leem/escrevem no Vault com permissões explícitas.
11. Score configurável por domínio.
12. Cache do grafo para Vaults com dezenas de milhares de notas.

## Segurança

O servidor foi pensado para execução local. Não exponha a porta `5210` diretamente à internet sem autenticação, autorização e controles de acesso.
