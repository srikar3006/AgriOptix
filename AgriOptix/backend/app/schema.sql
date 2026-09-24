CREATE TABLE IF NOT EXISTS harvests (
 id BIGSERIAL PRIMARY KEY,
 crop TEXT NOT NULL,
 variety TEXT,
 quantity NUMERIC NOT NULL CHECK (quantity > 0),
 quantity_unit TEXT NOT NULL DEFAULT 'kg' CHECK (quantity_unit IN ('kg','quintal','tonne')),
 quantity_kg NUMERIC NOT NULL CHECK (quantity_kg > 0),
 harvest_date DATE NOT NULL,
 harvest_time TIME NOT NULL,
 pickup_readiness TEXT NOT NULL,
 pickup_readiness_date DATE,
 location TEXT NOT NULL,
 latitude DOUBLE PRECISION,
 longitude DOUBLE PRECISION,
 overall_quality TEXT,
 ripeness TEXT,
 visible_damage TEXT,
 size TEXT,
 freshness TEXT,
 estimated_shelf_life TEXT,
 photos JSONB NOT NULL DEFAULT '[]'::jsonb,
 packaging_type TEXT,
 package_weight NUMERIC,
 storage_condition TEXT,
 special_handling TEXT,
 special_handling_notes TEXT,
 pickup_date DATE,
 pickup_time TEXT,
 loading_assistance TEXT,
 status TEXT NOT NULL DEFAULT 'PUBLISHED',
 created_at TIMESTAMPTZ DEFAULT now(),
 updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS buyers (
 id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, location TEXT,
 crop_required TEXT, required_quantity_kg NUMERIC, price_per_kg NUMERIC,
 reliability NUMERIC, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
 id BIGSERIAL PRIMARY KEY, harvest_id BIGINT REFERENCES harvests(id),
 buyer_id BIGINT REFERENCES buyers(id), status TEXT NOT NULL,
 created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settlements (
 id BIGSERIAL PRIMARY KEY, order_id BIGINT REFERENCES orders(id),
 sale_value NUMERIC, logistics_cost NUMERIC, handling_cost NUMERIC,
 net_settlement NUMERIC, status TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_quality_analysis (
 id BIGSERIAL PRIMARY KEY,
 harvest_id BIGINT NOT NULL REFERENCES harvests(id) ON DELETE CASCADE,
 crop_name TEXT NOT NULL,
 overall_quality TEXT NOT NULL,
 visible_damage TEXT NOT NULL,
 ripeness_maturity TEXT NOT NULL,
 size TEXT NOT NULL,
 freshness_condition TEXT NOT NULL,
 estimated_shelf_life TEXT NOT NULL,
 confidence NUMERIC,
 analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 image_references JSONB NOT NULL DEFAULT '[]'::jsonb,
 UNIQUE(harvest_id)
);
