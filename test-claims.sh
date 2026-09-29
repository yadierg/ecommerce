#!/bin/bash

BUDGET_API="http://localhost:3003"
ADMIN_API="http://localhost:3004"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test Warranty Claims"
echo "=========================================="

TOKEN=$(curl -s -X POST $ADMIN_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}' | jq -r '.accessToken')
echo "✅ Token: ${#TOKEN} chars"

# 1. Obtener warranty
WARRANTY_ID=$(curl -s "$BUDGET_API/warranties" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo "   Warranty: $WARRANTY_ID"

# 2. Obtener worker
WORKER_ID=$(curl -s "$BUDGET_API/workers" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo "   Worker: $WORKER_ID"

# 3. Crear claim
echo ""
echo "1. Crear reclamo:"
CLAIM=$(curl -s -X POST "$BUDGET_API/warranties/$WARRANTY_ID/claims" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"issueDate\": \"2026-11-25\",
    \"description\": \"El panel deja de funcionar después de 2 semanas\",
    \"priority\": \"high\",
    \"assignedToId\": \"$WORKER_ID\",
    \"affectedItems\": [
      {
        \"productName\": \"iPhone Instel\",
        \"quantity\": 2,
        \"issue\": \"No enciende\"
      }
    ],
    \"customerNotes\": \"Cliente reporta problema urgente\"
  }")

echo "$CLAIM" | jq '{id, claimNumber, status, priority, assignedTo: .assignedTo.name}'
CLAIM_ID=$(echo "$CLAIM" | jq -r '.id')

# 4. Iniciar revisión
echo ""
echo "2. Iniciar revisión (open → in_review):"
curl -s -X POST "$BUDGET_API/warranties/$WARRANTY_ID/claims/$CLAIM_ID/review" \
  -H "Authorization: Bearer $TOKEN" | jq '{claimNumber, status, reviewedAt}'

# 5. Aprobar
echo ""
echo "3. Aprobar (in_review → approved):"
curl -s -X POST "$BUDGET_API/warranties/$WARRANTY_ID/claims/$CLAIM_ID/approve" \
  -H "Authorization: Bearer $TOKEN" | jq '{claimNumber, status}'

# 6. Resolver
echo ""
echo "4. Resolver reclamo:"
curl -s -X POST "$BUDGET_API/warranties/$WARRANTY_ID/claims/$CLAIM_ID/resolve" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "Panel reemplazado sin costo para el cliente",
    "coveredCost": 999.99,
    "customerCost": 0,
    "notes": "Garantía cubrió el 100%"
  }' | jq '{claimNumber, status, resolution, coveredCost, customerCost, resolvedAt}'

# 7. Stats
echo ""
echo "5. Stats de claims:"
curl -s "$BUDGET_API/warranties/$WARRANTY_ID/claims/stats" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.'

# 8. Warranty actualizada
echo ""
echo "6. Warranty actualizada:"
curl -s "$BUDGET_API/warranties/$WARRANTY_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{
    warrantyNumber,
    status,
    claimsCount,
    claimsCost
  }'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
