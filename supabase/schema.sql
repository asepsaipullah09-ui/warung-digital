-- SQL Schema for Aplikasi Manajemen Warung Digital

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  base_unit VARCHAR(50) NOT NULL, -- e.g. Batang, Botol, Butir, Pcs, Sachet
  minimum_stock INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCT UNITS (Multi-Satuan)
CREATE TABLE IF NOT EXISTS product_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_name VARCHAR(50) NOT NULL, -- e.g. Batang, Bungkus, Dus, Pak
  conversion_to_base INT NOT NULL DEFAULT 1, -- e.g. 1 Bungkus = 16 Batang
  cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Harga Modal per satuan
  selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0, -- Harga Jual per satuan
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PURCHASES (Barang Masuk Header)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cost DECIMAL(14, 2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PURCHASE ITEMS (Barang Masuk Details)
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  quantity INT NOT NULL,
  quantity_base INT NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(14, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PERSONAL USAGES (Pemakaian Pribadi - Barang & Uang Cash Laci)
CREATE TABLE IF NOT EXISTS personal_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL DEFAULT 'BARANG', -- 'BARANG' atau 'UANG_CASH'
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  quantity INT DEFAULT 0,
  quantity_base INT DEFAULT 0,
  amount_cash DECIMAL(14, 2) DEFAULT 0, -- Uang Cash Laci yang diambil
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. DAILY STOCK OPNAMES (Rekap Malam Header)
CREATE TABLE IF NOT EXISTS daily_stock_opnames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED', -- DRAFT, COMPLETED
  total_personal_cash DECIMAL(14, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. DAILY STOCK OPNAME ITEMS (Rekap Malam Details)
CREATE TABLE IF NOT EXISTS daily_stock_opname_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_opname_id UUID NOT NULL REFERENCES daily_stock_opnames(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  system_stock_base INT NOT NULL,
  physical_stock_base INT NOT NULL,
  difference_base INT NOT NULL, -- system - physical
  personal_use_base INT NOT NULL DEFAULT 0,
  calculated_sales_base INT NOT NULL DEFAULT 0, -- difference - personal_use
  selling_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  cost_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  profit_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. STOCK ADJUSTMENTS (Koreksi Stok)
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_base INT NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL, -- INCREASE, DECREASE
  reason TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. STOCK MOVEMENTS (Auditing / History Log)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity_base INT NOT NULL DEFAULT 0, -- Positive for in, Negative for out
  movement_type VARCHAR(20) NOT NULL, -- PURCHASE, SALE, PERSONAL_USE, ADJUSTMENT
  reference_id UUID,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_units_product ON product_units(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date);
CREATE INDEX IF NOT EXISTS idx_daily_stock_opnames_date ON daily_stock_opnames(date);
CREATE INDEX IF NOT EXISTS idx_personal_usages_date ON personal_usages(date);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
