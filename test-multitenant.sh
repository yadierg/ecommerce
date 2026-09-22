#!/bin/bash

echo "=========================================="
echo "🧪 Pruebas Multi-Tenant"
echo "=========================================="

# 1. Login super admin
echo ""
echo "1. Login super admin..."
LOGIN=$(curl -s -X POST http://localhost:3004/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Admin123"}')

TOKEN=$(echo $LOGIN | jq -r '.accessToken')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Error en login:"
  echo $LOGIN | jq '.'
  exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:50}..."

# 2. Ver payload
echo ""
echo "2. Payload del JWT:"
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq '{email, isSuperAdmin, tenantId}'

# 3. Listar tenants
echo ""
echo "3. Tenants:"
curl -s http://localhost:3004/tenants \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {slug, name, userCount}'

# 4. Listar usuarios
echo ""
echo "4. Todos los usuarios:"
curl -s http://localhost:3004/users \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {email, tenantId, isSuperAdmin}'

# 5. Login admin Instel
echo ""
echo "5. Login admin Instel..."
TOKEN_INSTEL=$(curl -s -X POST http://localhost:3004/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}' | jq -r '.accessToken')

echo "✅ Token Instel: ${TOKEN_INSTEL:0:50}..."

# 6. Ver payload de Instel
echo ""
echo "6. Payload del JWT de Instel:"
echo $TOKEN_INSTEL | cut -d. -f2 | base64 -d 2>/dev/null | jq '{email, isSuperAdmin, tenantId}'

# 7. Usuarios que ve Instel
echo ""
echo "7. Usuarios que ve admin Instel:"
curl -s http://localhost:3004/users \
  -H "Authorization: Bearer $TOKEN_INSTEL" | jq '.[] | {email, tenantId}'

echo ""
echo "=========================================="
echo "✅ Pruebas completadas"
echo "=========================================="
