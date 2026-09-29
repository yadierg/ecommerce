#!/bin/bash

BUDGET_API="http://localhost:3003"
INVENTORY_API="http://localhost:3002"
ADMIN_API="http://localhost:3004"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test Project Materials"
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

# 1. Ver materiales del proyecto
echo ""
echo "1. Materiales del proyecto:"
MATERIALS=$(curl -s "$BUDGET_API/projects/$PROJECT_ID/materials" \
  -H "x-tenant-id: $TENANT_INSTEL")
echo "$MATERIALS" | jq '.data[] | {id, productName, quantityPlanned, status}'

MATERIAL_ID=$(echo "$MATERIALS" | jq -r '.data[0].id')
PRODUCT_ID=$(echo "$MATERIALS" | jq -r '.data[0].productId')
echo "   Material: $MATERIAL_ID"
echo "   Product: $PRODUCT_ID"

# 2. Stock ANTES
echo ""
echo "2. Stock ANTES:"
curl -s "$INVENTORY_API/stocks/product/$PRODUCT_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{totalQuantity}'

# 3. Entregar material al worker
echo ""
echo "3. Entregar 20 unidades al worker:"
curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/materials/$MATERIAL_ID/deliver" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"workerId\": \"$WORKER_ID\",
    \"quantityDelivered\": 20,
    \"notes\": \"Entrega inicial\"
  }" | jq '{productName, quantityDelivered, status, worker: .assignedToWorker.name, deliveredAt}'

# 4. Stock DESPUÉS
echo ""
echo "4. Stock DESPUÉS (debe reducir en 20):"
curl -s "$INVENTORY_API/stocks/product/$PRODUCT_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{totalQuantity}'

# 5. Ver movimiento creado
echo ""
echo "5. Movimiento creado:"
curl -s "$INVENTORY_API/movements/product/$PRODUCT_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.[0] | {type, quantity, reason}'

# 6. Reportar uso parcial (15 de 20)
echo ""
echo "6. Reportar uso: 15 de 20:"
curl -s -X PATCH "$BUDGET_API/projects/$PROJECT_ID/materials/$MATERIAL_ID/use" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantityUsed": 15,
    "notes": "Se usaron 15 unidades"
  }' | jq '{productName, quantityDelivered, quantityUsed, status, costActual}'

# 7. Devolver sobrante (5 de 20)
echo ""
echo "7. Devolver 5 sobrantes:"
curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/materials/$MATERIAL_ID/return" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quantityReturned": 5,
    "notes": "Sobrantes devueltos"
  }' | jq '{productName, quantityDelivered, quantityUsed, quantityReturned, status}'

# 8. Stock FINAL (debe ser el original - 15)
echo ""
echo "8. Stock FINAL:"
curl -s "$INVENTORY_API/stocks/product/$PRODUCT_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{totalQuantity}'

# 9. Movimientos del producto
echo ""
echo "9. Historial de movimientos:"
curl -s "$INVENTORY_API/movements/product/$PRODUCT_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.[] | {type, quantity, reason}' | head -30

# 10. Stats
echo ""
echo "10. Stats de materiales:"
curl -s "$BUDGET_API/projects/$PROJECT_ID/materials/stats" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.'

# 11. Proyecto actualizado
echo ""
echo "11. Proyecto actualizado:"
curl -s "$BUDGET_API/projects/$PROJECT_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{
    projectNumber,
    materialsCostActual,
    laborCostActual,
    totalCostActual
  }'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
