#!/bin/sh
set -e

# Fallback: if DATABASE_DIRECT_URL not set, use DATABASE_URL
export DATABASE_DIRECT_URL="${DATABASE_DIRECT_URL:-$DATABASE_URL}"

# Apply pending migrations. `set -e` above means a failure here stops the
# deploy: starting a server whose code expects columns the database does not
# have produces a working login page and a broken app, which is harder to
# diagnose than a deploy that refuses to finish.
npx prisma migrate deploy

# Start server
node --max-old-space-size=400 dist/server.js
