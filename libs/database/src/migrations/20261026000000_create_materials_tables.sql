-- ============================================
-- Sistema de Materiales — Migración inicial
-- ============================================

-- 1. product_types
CREATE TABLE product_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(30) NOT NULL,
    name VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    icon VARCHAR(50),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    order_index INT NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_product_types_tenant ON product_types(tenant_id);
CREATE INDEX idx_product_types_code ON product_types(code);
CREATE UNIQUE INDEX uq_product_types_code_tenant
    ON product_types(COALESCE(tenant_id::text, 'SYSTEM'), code);

-- 2. attribute_definitions
CREATE TYPE attribute_data_type AS ENUM ('string','number','boolean','date','enum');

CREATE TABLE attribute_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    product_type_id UUID REFERENCES product_types(id) ON DELETE CASCADE,
    key VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    label_en VARCHAR(100),
    data_type attribute_data_type NOT NULL DEFAULT 'string',
    unit VARCHAR(20),
    enum_values JSONB,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_searchable BOOLEAN NOT NULL DEFAULT TRUE,
    is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
    validation_regex VARCHAR(200),
    min_value NUMERIC,
    max_value NUMERIC,
    order_index INT NOT NULL DEFAULT 0,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attr_defs_type ON attribute_definitions(product_type_id);
CREATE UNIQUE INDEX uq_attr_defs_unique
    ON attribute_definitions(
        COALESCE(tenant_id::text, 'SYSTEM'),
        COALESCE(product_type_id::text, 'ANY'),
        key
    );

-- 3. materials
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    product_type_id UUID REFERENCES product_types(id) ON DELETE SET NULL,
    unit_of_measure_id UUID NOT NULL REFERENCES units_of_measure(id),
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    last_purchase_cost NUMERIC(12,2),
    average_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 0,
    max_stock INT,
    reorder_point INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_purchasable BOOLEAN NOT NULL DEFAULT TRUE,
    is_consumable BOOLEAN NOT NULL DEFAULT TRUE,
    brand VARCHAR(100),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    image VARCHAR(500),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_materials_tenant ON materials(tenant_id);
CREATE INDEX idx_materials_sku ON materials(tenant_id, sku);
CREATE INDEX idx_materials_category ON materials(category_id);
CREATE INDEX idx_materials_type ON materials(product_type_id);

-- 4. product_attributes (EAV)
CREATE TABLE product_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    attribute_definition_id UUID REFERENCES attribute_definitions(id) ON DELETE SET NULL,
    attribute_key VARCHAR(50) NOT NULL,
    attribute_label VARCHAR(100) NOT NULL,
    attribute_value TEXT NOT NULL,
    attribute_type attribute_data_type NOT NULL DEFAULT 'string',
    unit VARCHAR(20),
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (material_id IS NOT NULL OR product_id IS NOT NULL)
);
CREATE INDEX idx_product_attrs_material ON product_attributes(material_id);
CREATE INDEX idx_product_attrs_product ON product_attributes(product_id);
CREATE INDEX idx_product_attrs_key ON product_attributes(attribute_key);
CREATE UNIQUE INDEX uq_product_attrs_material
    ON product_attributes(material_id, attribute_key) WHERE material_id IS NOT NULL;
CREATE UNIQUE INDEX uq_product_attrs_product
    ON product_attributes(product_id, attribute_key) WHERE product_id IS NOT NULL;

-- 5. price_history
CREATE TABLE price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    unit_cost NUMERIC(12,2) NOT NULL,
    quantity NUMERIC(12,3) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    purchase_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_price_history_material ON price_history(material_id, purchase_date DESC);
CREATE INDEX idx_price_history_supplier ON price_history(supplier_id);