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
- **Auth**: express-session + connect-pg-simple + bcryptjs

## Project: Shinobi Iga Ryu

Mobile app for a martial arts academy focused on Ninjutsu.

### Features (Fase 1)
- Splash animation with academy logo, "SHINOBI IGA RYU" branding, and "Ninjas Por Siempre" motto
- Flip cards with low-opacity background images for 6 martial arts: Ninjutsu, MMA, Box, Jiujitsu, Muay Thai, Funcional
- Each card flips on touch to show "Conocimiento" and "Ejercicios" buttons
- Japanese minimalist design (black/white/grey/gold theme)

### Features (Fase 2)
- Auth system: register, login, logout with session-based authentication
- 3 combinable user roles: admin, profesor, alumno
- 4 subscription levels: basico, medio, avanzado, personalizado
- Auth flow: splash -> welcome screen -> login/register -> main app
- Role-based tab navigation: Admin tab (admin only), Alumnos tab (profesor only), Artes (all), Perfil (all)
- Admin panel: view all users, toggle roles, change subscription levels
- Professor view: list of students with subscription badges
- Profile screen: display name, email, roles, subscription, logout

### Fonts
- NotoSansJP (400, 500, 700, 900) - Japanese sans-serif
- NotoSerifJP (400, 700, 900) - Japanese serif for accents
- Inter (400, 500, 600, 700) - Body text

### Database Schema
- `users` - User accounts with email, password hash, display name, subscription level (notNull, default basico)
- `user_roles` - Many-to-many: users can have multiple roles (admin, profesor, alumno), unique index on (user_id, role)
- `session` - Express session store (auto-created by connect-pg-simple)

### API Routes
- `POST /api/auth/register` - Create account (auto-assigns alumno role)
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user with roles (requires auth)
- `POST /api/auth/logout` - Destroy session
- `GET /api/admin/users` - List all users with roles (admin only)
- `PUT /api/admin/users/:id/roles` - Update user roles (admin only)
- `PUT /api/admin/users/:id/subscription` - Change subscription level (admin only)
- `GET /api/healthz` - Health check

### Planned Features (Future Phases)
- Belt System for Ninjutsu & Jiujitsu (Fase 3)
- Fighter Mode & Fight History (Fase 4)
- Instagram-style Profile with belts and fight record (Fase 5)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   ├── src/app.ts      # Express setup with session middleware
│   │   ├── src/routes/     # auth.ts, admin.ts, health.ts
│   │   └── src/middlewares/ # auth.ts (requireAuth, requireAdmin)
│   └── shinobi-iga-ryu/    # Expo mobile app
│       ├── app/_layout.tsx  # Root layout with AuthProvider
│       ├── app/auth.tsx     # Welcome/login/register screen
│       ├── app/(tabs)/      # Tab screens (index, profile, admin, alumnos)
│       ├── contexts/        # AuthContext.tsx
│       └── lib/api.ts       # API client with fetch wrapper
├── lib/
│   ├── api-spec/           # OpenAPI spec
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle ORM schema + DB connection
├── pnpm-workspace.yaml
└── package.json
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck

## Packages

### `artifacts/shinobi-iga-ryu` (`@workspace/shinobi-iga-ryu`)

Expo mobile app with file-based routing (Expo Router). Dark theme, Japanese-minimalist design.

- Components: `SplashAnimation.tsx`, `FlipCard.tsx`
- Screens: auth.tsx, (tabs)/index.tsx, (tabs)/profile.tsx, (tabs)/admin.tsx, (tabs)/alumnos.tsx
- Contexts: `AuthContext.tsx` - session state, login/register/logout, hasRole()
- API client: `lib/api.ts` - fetch wrapper with cookie credentials
- Fonts: NotoSansJP, NotoSerifJP, Inter

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with session-based auth.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App: `src/app.ts` — CORS, sessions (connect-pg-simple), JSON parsing
- Routes: auth (register/login/me/logout), admin (users/roles/subscription), health
- Middleware: `requireAuth`, `requireAdmin`
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/users.ts` — users, user_roles tables with enums
- Production migrations handled by Replit. Dev: `pnpm --filter @workspace/db run push`
