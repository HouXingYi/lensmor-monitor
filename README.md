# Lensmor Monitor

Lensmor Monitor is a greenfield MVP for competitor website monitoring and an intelligence inbox.

## Current Scope

- Single-user login
- Three-step onboarding
- Mock competitor website monitoring
- Manual refresh and scheduled collection tasks
- liteLLM-powered Analysis Reports
- Intelligence inbox and feedback

## Development

```bash
pnpm install
pnpm dev
```

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Environment

Copy `.env.example` to `.env.local` for local development. Do not commit real liteLLM keys or session secrets.
