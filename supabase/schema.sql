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
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_name VARCHAR(50) NOT NULL, conversion_to_base INT NOT NULL DEFAULT 1, cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0, is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_cost DECIMAL(14,2) NOT NULL DEFAULT 0, note TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  quantity INT NOT NULL, quantity_base INT NOT NULL, cost_price DECIMAL(12,2) NOT NULL, subtotal DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS personal_usages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), type VARCHAR(20) NOT NULL DEFAULT 'BARANG',
  product_id UUID REFERENCES products(id) ON DELETE CASCADE, product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
  quantity INT DEFAULT 0, quantity_base INT DEFAULT 0, amount_cash DECIMAL(14,2) DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE, note TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS daily_stock_opnames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), date DATE NOT NULL UNIQUE, status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  total_personal_cash DECIMAL(14,2) DEFAULT 0, total_sold_base INT NOT NULL DEFAULT 0, total_sales_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_cost_amount DECIMAL(14,2) NOT NULL DEFAULT 0, total_profit_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_personal_use_cost DECIMAL(14,2) NOT NULL DEFAULT 0, total_net_profit DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS daily_stock_opname_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), stock_opname_id UUID NOT NULL REFERENCES daily_stock_opnames(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE, system_stock_base INT NOT NULL, physical_stock_base INT NOT NULL,
  difference_base INT NOT NULL, personal_use_base INT NOT NULL DEFAULT 0, calculated_sales_base INT NOT NULL DEFAULT 0,
  selling_amount DECIMAL(14,2) NOT NULL DEFAULT 0, cost_amount DECIMAL(14,2) NOT NULL DEFAULT 0, profit_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  personal_use_cost_amount DECIMAL(14,2) NOT NULL DEFAULT 0, net_profit_after_personal_use DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity_base INT NOT NULL, adjustment_type VARCHAR(20) NOT NULL, reason TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity_base INT NOT NULL DEFAULT 0, movement_type VARCHAR(20) NOT NULL, reference_id UUID,
  date DATE NOT NULL DEFAULT CURRENT_DATE, note TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buku kas. opening_balance adalah saldo kas aktual ketika aplikasi mulai dipakai.
-- cash_transactions.amount positif = kas masuk, negatif = kas keluar.
CREATE TABLE IF NOT EXISTS cash_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type VARCHAR(30) NOT NULL, amount DECIMAL(14,2) NOT NULL,
  reference_id UUID, note TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT cash_transactions_amount_nonzero CHECK (amount <> 0)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_units_product ON product_units(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date);
CREATE INDEX IF NOT EXISTS idx_daily_stock_opnames_date ON daily_stock_opnames(date);
CREATE INDEX IF NOT EXISTS idx_personal_usages_date ON personal_usages(date);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON cash_transactions(date);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_reference ON cash_transactions(reference_id);

ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_sold_base INT NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_sales_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_cost_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_profit_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_personal_use_cost DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opnames ADD COLUMN IF NOT EXISTS total_net_profit DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opname_items ADD COLUMN IF NOT EXISTS personal_use_cost_amount DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.daily_stock_opname_items ADD COLUMN IF NOT EXISTS net_profit_after_personal_use DECIMAL(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stock_opnames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stock_opname_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','products','product_units','purchases','purchase_items','personal_usages','daily_stock_opnames','daily_stock_opname_items','stock_adjustments','stock_movements','cash_settings','cash_transactions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public_select_%s_warung" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "public_insert_%s_warung" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "public_update_%s_warung" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "public_delete_%s_warung" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "public_select_%s_warung" ON public.%I FOR SELECT TO public USING (true)', t, t);
    EXECUTE format('CREATE POLICY "public_insert_%s_warung" ON public.%I FOR INSERT TO public WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "public_update_%s_warung" ON public.%I FOR UPDATE TO public USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "public_delete_%s_warung" ON public.%I FOR DELETE TO public USING (true)', t, t);
  END LOOP;
END $$;

-- ============================================================
-- OTOMATISASI BUKU KAS
-- ============================================================
-- Barang Masuk dianggap pembayaran tunai.
CREATE OR REPLACE FUNCTION public.record_purchase_cash() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.cash_transactions(date, transaction_type, amount, reference_id, note)
  VALUES (NEW.date, 'PURCHASE', -ABS(NEW.total_cost), NEW.id, COALESCE(NEW.note, 'Pembayaran barang masuk'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.record_personal_cash() RETURNS trigger AS $$
BEGIN
  IF NEW.type = 'UANG_CASH' AND COALESCE(NEW.amount_cash, 0) > 0 THEN
    INSERT INTO public.cash_transactions(date, transaction_type, amount, reference_id, note)
    VALUES (NEW.date, 'PERSONAL_WITHDRAWAL', -ABS(NEW.amount_cash), NEW.id, COALESCE(NEW.note, 'Pengambilan uang pribadi'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.record_opname_sales_cash() RETURNS trigger AS $$
BEGIN
  IF COALESCE(NEW.total_sales_amount, 0) > 0 THEN
    INSERT INTO public.cash_transactions(date, transaction_type, amount, reference_id, note)
    VALUES (NEW.date, 'SALE', ABS(NEW.total_sales_amount), NEW.id, 'Hasil penjualan dari Rekap Malam');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_purchase_cash ON public.purchases;
CREATE TRIGGER trg_purchase_cash AFTER INSERT ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.record_purchase_cash();
DROP TRIGGER IF EXISTS trg_personal_cash ON public.personal_usages;
CREATE TRIGGER trg_personal_cash AFTER INSERT ON public.personal_usages FOR EACH ROW EXECUTE FUNCTION public.record_personal_cash();
DROP TRIGGER IF EXISTS trg_opname_sales_cash ON public.daily_stock_opnames;
CREATE TRIGGER trg_opname_sales_cash AFTER INSERT ON public.daily_stock_opnames FOR EACH ROW EXECUTE FUNCTION public.record_opname_sales_cash();
