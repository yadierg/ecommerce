#!/bin/bash

BUDGET_API="http://localhost:3003"
ADMIN_API="http://localhost:3004"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test TimeLogs"
echo "=========================================="

TOKEN=$(curl -s -X POST $ADMIN_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}' | jq -r '.accessToken')
echo "✅ Token: ${TOKEN:0:50}..."

PROJECT_ID=$(curl -s "$BUDGET_API/projects" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo "   Project: $PROJECT_ID"

WORKER_ID=$(curl -s "$BUDGET_API/workers" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo "   Worker: $WORKER_ID"

TASK_ID=$(curl -s "$BUDGET_API/projects/$PROJECT_ID/tasks" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.[0].id')
echo "   Task: $TASK_ID"

echo ""
echo "1. Registrar 8 horas..."
LOG=$(curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/timelogs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"workerId\": \"$WORKER_ID\",
    \"taskId\": \"$TASK_ID\",
    \"date\": \"2026-10-20\",
    \"hours\": 8,
    \"description\": \"Instalación de paneles solares\"
  }")

echo "$LOG" | jq '{id, date, hours, hourlyRate, totalCost, status, worker: .worker.name}'
LOG_ID=$(echo "$LOG" | jq -r '.id')

echo ""
echo "2. Registrar 6 horas más..."
curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/timelogs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"workerId\": \"$WORKER_ID\",
    \"taskId\": \"$TASK_ID\",
    \"date\": \"2026-10-21\",
    \"hours\": 6,
    \"description\": \"Continuación\"
  }" | jq '{id, hours, totalCost, status}'

echo ""
echo "3. TimeLogs del proyecto:"
curl -s "$BUDGET_API/projects/$PROJECT_ID/timelogs" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{meta, data: [.data[] | {date, hours, totalCost, status}]}'

echo ""
echo "4. Aprobar el primer log:"
curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/timelogs/$LOG_ID/approve" \
  -H "Authorization: Bearer $TOKEN" | jq '{hours, status, approvedAt}'

echo ""
echo "5. Stats:"
curl -s "$BUDGET_API/projects/$PROJECT_ID/timelogs/stats" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.'

echo ""
echo "6. Proyecto actualizado:"
curl -s "$BUDGET_API/projects/$PROJECT_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{
    projectNumber,
    status,
    laborCostActual,
    totalCostActual
  }'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
