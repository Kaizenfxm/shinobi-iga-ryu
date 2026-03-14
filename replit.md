# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) with Expo Router

## Project: Shinobi Iga Ryu

Mobile app for a martial arts academy focused on Ninjutsu.

### Features (Fase 1)
- Splash animation with academy logo, "SHINOBI IGA RYU" branding, and "Ninjas Por Siempre" motto
- Flip cards for 6 martial arts: Ninjutsu, MMA, Box, Jiujitsu, Muay Thai, Funcional
- Each card flips on touch to show "Conocimiento" and "Ejercicios" buttons
- Japanese minimalist design (black/white/grey theme)
- Tab navigation: Artes (main) and Perfil (profile placeholder)

### Fonts
- NotoSansJP (400, 500, 700, 900) - Japanese sans-serif
- NotoSerifJP (400, 700, 900) - Japanese serif for accents
- Inter (400, 500, 600, 700) - Body text

### Database Schema
- `users` - User accounts with email, password hash, display name, subscription level
- `user_roles` - Many-to-many: users can have multiple roles (admin, profesor, alumno)
- Subscription levels: basico, medio, avanzado, personalizado

### Planned Features (Future Phases)
- Auth & User System (Fase 2)
- Belt System for Ninjutsu & Jiujitsu (Fase 3)
- Fighter Mode & Fight History (Fase 4)
- Instagram-style Profile with belts and fight record (Fase 5)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── shinobi-iga-ryu/    # Expo mobile app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/shinobi-iga-ryu` (`@workspace/shinobi-iga-ryu`)

Expo mobile app with file-based routing (Expo Router). Dark theme, Japanese-minimalist design.

- Key components: `SplashAnimation.tsx`, `FlipCard.tsx`
- Screens: `(tabs)/index.tsx` (martial arts cards), `(tabs)/profile.tsx`
- Fonts: NotoSansJP, NotoSerifJP, Inter

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- Routes: `src/routes/index.ts` mounts sub-routers
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/users.ts` — users table, user_roles table, role and subscription enums
- `drizzle.config.ts` — Drizzle Kit config

Production migrations are handled by Replit when publishing. In development, use `pnpm --filter @workspace/db run push`.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec and Orval config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks from the OpenAPI spec.
