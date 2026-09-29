#!/bin/bash

BUDGET_API="http://localhost:3003"
ADMIN_API="http://localhost:3004"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test Projects"
echo "=========================================="

# 1. Login
echo ""
echo "1. Login..."
TOKEN=$(curl -s -X POST $ADMIN_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}' | jq -r '.accessToken')
echo "✅ Token: ${TOKEN:0:50}..."

# 2. Obtener budget aprobado
echo ""
echo "2. Obteniendo budget aprobado..."
BUDGET_ID=$(curl -s "$BUDGET_API/budgets?status=approved" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo "   Budget ID: $BUDGET_ID"

# 3. Obtener worker (PM)
echo ""
echo "3. Obteniendo worker..."
WORKER_ID=$(curl -s "$BUDGET_API/workers" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo "   Worker ID: $WORKER_ID"

# 4. Convertir a proyecto
echo ""
echo "4. Convirtiendo budget → project..."
PROJECT=$(curl -s -X POST "$BUDGET_API/budgets/$BUDGET_ID/convert-to-project" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectManagerId\": \"$WORKER_ID\",
    \"startDate\": \"2026-10-15\",
    \"estimatedEndDate\": \"2026-11-15\",
    \"phases\": [
      {
        \"name\": \"Estudio del sitio\",
        \"estimatedDays\": 2,
        \"order\": 1
      },
      {
        \"name\": \"Montaje de estructura\",
        \"estimatedDays\": 3,
        \"order\": 2
      },
      {
        \"name\": \"Instalación eléctrica\",
        \"estimatedDays\": 4,
        \"order\": 3
      }
    ],
    \"notes\": \"Proyecto solar residencial\"
  }")

echo "$PROJECT" | jq '{id, projectNumber, title, status, startDate, estimatedEndDate}'
PROJECT_ID=$(echo "$PROJECT" | jq -r '.id')

# 5. Ver detalle del proyecto
echo ""
echo "5. Detalle del proyecto:"
curl -s "$BUDGET_API/projects/$PROJECT_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{
    projectNumber,
    status,
    client: .client.name,
    projectManager: .projectManager.name,
    phases: [.phases[] | {name, order, status}],
    materials: [.materials[] | {productName, quantityPlanned, status}]
  }'

# 6. Iniciar proyecto
echo ""
echo "6. Iniciar (planning → in_progress):"
curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/start" \
  -H "Authorization: Bearer $TOKEN" | jq '{projectNumber, status, startedAt}'

# 7. Stats
echo ""
echo "7. Stats:"
curl -s "$BUDGET_API/projects/stats" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
