#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push-force || echo "Warning: drizzle push failed, continuing..."
pnpm --filter @workspace/db run seed-belts
