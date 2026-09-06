-- SQL Schema for Aplikasi Manajemen Warung Digital

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  base_unit VARCHAR(50) NOT NULL,
  minimum_stock INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_name VARCHAR(50) NOT NULL,
  conversion_to_base INT NOT NULL DEFAULT 1,
  cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cost DECIMAL(14, 2) NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS personal_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(20) NOT NULL DEFAULT 'BARANG',
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  quantity INT DEFAULT 0,
  quantity_base INT DEFAULT 0,
  amount_cash DECIMAL(14, 2) DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_stock_opnames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  total_personal_cash DECIMAL(14, 2) DEFAULT 0,
  total_sold_base INT NOT NULL DEFAULT 0,
  total_sales_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  total_cost_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  total_profit_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  total_personal_use_cost DECIMAL(14, 2) NOT NULL DEFAULT 0,
  total_net_profit DECIMAL(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_stock_opname_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_opname_id UUID NOT NULL REFERENCES daily_stock_opnames(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  system_stock_base INT NOT NULL,
  physical_stock_base INT NOT NULL,
  difference_base INT NOT NULL,
  personal_use_base INT NOT NULL DEFAULT 0,
  calculated_sales_base INT NOT NULL DEFAULT 0,
  selling_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  cost_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  profit_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  personal_use_cost_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  net_profit_after_personal_use DECIMAL(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_base INT NOT NULL,
  adjustment_type VARCHAR(20) NOT NULL,
  reason TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity_base INT NOT NULL DEFAULT 0,
  movement_type VARCHAR(20) NOT NULL,
  reference_id UUID,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_units_product ON product_units(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date);
CREATE INDEX IF NOT EXISTS idx_daily_stock_opnames_date ON daily_stock_opnames(date);
CREATE INDEX IF NOT EXISTS idx_personal_usages_date ON personal_usages(date);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);

-- Safe migration for an existing database.
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_sold_base INT NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_sales_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_cost_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_profit_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_personal_use_cost DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_net_profit DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public.daily_stock_opname_items ADD COLUMN IF NOT EXISTS personal_use_cost_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opname_items ADD COLUMN IF NOT EXISTS net_profit_after_personal_use DECIMAL(14,2) NOT NULL DEFAULT 0;
