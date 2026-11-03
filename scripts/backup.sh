#!/bin/bash
BACKUP_DIR="/var/www/ecommerce/backups"
DATE=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

docker exec ecommerce-postgres pg_dump -U ecommerce ecommerce_prod | \
  gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$KEEP_DAYS -delete

echo "Backup completado: db_${DATE}.sql.gz ($(du -h "$BACKUP_DIR/db_${DATE}.sql.gz" | cut -f1))"
