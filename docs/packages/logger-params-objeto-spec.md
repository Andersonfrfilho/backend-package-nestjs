# SPEC — Migração da lib `@adatechnology/logger` para parâmetros em objeto

## Contexto

O monorepo adotou como padrão APIs com parâmetros em objeto para melhorar legibilidade, extensibilidade e segurança de chamadas.

No logger, a interface pública (`LoggerProviderInterface`) já define `debug/info/warn/error` com payload em objeto (`LogPayload`), porém a implementação ainda aceitava assinaturas legadas posicionais.

## Objetivo

Padronizar toda a API da lib de logger para **somente payload em objeto**, e alinhar documentação/skills dos packages consumidores.

## Escopo

### Incluído

- Remover suporte posicional legado em:
  - `packages/logger/src/logger.provider.ts`
  - `packages/logger/src/implementations/winston/winston.logger.provider.ts`
- Manter assinatura pública:
  - `logger.debug({ message, context?, meta? })`
  - `logger.info({ message, context?, meta? })`
  - `logger.warn({ message, context?, meta? })`
  - `logger.error({ message, context?, meta? })`
- Atualizar documentação e skills dos packages afetados:
  - `packages/logger/README.md`
  - `packages/logger/agents/skills/SKILL.md`
  - `packages/cache/agents/skills/SKILL.md`
  - `packages/http/agents/skills/SKILL.md`

### Fora de escopo

- Redesenho do formato de saída dos logs.
- Alterações de transporte/configuração do Winston.
- Refatorações de lint não relacionadas à migração.

## Decisão técnica

1. A API pública do logger passa a aceitar apenas `LogPayload`.
2. Não haverá fallback para assinatura posicional na implementação.
3. Consumers devem chamar sempre com objeto (padrão único no monorepo).
4. Tipos devem seguir padrão **PascalCase** com sufixo semântico, por exemplo: `DebugParams`, `DebugResult`, `SetEncryptedParams`.

## Exemplo canônico

```ts
this.logger.info({
  message: "Token valid",
  context: this.constructor.name,
  meta: { requestId, userId },
});
```

## Compatibilidade

- Código que ainda usava `logger.info("mensagem", meta, context)` deve ser migrado para objeto.
- Esta mudança é breaking change para consumidores externos que dependiam da assinatura legada.

## Plano de validação

1. Executar `check`/`build` dos packages alterados.
2. Verificar ausência de chamadas posicionais em `packages/**` e `example/**`.
3. Validar exemplos em `SKILL.md` e README.

## Critérios de aceite

- Implementação do logger sem overload posicional.
- Consumers internos usando payload em objeto.
- Skills/documentação atualizadas para o novo padrão.
