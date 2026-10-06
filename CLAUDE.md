# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Setup

This project uses **npm** (not bun/yarn/pnpm). `package-lock.json` is the lockfile.

Copy `.env.example` to `.env.local` and fill in the three `EXPO_PUBLIC_*` keys (coach, backup, weekly recap webhook secrets). These are n8n webhook auth keys — without them, AI coach, backup sync, and weekly recap features return errors.

## Architecture

- **Path aliases**: Use `@/` for `src/` imports and `@/assets/` for `assets/`. Configured in `tsconfig.json`.
- **Storage**: All client state uses `useSyncExternalStore` with module-level state + `Set<()=>void>` listeners + kv-storage persistence (`expo-sqlite/kv-store` native, `localStorage` web). No React context or state libraries.
- **Platform variants**: Files ending in `.web.tsx`/`.web.ts` are web-only overrides (e.g., `kv-storage.web.ts`, `animated-icon.web.tsx`). Metro resolves them automatically.
- **Typed routes**: `typedRoutes: true` is enabled — route strings are type-checked.
- **React Compiler**: `reactCompiler: true` is enabled — avoid manual `useMemo`/`useCallback` unless needed for referential identity in subscription patterns.

## i18n

Six locales: en, da, de, es, ru, uk. English (`en.ts`) is the source of truth.
- All string keys are defined in `src/lib/i18n/types.ts` as the `Dictionary` interface. TypeScript enforces every locale implements every key.
- Function-valued keys handle interpolation/pluralization — each locale has its own plural rules (Russian/Ukrainian use 3-form Slavic plurals).
- When adding a new user-visible string: add the key to `types.ts`, then add translations in all 6 locale files.

## Security

Never commit API keys, `.env.local`, `.jks` keystores, or Firebase credentials. This repo had a credential leak incident — webhook URLs were rotated (commit `48b9fad`). Double-check `git status` before pushing.
