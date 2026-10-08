#!/bin/bash

BUDGET_API="http://localhost:3003"
ADMIN_API="http://localhost:3004"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test Warranties"
echo "=========================================="

# 1. Login
echo ""
echo "1. Login..."
TOKEN=$(curl -s -X POST $ADMIN_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}' | jq -r '.accessToken')
echo "✅ Token: ${#TOKEN} chars"

# 2. Obtener factura pagada (captura directa)
echo ""
echo "2. Facturas pagadas:"
INVOICE_ID=$(curl -s "$BUDGET_API/invoices?status=paid" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')

echo "   Invoice ID: $INVOICE_ID"

if [ -z "$INVOICE_ID" ] || [ "$INVOICE_ID" == "null" ]; then
  echo "❌ No hay facturas pagadas"
  exit 1
fi

# 3. Crear garantía desde factura
echo ""
echo "3. Crear garantía desde factura:"
WARRANTY=$(curl -s -X POST "$BUDGET_API/warranties/from-invoice/$INVOICE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$WARRANTY" | jq '{
  id,
  warrantyNumber,
  status,
  startDate,
  endDate,
  monthsDuration,
  coveredItemsCount: (.coveredItems | length),
  claimsCount
}'

WARRANTY_ID=$(echo "$WARRANTY" | jq -r '.id')

if [ -z "$WARRANTY_ID" ] || [ "$WARRANTY_ID" == "null" ]; then
  echo "❌ Error creando garantía:"
  echo "$WARRANTY" | jq '.'
  exit 1
fi

# 4. Ver detalle
echo ""
echo "4. Detalle de la garantía:"
curl -s "$BUDGET_API/warranties/$WARRANTY_ID" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '{
    warrantyNumber,
    status,
    startDate,
    endDate,
    monthsDuration,
    client: .client.name,
    project: .project.projectNumber,
    coveredItems: [.coveredItems[] | {productName, quantity, warrantyMonths}]
  }'

# 5. Listar
echo ""
echo "5. Listar garantías:"
curl -s "$BUDGET_API/warranties" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.data[] | {warrantyNumber, status, client: .client.name}'

# 6. Stats
echo ""
echo "6. Stats:"
curl -s "$BUDGET_API/warranties/stats" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
