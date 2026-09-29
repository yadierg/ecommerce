#!/bin/bash

BUDGET_API="http://localhost:3003"
ADMIN_API="http://localhost:3004"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test Fases y Tareas"
echo "=========================================="

# 1. Login
echo ""
echo "1. Login..."
TOKEN=$(curl -s -X POST $ADMIN_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}' | jq -r '.accessToken')
echo "✅ Token: ${TOKEN:0:50}..."

# 2. Obtener proyecto
echo ""
echo "2. Obteniendo proyecto..."
PROJECT_ID=$(curl -s "$BUDGET_API/projects" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo "   Project: $PROJECT_ID"

# 3. Obtener fases
echo ""
echo "3. Obteniendo fases..."
PHASES=$(curl -s "$BUDGET_API/projects/$PROJECT_ID/phases" \
  -H "x-tenant-id: $TENANT_INSTEL")
echo "$PHASES" | jq '.[] | {id, name, order, status}'

PHASE_ID=$(echo "$PHASES" | jq -r '.[0].id')
echo "   Primera fase: $PHASE_ID"

# 4. Obtener worker
WORKER_ID=$(curl -s "$BUDGET_API/workers" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo "   Worker: $WORKER_ID"

# 5. Crear tarea en la fase
echo ""
echo "5. Crear tarea..."
TASK=$(curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Revisar sitio y mediciones\",
    \"description\": \"Estudio preliminar del sitio de instalación\",
    \"phaseId\": \"$PHASE_ID\",
    \"workerId\": \"$WORKER_ID\",
    \"order\": 1,
    \"priority\": \"high\",
    \"estimatedHours\": 8,
    \"dueDate\": \"2026-10-20\"
  }")

echo "$TASK" | jq '{id, name, status, priority, worker: .worker.name, phase: .phase.name}'
TASK_ID=$(echo "$TASK" | jq -r '.id')

# 6. Iniciar fase
echo ""
echo "6. Iniciar fase..."
curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/phases/$PHASE_ID/start" \
  -H "Authorization: Bearer $TOKEN" | jq '{name, status}'

# 7. Iniciar tarea
echo ""
echo "7. Iniciar tarea..."
curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/tasks/$TASK_ID/start" \
  -H "Authorization: Bearer $TOKEN" | jq '{name, status}'

# 8. Completar tarea
echo ""
echo "8. Completar tarea..."
curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/tasks/$TASK_ID/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actualHours": 6,
    "notes": "Sitio estudiado correctamente"
  }' | jq '{name, status, actualHours}'

# 9. Ver proyecto actualizado
echo ""
echo "9. Proyecto actualizado:"
curl -s "$BUDGET_API/projects/$PROJECT_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{
    projectNumber,
    status,
    progressPercentage,
    totalTasks,
    completedTasks
  }'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
