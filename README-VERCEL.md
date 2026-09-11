# BRAiN Obsidian Vault — Vercel

Esta versao adiciona uma camada Vercel Serverless para o demo.

## Deploy

1. Suba este diretorio para um repositorio GitHub.
2. No Vercel, importe o repositorio.
3. Mantenha o Root Directory na raiz `brain-obsidian`.
4. O `vercel.json` ja define:
   - framework: Vite
   - build: `npm run build`
   - output: `client/dist`
   - runtime das APIs: Node.js 22
5. Clique em Deploy.

## Importante

As APIs Vercel leem `vault-demo/`, que faz parte do repositorio. Isto e um modo de demonstracao/read-only.

Um Vault Obsidian real no computador ou celular nao pode ser apontado diretamente para `VAULT_PATH` da Vercel. Para isso, a proxima etapa e criar um indexador local (OpenClaw/Node) que sincronize o Vault para uma fonte persistente (GitHub, Blob e/ou banco de dados) e a Vercel consuma essa fonte.

## Teste local

```bash
npm install
npm run build
```

Para desenvolvimento completo local, continue usando o servidor Express original com `npm run dev`.
