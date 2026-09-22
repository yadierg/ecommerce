#!/bin/bash

echo "=========================================="
echo "🧪 FASE 2: Multi-Tenant en store-api"
echo "=========================================="

TENANT_INSTEL="8ce8f633-a091-4513-9215-8c222c8b97c3"
TENANT_TECHNO="d326c029-3e46-4afe-b2c3-6038edec4039"
UNIQUE=$(date +%s)

# 1. Sin header
echo ""
echo "1. Sin header (debe dar error 400):"
curl -s http://localhost:3001/categories | jq '.'

# 2. Login Instel
echo ""
echo "2. Login admin Instel..."
TOKEN_INSTEL=$(curl -s -X POST http://localhost:3004/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@instel.com","password":"Instel123"}' | jq -r '.accessToken')

# 3. Crear categoría Instel (nombre único)
echo ""
echo "3. Crear categoría de Instel:"
curl -s -X POST http://localhost:3001/categories \
  -H "Authorization: Bearer $TOKEN_INSTEL" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Categoria Instel $UNIQUE\",\"order\":1}" | jq '{name, tenantId}'

# 4. Login Techno
echo ""
echo "4. Login admin TechnoStore..."
TOKEN_TECHNO=$(curl -s -X POST http://localhost:3004/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@technostore.com","password":"Techno123"}' | jq -r '.accessToken')

# 5. Crear categoría Techno (nombre único)
echo ""
echo "5. Crear categoría de TechnoStore:"
curl -s -X POST http://localhost:3001/categories \
  -H "Authorization: Bearer $TOKEN_TECHNO" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Categoria Techno $UNIQUE\",\"order\":1}" | jq '{name, tenantId}'

# 6. Categorías de Instel
echo ""
echo "6. Categorías de Instel:"
curl -s http://localhost:3001/categories \
  -H "x-tenant-id: $TENANT_INSTEL" | jq '.[] | {name, tenantId}'

# 7. Categorías de Techno
echo ""
echo "7. Categorías de TechnoStore:"
curl -s http://localhost:3001/categories \
  -H "x-tenant-id: $TENANT_TECHNO" | jq '.[] | {name, tenantId}'

echo ""
echo "=========================================="
echo "✅ FASE 2.1 completada"
echo "=========================================="
