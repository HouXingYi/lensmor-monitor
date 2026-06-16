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
cp .env.example .env.local
pnpm dev
```

The default local login configured in `.env.example` is:

```text
demo@lensmor.local
change-me
```

The development command runs the Next.js web app and the worker in parallel.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

## Environment

Copy `.env.example` to `.env.local` for local development. Do not commit real liteLLM keys or session secrets.

## MVP Smoke Flow

The current smoke flow validates:

1. Login/session boundary
2. Three-step onboarding data capture
3. Mock competitor creation
4. Manual collection task entry point
5. Worker-driven mock diff and liteLLM report generation
6. Report detail auto-read behavior
7. Useful/Wrong/Not Important feedback API rules
