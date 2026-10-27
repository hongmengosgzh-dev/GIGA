CREATE TABLE IF NOT EXISTS market_settings (
 market TEXT PRIMARY KEY CHECK(market IN ('US','JP','UK','DE','CA')),
 multiplier REAL NOT NULL DEFAULT 1.3 CHECK(multiplier>=1 AND multiplier<=10),
 pilot_skus TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS manual_products (
 market TEXT NOT NULL CHECK(market IN ('US','JP','UK','DE','CA')),
 sku TEXT NOT NULL,
 payload TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY(market,sku)
);
