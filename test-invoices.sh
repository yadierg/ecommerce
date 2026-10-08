#!/bin/bash

BUDGET_API="http://localhost:3003"
ADMIN_API="http://localhost:3004"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test Invoices"
echo "=========================================="

TOKEN=$(curl -s -X POST $ADMIN_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}' | jq -r '.accessToken')
echo "✅ Token: ${TOKEN:0:50}..."

# 1. Listar proyectos
echo ""
echo "1. Proyectos disponibles:"
curl -s "$BUDGET_API/projects" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.data[] | {id, projectNumber, title, status}'

# 2. Completar el proyecto primero
PROJECT_ID=$(curl -s "$BUDGET_API/projects" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq -r '.data[0].id')
echo ""
echo "2. Completando proyecto $PROJECT_ID..."

# Primero devolver todos los materiales y aprobar logs
curl -s -X POST "$BUDGET_API/projects/$PROJECT_ID/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"closeNotes":"Proyecto finalizado"}' | jq '.'

# 3. Generar factura
echo ""
echo "3. Generando factura..."
INVOICE=$(curl -s -X POST "$BUDGET_API/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"$PROJECT_ID\",
    \"tax\": 0,
    \"discount\": 0,
    \"paymentTerms\": 30,
    \"notes\": \"Factura final del proyecto\"
  }")

echo "$INVOICE" | jq '{
  id,
  invoiceNumber,
  status,
  materialsCost,
  laborCost,
  additionalCosts,
  subtotal,
  total,
  budgetTotal,
  variance,
  variancePercentage
}'

INVOICE_ID=$(echo "$INVOICE" | jq -r '.id')

# 4. Enviar
echo ""
echo "4. Enviar factura (draft → sent):"
curl -s -X POST "$BUDGET_API/invoices/$INVOICE_ID/send" \
  -H "Authorization: Bearer $TOKEN" | jq '{invoiceNumber, status, sentAt}'

# 5. Marcar como pagada
echo ""
echo "5. Marcar como pagada:"
curl -s -X POST "$BUDGET_API/invoices/$INVOICE_ID/mark-paid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethod": "transfer",
    "paymentReference": "TRF-2026-001"
  }' | jq '{invoiceNumber, status, paidAt, paymentMethod}'

# 6. Stats
echo ""
echo "6. Stats:"
curl -s "$BUDGET_API/invoices/stats" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
