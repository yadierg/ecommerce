#!/bin/bash

INVENTORY_API="http://localhost:3002"
ADMIN_API="http://localhost:3004"
STORE_API="http://localhost:3001"
TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"

echo "=========================================="
echo "🧪 Test Suppliers"
echo "=========================================="

# 1. Verificar apps
echo ""
echo "1. Verificando apps..."
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $ADMIN_API/)
STORE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $STORE_API/)
INVENTORY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $INVENTORY_API/)

echo "   admin-api:     $ADMIN_STATUS"
echo "   store-api:     $STORE_STATUS"
echo "   inventory-api: $INVENTORY_STATUS"

if [ "$ADMIN_STATUS" != "200" ]; then
  echo ""
  echo "❌ admin-api no está corriendo"
  echo "   Ejecuta en otra terminal: npx nx serve admin-api"
  exit 1
fi

# 2. Login
echo ""
echo "2. Login..."
LOGIN=$(curl -s -X POST $ADMIN_API/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}')

TOKEN=$(echo "$LOGIN" | jq -r '.accessToken // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Login falló"
  echo "$LOGIN" | jq '.'
  exit 1
fi

echo "   ✅ Token: ${TOKEN:0:50}..."

# 3. Crear proveedor
echo ""
echo "3. POST /suppliers"
curl -s -X POST "$INVENTORY_API/suppliers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Distribuidora Apple",
    "code": "PROV-APPLE",
    "legalName": "Apple Distribution S.A.",
    "taxId": "123456789",
    "email": "ventas@apple-dist.com",
    "phone": "+5355551234",
    "city": "La Habana",
    "country": "Cuba",
    "contactName": "Juan Distribuidor",
    "contactEmail": "juan@apple-dist.com",
    "paymentTerms": 30,
    "creditLimit": 50000,
    "currency": "USD",
    "isPreferred": true
  }' | jq '.'

# 4. Listar
echo ""
echo "4. GET /suppliers"
curl -s "$INVENTORY_API/suppliers" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.data[] | {name, code, email, city, isPreferred}'

# 5. Stats
echo ""
echo "5. GET /suppliers/stats"
curl -s "$INVENTORY_API/suppliers/stats" \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.'

echo ""
echo "=========================================="
echo "✅ Test completado"
echo "=========================================="
