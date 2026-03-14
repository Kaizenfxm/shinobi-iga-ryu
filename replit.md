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
- Role-based tab navigation: Admin tab (admin only), Alumnos tab (profesor only), Artes (all), Cinturones (all), Perfil (all)
- Admin panel: view all users, toggle roles, change subscription levels
- Professor view: list of assigned students with subscription badges
- Profile screen: display name, email, roles, subscription, logout
- Profesor-student assignment model (profesor_students join table)

### Features (Fase 3)
- Belt system for Ninjutsu (8 belts: Blanco→Amarillo→Naranja→Verde→Azul→Morado→Marrón→Negro) and Jiujitsu (5 belts: Blanco→Azul→Morado→Marrón→Negro)
- Each belt has requirements (belt_requirements) and an exam definition (belt_exams) with title, description, duration, passing score
- Auto-initialization: new users get white belts in both disciplines on registration
- Student belt progression screen: shows current belt per discipline, locked/unlocked next level, exam info + requirements when unlocked, full belt history
- Admin belt management: view all students' belt status, unlock next level, promote student, initialize belts for users without them
- Belt history tracking with dates and promotion notes
- Unlock audit trail: student_belt_unlocks tracks each unlock event with who/when/target belt
- Admin panel has sub-tabs: "Usuarios" (role/subscription management) and "Cinturones" (belt management)
- Next level requirements and exam hidden until admin explicitly unlocks them for a specific student
- Deterministic seed script: `pnpm --filter @workspace/db run seed-belts` provisions all belt definitions, requirements, and exams

### Fonts
- NotoSansJP (400, 500, 700, 900) - Japanese sans-serif
- NotoSerifJP (400, 700, 900) - Japanese serif for accents
- Inter (400, 500, 600, 700) - Body text

### Database Schema
- `users` - User accounts with email, password hash, display name, subscription level (notNull, default basico)
- `user_roles` - Many-to-many: users can have multiple roles (admin, profesor, alumno), unique index on (user_id, role)
- `profesor_students` - Join table: profesor-student assignments, unique index on (profesor_id, alumno_id)
- `belt_definitions` - Belt catalog per discipline with name, color, order_index, description
- `student_belts` - Current belt per user per discipline, with next_unlocked flag
- `belt_history` - Historical record of all belt promotions with dates and notes
- `belt_requirements` - Exam requirements for each belt level
- `belt_exams` - Exam definitions per belt (title, description, duration, passing score)
- `student_belt_unlocks` - Audit trail of belt unlock events (user, target belt, unlocked by, timestamp)
- `session` - Express session store (auto-created by connect-pg-simple)

### API Routes
- `POST /api/auth/register` - Create account (auto-assigns alumno role)
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user with roles (requires auth)
- `POST /api/auth/logout` - Destroy session
- `GET /api/admin/users` - List all users with roles (admin only)
- `PUT /api/admin/users/:id/roles` - Update user roles (admin only)
- `PUT /api/admin/users/:id/subscription` - Change subscription level (admin only)
- `GET /api/admin/profesor/:profesorId/alumnos` - Get professor's assigned students (admin only)
- `PUT /api/admin/profesor/:profesorId/alumnos` - Update professor's student assignments (admin only)
- `GET /api/profesor/alumnos` - Professor's assigned students (profesor only)
- `GET /api/belts/definitions` - All belt definitions (requires auth)
- `GET /api/belts/me` - Current user's belt progression + history (requires auth)
- `GET /api/admin/belts/users` - All students with belt info (admin only)
- `POST /api/admin/belts/unlock` - Unlock next belt level for student (admin only)
- `POST /api/admin/belts/promote` - Promote student to next belt (admin only)
- `POST /api/admin/belts/initialize` - Initialize white belts for student (admin only)
- `GET /api/admin/belts/users/:userId/history` - Belt history for a student (admin only)
- `GET /api/admin/belts/unlocks/:userId` - Unlock audit records for a student (admin only)
- `GET /api/healthz` - Health check

### Planned Features (Future Phases)
- Fighter Mode & Fight History (Fase 4)
- Instagram-style Profile with belts and fight record (Fase 5)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   │   ├── src/app.ts      # Express setup with session middleware
│   │   ├── src/routes/     # auth.ts, admin.ts, health.ts, profesor.ts, belts.ts
│   │   └── src/middlewares/ # auth.ts (requireAuth, requireAdmin, requireProfesor)
│   └── shinobi-iga-ryu/    # Expo mobile app
│       ├── app/_layout.tsx  # Root layout with AuthProvider
│       ├── app/auth.tsx     # Welcome/login/register screen
│       ├── app/(tabs)/      # Tab screens (index, belts, profile, admin, alumnos)
│       ├── contexts/        # AuthContext.tsx
│       └── lib/api.ts       # API client with fetch wrapper
├── lib/
│   ├── api-spec/           # OpenAPI spec
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/     # users.ts, belts.ts
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
- Screens: auth.tsx, (tabs)/index.tsx, (tabs)/belts.tsx, (tabs)/profile.tsx, (tabs)/admin.tsx, (tabs)/alumnos.tsx
- Contexts: `AuthContext.tsx` - session state, login/register/logout, hasRole()
- API client: `lib/api.ts` - fetch wrapper with cookie credentials
- Fonts: NotoSansJP, NotoSerifJP, Inter

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with session-based auth.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App: `src/app.ts` — CORS, sessions (connect-pg-simple), JSON parsing
- Routes: auth (register/login/me/logout), admin (users/roles/subscription/belts), profesor (alumnos), belts (definitions/me), health
- Middleware: `requireAuth`, `requireAdmin`, `requireProfesor`
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/users.ts` — users, user_roles, profesor_students tables with enums
- `src/schema/belts.ts` — belt_definitions, student_belts, belt_history, belt_requirements, belt_exams, student_belt_unlocks tables
- `src/seed-belts.ts` — Deterministic seed for belt catalog, requirements, and exams
- Production migrations handled by Replit. Dev: `pnpm --filter @workspace/db run push`
- After schema changes, rebuild declarations: `cd lib/db && npx tsc --build --force`
