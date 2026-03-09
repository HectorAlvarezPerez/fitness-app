#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-/root/backups/fitness-db}
CONTAINER=${SUPABASE_DB_CONTAINER:-supabase_db_supabase-local}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-postgres}
RETENTION_DAYS=${RETENTION_DAYS:-14}

mkdir -p "$BACKUP_DIR"
STAMP=$(date +"%Y-%m-%d_%H-%M")
OUT="$BACKUP_DIR/fitness_${STAMP}.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUT"

echo "Backup creado: $OUT"
find "$BACKUP_DIR" -type f -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Limpieza aplicada (> ${RETENTION_DAYS} días)"
