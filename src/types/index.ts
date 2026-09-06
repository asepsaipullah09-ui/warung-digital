export interface Category {
  id: string;
  name: string;
  created_at?: string;
}

export interface ProductUnit {
  id: string;
  product_id: string;
  unit_name: string;
  conversion_to_base: number;
  cost_price: number;
  selling_price: number;
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
  base_unit: string;
  minimum_stock: number;
  is_active: boolean;
  current_stock_base: number;
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
  type: PersonalUsageType;
  product_id?: string;
  product_name?: string;
  product_unit_id?: string;
  unit_name?: string;
  quantity?: number;
  quantity_base?: number;
  amount_cash?: number;
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
  difference_base: number;
  personal_use_base: number;
  calculated_sales_base: number;
  selling_amount: number;
  cost_amount: number;
  profit_amount: number;
  personal_use_cost_amount?: number;
  net_profit_after_personal_use?: number;
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
  total_personal_cash?: number;
  total_sold_base?: number;
  total_sales_amount?: number;
  total_cost_amount?: number;
  total_profit_amount?: number;
  total_personal_use_cost?: number;
  total_net_profit?: number;
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
  today_personal_use_cash: number;
  today_personal_use_cost?: number;
  today_net_profit?: number;
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
