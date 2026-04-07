# Publishing packages (local and CI)

This document explains how to run a local dry-run publish and how the CI publish works.

## Pacote interno `@adatechnology/shared`

O pacote `@adatechnology/shared` é **somente interno** (não publicável no npm).
Ele centraliza código comum entre libs, e os pacotes publicáveis fazem bundle do que precisam no `dist` via `tsup`.

- Status: `private: true`
- Changesets: ignorado em `.changeset/config.json`
- Fluxo de build/publish: não deve ser tratado como pacote de release

## Local manual publish (dry-run)

Warning: do not commit tokens. Keep them in env variables or use `~/.npmrc` temporarily.

1. Build libs in order:

```bash
pnpm -w run build:libs-ordered
```

2. Set your NPM token in the environment (temporary):

```bash
export NPM_TOKEN=your_token_here
# optional: create ~/.npmrc for the session
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > ~/.npmrc
```

Tip: a safe example file is provided as `.npmrc.example` in the repo — copy or link it to `~/.npmrc` and set `NPM_TOKEN` in your environment before running the publish.

3. Do a dry-run publish with changesets (requires changesets installed):

```bash
pnpm -w exec changeset publish --dry-run
```

This will show what would be published without actually publishing.

4. To actually publish (BE CAREFUL):

```bash
pnpm -w exec changeset publish
```

5. Cleanup:

```bash
unset NPM_TOKEN
rm ~/.npmrc
```

## CI publish (GitHub Actions)

- The `publish` workflow runs on `push` to `main`, on merged pull requests into `main`, and can be triggered manually via `workflow_dispatch`.
- The job uses the GitHub Environment `production`, so environment protections (approvals, wait timers, allowed branches) and environment secrets apply.
- Place the publish token in the `production` environment as `NPM_TOKEN` (Settings → Environments → production → Add secret).

## Environment configuration (recommended)

- Required reviewers: add at least one release owner to approve publishes.
- Wait timer: 5–30 minutes.
- Deployment branches: `main`, `release/*`.
- Environment secrets: `NPM_TOKEN` — token must have publish rights for your NPM org (e.g. `@adatechnology`).

## Notes about npm org (e.g. `@adatechnology`)

- Ensure each package `package.json` uses the scoped name (e.g. `@adatechnology/auth-keycloak`).
- The automation token must have publish rights to the scope.
- If the org has 2FA or special policies, create an automation token that complies with org policy.

If you want, I can also:

- add a `changeset` configuration file and example changeset, or
- modify package.json names to use the `@adatechnology` scope, or
- create a GitHub Action job that creates a GitHub Release after publish.
