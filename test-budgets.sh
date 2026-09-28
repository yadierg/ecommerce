#!/bin/bash

BUDGET_API="http://localhost:3003"
STORE_API="http://localhost:3001"
INVENTORY_API="http://localhost:3002"
ADMIN_API="http://localhost:3004"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test Budgets (Presupuesto de obra)"
echo "=========================================="

# 1. Login
echo ""
echo "1. Login..."
TOKEN=$(curl -s -X POST $ADMIN_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}' | jq -r '.accessToken')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login falló"
  exit 1
fi
echo "✅ Token: ${TOKEN:0:50}..."

# 2. Obtener o crear cliente
echo ""
echo "2. Verificando cliente..."
CLIENT_ID=$(curl -s "$BUDGET_API/clients" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id // empty')

if [ -z "$CLIENT_ID" ]; then
  echo "   No hay clientes, creando uno..."
  CLIENT=$(curl -s -X POST "$BUDGET_API/clients" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Juan Pérez",
      "email": "juan.perez@test.com",
      "phone": "+5355551234",
      "city": "La Habana",
      "country": "Cuba",
      "type": "individual",
      "category": "residential"
    }')
  CLIENT_ID=$(echo "$CLIENT" | jq -r '.id')
fi

echo "   ✅ Cliente: $CLIENT_ID"

# 3. Obtener almacén
WAREHOUSE_ID=$(curl -s "$INVENTORY_API/warehouses" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.[0].id')
echo "   ✅ Almacén: $WAREHOUSE_ID"

# 4. Obtener producto
PRODUCT_ID=$(curl -s "$STORE_API/products" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo "   ✅ Producto: $PRODUCT_ID"

if [ -z "$CLIENT_ID" ] || [ -z "$WAREHOUSE_ID" ] || [ -z "$PRODUCT_ID" ]; then
  echo "❌ Faltan IDs necesarios"
  echo "   Cliente: $CLIENT_ID"
  echo "   Almacén: $WAREHOUSE_ID"
  echo "   Producto: $PRODUCT_ID"
  exit 1
fi

# 5. Crear presupuesto
echo ""
echo "3. Creando presupuesto..."
BUDGET=$(curl -s -X POST "$BUDGET_API/budgets" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"warehouseId\": \"$WAREHOUSE_ID\",
    \"projectTitle\": \"Instalación solar 10kW - Casa Pérez\",
    \"projectDescription\": \"Sistema fotovoltaico con 20 paneles, 2 inversores y 10 baterías\",
    \"siteAddress\": \"Calle 123 #45-67, La Habana\",
    \"siteCity\": \"La Habana\",
    \"siteCountry\": \"Cuba\",
    \"validUntil\": \"2026-10-28\",
    \"estimatedDurationDays\": 15,
    \"paymentTerms\": 30,
    \"warrantyMonths\": 24,
    \"items\": [
      {
        \"productId\": \"$PRODUCT_ID\",
        \"quantity\": 20,
        \"unitPrice\": 800,
        \"taxRate\": 16
      }
    ],
    \"laborItems\": [
      {
        \"description\": \"Instalación de paneles solares\",
        \"workerRole\": \"electricista\",
        \"quantity\": 2,
        \"estimatedHours\": 40,
        \"hourlyRate\": 25
      },
      {
        \"description\": \"Supervisión de ingeniero\",
        \"workerRole\": \"ingeniero\",
        \"quantity\": 1,
        \"estimatedHours\": 20,
        \"hourlyRate\": 50
      }
    ],
    \"additionalCosts\": 500,
    \"notes\": \"Cliente solicita inicio lo antes posible\"
  }")

echo "$BUDGET" | jq '{id, budgetNumber, status, materialsSubtotal, laborSubtotal, additionalCosts, subtotal, tax, total, currency}'

BUDGET_ID=$(echo "$BUDGET" | jq -r '.id')

if [ -z "$BUDGET_ID" ] || [ "$BUDGET_ID" == "null" ]; then
  echo "❌ Error creando presupuesto:"
  echo "$BUDGET" | jq '.'
  exit 1
fi

# 6. Listar
echo ""
echo "4. Listar presupuestos:"
curl -s "$BUDGET_API/budgets" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.data[] | {budgetNumber, projectTitle, status, total}'

# 7. Enviar
echo ""
echo "5. Enviar (draft → sent):"
curl -s -X POST "$BUDGET_API/budgets/$BUDGET_ID/send" \
  -H "Authorization: Bearer $TOKEN" | jq '{budgetNumber, status}'

# 8. Aprobar
echo ""
echo "6. Aprobar (sent → approved):"
curl -s -X POST "$BUDGET_API/budgets/$BUDGET_ID/approve" \
  -H "Authorization: Bearer $TOKEN" | jq '{budgetNumber, status, approvedAt}'

# 9. Stats
echo ""
echo "7. Stats:"
curl -s "$BUDGET_API/budgets/stats" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
