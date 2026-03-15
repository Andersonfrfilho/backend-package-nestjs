# Criar um novo pacote

Esta página é um guia prático. O checklist completo também está no README.

## Checklist rápido

- Criar `packages/<nome>/src/index.ts`
- Criar `packages/<nome>/package.json` com `files: ["dist"]`
- Adotar build com `tsup` (recomendado)
- Se precisar usar módulos internos (ex.: `#shared/*`), habilitar `tsup.config.ts` + `TsconfigPathsPlugin`

## Referência (README do repo)

<!--@include: ../README.md#como-criar-um-novo-pacote-em-packages-->
