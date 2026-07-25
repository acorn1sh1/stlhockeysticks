#!/usr/bin/env bash
# One-command production deploy that ALWAYS pushes the DB before the app,
# so a schema change can never ship ahead of the prod migration (the repeated
# "Application error / Digest" admin-500 cause).
#
# Order: dev push → verify → prod push → git push → vercel deploy.
# Usage: npm run deploy
set -euo pipefail

cd "$(dirname "$0")/.."

SENTINEL_SQL() {
  local env="$1"
  cat <<SQL
CREATE TABLE IF NOT EXISTS "_app_identity"(app_name text, company text, environment text, created_at timestamptz DEFAULT now());
INSERT INTO "_app_identity"(app_name, company, environment)
SELECT 'stl-hockeysticks','STL Hockeysticks','${env}'
WHERE NOT EXISTS (SELECT 1 FROM "_app_identity");
SQL
}

# --accept-data-loss is required because the `_app_identity` sentinel table
# (recreated below) is never in the Prisma schema, so every push wants to drop
# it and would otherwise stop on an interactive "ignore data loss?" prompt. The
# only "loss" is that 1-row marker. CAVEAT: this also auto-accepts a genuinely
# destructive schema change (dropped column/table with data) without asking —
# review `prisma migrate diff` before deploying anything that removes a field.
echo "▶ 1/5  Dev DB push (.env → acela) + sentinel"
npx prisma db push --accept-data-loss
npx prisma db execute --schema prisma/schema.prisma --stdin <<<"$(SENTINEL_SQL development)"

echo "▶ 2/5  Typecheck + tests"
npm run typecheck
npm test

echo "▶ 3/5  Prod DB push (mainline) + sentinel"
railway service Postgres
PROD_DB="$(railway variables --kv | grep '^DATABASE_PUBLIC_URL' | cut -d= -f2-)"
case "$PROD_DB" in
  *mainline*) : ;;
  *) echo "✗ PROD_DB is not the mainline (prod) host — aborting:"; echo "  $(printf '%s' "$PROD_DB" | sed 's/:[^:@]*@/:****@/')"; exit 1 ;;
esac
DATABASE_URL="$PROD_DB" npx prisma db push --accept-data-loss
DATABASE_URL="$PROD_DB" npx prisma db execute --schema prisma/schema.prisma --stdin <<<"$(SENTINEL_SQL production)"

echo "▶ 4/5  Git push"
git push

echo "▶ 5/5  Vercel production deploy"
vercel deploy --prod

echo "✅ Done — dev + prod DB in sync with schema, app deployed."
