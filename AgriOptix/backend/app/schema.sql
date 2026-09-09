CREATE TABLE IF NOT EXISTS harvests (
 id BIGSERIAL PRIMARY KEY, crop TEXT NOT NULL, quantity_kg NUMERIC NOT NULL,
 harvest_time TIMESTAMPTZ, quality_grade TEXT, created_at TIMESTAMPTZ DEFAULT now()
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
