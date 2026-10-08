#!/bin/bash

BUDGET_API="http://localhost:3003"
ADMIN_API="http://localhost:3004"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test Invoices (manual)"
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
echo "✅ Token: ${#TOKEN} chars"

# 2. Project
PROJECT_ID=$(curl -s "$BUDGET_API/projects" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo ""
echo "2. Project: $PROJECT_ID"

# 3. Materiales
echo ""
echo "3. Materiales:"
curl -s "$BUDGET_API/projects/$PROJECT_ID/materials" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.data[] | {id, productName, quantityDelivered, quantityUsed, quantityReturned, status}'

# 4. Completar proyecto
echo ""
echo "4. Completar proyecto:"
COMPLETE=$(curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"closeNotes":"Proyecto finalizado"}')

echo "$COMPLETE" | jq '.'

# 5. Generar factura
echo ""
echo "5. Generar factura:"
INVOICE=$(curl -s -X POST "$BUDGET_API/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"tax\": 0,
    \"discount\": 0,
    \"paymentTerms\": 30
  }")

echo "$INVOICE" | jq '.'

INVOICE_ID=$(echo "$INVOICE" | jq -r '.id')

if [ "$INVOICE_ID" == "null" ] || [ -z "$INVOICE_ID" ]; then
  echo "❌ No se pudo crear la factura"
  exit 1
fi

# 6. Enviar
echo ""
echo "6. Enviar factura:"
curl -s -X POST "$BUDGET_API/invoices/$INVOICE_ID/send" \
  -H "Authorization: Bearer $TOKEN" | jq '{invoiceNumber, status}'

# 7. Pagar
echo ""
echo "7. Marcar como pagada:"
curl -s -X POST "$BUDGET_API/invoices/$INVOICE_ID/mark-paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"transfer","paymentReference":"TRF-001"}' | jq '{invoiceNumber, status, paidAt}'

# 8. Stats
echo ""
echo "8. Stats:"
curl -s "$BUDGET_API/invoices/stats" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
