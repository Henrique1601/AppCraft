# ⚠️ Gotchas & Lições Aprendidas

1. **PowerShell Execution Policy:** `npm` (que chama `npm.ps1`) é bloqueado pela política de execução do Windows neste ambiente. Sempre usar `npm.cmd` e `npx.cmd` nos comandos de terminal.
2. **Nome do pacote npm:** `create-next-app` rejeita nomes com letras maiúsculas (`AppCraft`). O projeto deve usar `"name": "appcraft"` no `package.json`.
3. **Favicons / Ícones externos:** Alguns sites bloqueiam hotlink ou não têm favicon padrão. Usar serviço confiável (ex: `https://www.google.com/s2/favicons?domain=...&sz=64`) com fallback automático para iniciais do app (`onError` -> avatar estilizado) para nunca exibir imagem quebrada.
4. **Hidratação Next.js com `localStorage`:** Sempre carregar dados do `localStorage` dentro de `useEffect` (ou estado montado) para evitar mismatch de hidratação SSR vs Client.
