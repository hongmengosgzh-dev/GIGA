-- Apply to Cloudflare D1. Money is stored in the currency's smallest unit (JPY: yen).
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY,
 market TEXT NOT NULL CHECK(market IN ('US','JP','UK','DE','CA')),
 currency TEXT NOT NULL,
 total_minor INTEGER NOT NULL CHECK(total_minor>0),
 state TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK(state IN ('awaiting_payment','paid','submitting','submitted','review','cancelled')),
 supplier_order_no TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(market,supplier_order_no),
 CHECK((market='US' AND currency='USD') OR (market='JP' AND currency='JPY') OR (market='UK' AND currency='GBP') OR (market='DE' AND currency='EUR') OR (market='CA' AND currency='CAD'))
);
CREATE TABLE IF NOT EXISTS payments (
 provider TEXT NOT NULL,
 payment_id TEXT NOT NULL,
 order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
 amount_minor INTEGER NOT NULL CHECK(amount_minor>0),
 currency TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 PRIMARY KEY(provider,payment_id)
);
CREATE TABLE IF NOT EXISTS order_packages (
 order_id TEXT NOT NULL REFERENCES orders(id),
 tracking_number TEXT NOT NULL,
 carrier TEXT NOT NULL DEFAULT '',
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(order_id,tracking_number,carrier)
);
CREATE INDEX IF NOT EXISTS orders_state ON orders(state,updated_at);
