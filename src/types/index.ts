export interface Category {
  id: string;
  name: string;
  created_at?: string;
}

export interface ProductUnit {
  id: string;
  product_id: string;
  unit_name: string; // e.g. Batang, Bungkus, Dus, Botol, Pcs
  conversion_to_base: number; // e.g. 16 for bungkus when base is batang
  cost_price: number; // Harga Modal
  selling_price: number; // Harga Jual
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  image_url?: string;
  base_unit: string; // e.g. Batang, Botol, Butir, Pcs
  minimum_stock: number;
  is_active: boolean;
  current_stock_base: number; // Computed stock balance in base unit
  units: ProductUnit[];
  created_at?: string;
  updated_at?: string;
}

export type MovementType = 'PURCHASE' | 'SALE' | 'PERSONAL_USE' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  product_id?: string;
  product_name?: string;
  quantity_base: number;
  movement_type: MovementType;
  reference_id?: string;
  date: string;
  note?: string;
  created_at?: string;
}

export interface PurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string;
  product_name?: string;
  product_unit_id: string;
  unit_name?: string;
  quantity: number;
  quantity_base: number;
  cost_price: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  date: string;
  total_cost: number;
  note?: string;
  items: PurchaseItem[];
  created_at?: string;
}

export type PersonalUsageType = 'BARANG' | 'UANG_CASH';

export interface PersonalUsage {
  id: string;
  type: PersonalUsageType; // 'BARANG' or 'UANG_CASH'
  product_id?: string;
  product_name?: string;
  product_unit_id?: string;
  unit_name?: string;
  quantity?: number;
  quantity_base?: number;
  amount_cash?: number; // Nilai Uang Cash laci yang diambil (misal Rp15.000 untuk beli makan)
  date: string;
  note?: string;
  created_at?: string;
}

export interface DailyStockOpnameItem {
  id?: string;
  stock_opname_id?: string;
  product_id: string;
  product_name?: string;
  system_stock_base: number;
  physical_stock_base: number;
  difference_base: number; // system - physical
  personal_use_base: number;
  calculated_sales_base: number; // difference - personal_use
  selling_amount: number;
  cost_amount: number;
  profit_amount: number;
}

export interface DailyStockOpname {
  id: string;
  date: string;
  status: 'DRAFT' | 'COMPLETED';
  items: DailyStockOpnameItem[];
  total_omzet?: number;
  total_modal?: number;
  total_laba?: number;
  total_terjual_base?: number;
  total_personal_cash?: number; // Total kas laci yang diambil pribadi pada hari itu
  created_at?: string;
}

export interface StockAdjustment {
  id: string;
  product_id: string;
  product_name?: string;
  quantity_base: number;
  adjustment_type: 'INCREASE' | 'DECREASE';
  reason: string;
  date: string;
  created_at?: string;
}

export interface DashboardStats {
  today_omzet: number;
  today_laba: number;
  today_terjual_items: number;
  total_stock_value: number;
  today_personal_use_count: number;
  today_personal_use_cash: number; // Total uang cash laci yang diambil hari ini
  is_rekap_completed_today: boolean;
  low_stock_products: Product[];
  top_selling_products: {
    product_id: string;
    product_name: string;
    total_sales_base: number;
    base_unit: string;
    total_omzet: number;
  }[];
  top_profit_products: {
    product_id: string;
    product_name: string;
    total_profit: number;
    total_sales_base: number;
    base_unit: string;
  }[];
  chart_7_days: {
    date: string;
    date_formatted: string;
    omzet: number;
    laba: number;
    sales_count: number;
  }[];
}
