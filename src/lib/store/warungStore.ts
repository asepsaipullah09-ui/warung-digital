import {
  Category,
  Product,
  Purchase,
  PersonalUsage,
  DailyStockOpname,
  StockAdjustment,
  StockMovement,
  DashboardStats,
  DailyStockOpnameItem,
} from '@/types';
import {
  initialCategories,
  initialProducts,
  initialPurchases,
  initialPersonalUsages,
  initialDailyStockOpnames,
  initialStockAdjustments,
  initialStockMovements,
} from './initialData';
import { getTodayDateString, formatDateIndo, formatShortDateIndo } from '../utils';
import { calculateOpnameOutput } from '../calculations';

const STORAGE_KEYS = {
  CATEGORIES: 'warung_categories_v1',
  PRODUCTS: 'warung_products_v1',
  PURCHASES: 'warung_purchases_v1',
  PERSONAL_USAGES: 'warung_personal_usages_v1',
  OPNAMES: 'warung_opnames_v1',
  ADJUSTMENTS: 'warung_adjustments_v1',
  MOVEMENTS: 'warung_movements_v1',
};

class WarungStoreService {
  private get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write error', e);
    }
  }

  public initializeDefaultDataIfEmpty() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
      this.resetToDefaults();
    }
  }

  public resetToDefaults() {
    this.set(STORAGE_KEYS.CATEGORIES, initialCategories);
    this.set(STORAGE_KEYS.PRODUCTS, initialProducts);
    this.set(STORAGE_KEYS.PURCHASES, initialPurchases);
    this.set(STORAGE_KEYS.PERSONAL_USAGES, initialPersonalUsages);
    this.set(STORAGE_KEYS.OPNAMES, initialDailyStockOpnames);
    this.set(STORAGE_KEYS.ADJUSTMENTS, initialStockAdjustments);
    this.set(STORAGE_KEYS.MOVEMENTS, initialStockMovements);
  }

  // --- CATEGORIES ---
  public getCategories(): Category[] {
    return this.get(STORAGE_KEYS.CATEGORIES, initialCategories);
  }

  public addCategory(name: string): Category {
    const categories = this.getCategories();
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      created_at: new Date().toISOString(),
    };
    categories.push(newCat);
    this.set(STORAGE_KEYS.CATEGORIES, categories);
    return newCat;
  }

  // --- PRODUCTS ---
  public getProducts(): Product[] {
    const categories = this.getCategories();
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const products: Product[] = this.get(STORAGE_KEYS.PRODUCTS, initialProducts);

    return products.map((p) => ({
      ...p,
      category_name: catMap.get(p.category_id) || 'Umum',
    }));
  }

  public getProductById(id: string): Product | undefined {
    return this.getProducts().find((p) => p.id === id);
  }

  public addProduct(productData: Omit<Product, 'id' | 'current_stock_base'> & { initial_stock_base?: number }): Product {
    const products = this.getProducts();
    const newId = `prod-${Date.now()}`;
    const initialStock = productData.initial_stock_base || 0;

    const newProduct: Product = {
      ...productData,
      id: newId,
      current_stock_base: initialStock,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    products.push(newProduct);
    this.set(STORAGE_KEYS.PRODUCTS, products);

    if (initialStock > 0) {
      this.addMovement({
        product_id: newId,
        product_name: newProduct.name,
        quantity_base: initialStock,
        movement_type: 'PURCHASE',
        date: getTodayDateString(),
        note: 'Stok awal produk baru',
      });
    }

    return newProduct;
  }

  public updateProduct(product: Product): Product {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    if (index !== -1) {
      products[index] = {
        ...product,
        updated_at: new Date().toISOString(),
      };
      this.set(STORAGE_KEYS.PRODUCTS, products);
    }
    return product;
  }

  public deleteProduct(id: string): void {
    const products = this.getProducts().filter((p) => p.id !== id);
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  // --- PURCHASES (Barang Masuk) ---
  public getPurchases(): Purchase[] {
    return this.get(STORAGE_KEYS.PURCHASES, initialPurchases);
  }

  public addPurchase(purchaseData: Omit<Purchase, 'id' | 'created_at'>): Purchase {
    const purchases = this.getPurchases();
    const products = this.getProducts();

    const newPurchase: Purchase = {
      ...purchaseData,
      id: `pur-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    newPurchase.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.product_id);
      if (prod) {
        prod.current_stock_base += item.quantity_base;
        this.addMovement({
          product_id: prod.id,
          product_name: prod.name,
          quantity_base: item.quantity_base,
          movement_type: 'PURCHASE',
          reference_id: newPurchase.id,
          date: newPurchase.date,
          note: `Barang Masuk (${item.quantity} ${item.unit_name || prod.base_unit})`,
        });
      }
    });

    this.set(STORAGE_KEYS.PRODUCTS, products);
    purchases.unshift(newPurchase);
    this.set(STORAGE_KEYS.PURCHASES, purchases);

    return newPurchase;
  }

  // --- PERSONAL USAGES (Pemakaian Pribadi: BARANG & UANG CASH) ---
  public getPersonalUsages(): PersonalUsage[] {
    return this.get(STORAGE_KEYS.PERSONAL_USAGES, initialPersonalUsages);
  }

  public addPersonalUsage(usageData: Omit<PersonalUsage, 'id' | 'created_at'>): PersonalUsage {
    const usages = this.getPersonalUsages();

    const newUsage: PersonalUsage = {
      ...usageData,
      id: `pu-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    if (newUsage.type === 'BARANG' && newUsage.product_id) {
      const products = this.getProducts();
      const prod = products.find((p) => p.id === newUsage.product_id);
      if (prod) {
        prod.current_stock_base = Math.max(0, prod.current_stock_base - (newUsage.quantity_base || 0));
        this.addMovement({
          product_id: prod.id,
          product_name: prod.name,
          quantity_base: -(newUsage.quantity_base || 0),
          movement_type: 'PERSONAL_USE',
          reference_id: newUsage.id,
          date: newUsage.date,
          note: `Pemakaian Pribadi (Barang): ${newUsage.note || ''}`,
        });
        this.set(STORAGE_KEYS.PRODUCTS, products);
      }
    } else if (newUsage.type === 'UANG_CASH') {
      this.addMovement({
        quantity_base: 0,
        movement_type: 'PERSONAL_USE',
        reference_id: newUsage.id,
        date: newUsage.date,
        note: `Pemakaian Pribadi (Uang Cash Laci Rp${newUsage.amount_cash?.toLocaleString('id-ID')}): ${newUsage.note || ''}`,
      });
    }

    usages.unshift(newUsage);
    this.set(STORAGE_KEYS.PERSONAL_USAGES, usages);

    return newUsage;
  }

  // --- STOCK ADJUSTMENTS (Koreksi Stok) ---
  public getStockAdjustments(): StockAdjustment[] {
    return this.get(STORAGE_KEYS.ADJUSTMENTS, initialStockAdjustments);
  }

  public addStockAdjustment(adjData: Omit<StockAdjustment, 'id' | 'created_at'>): StockAdjustment {
    const adjustments = this.getStockAdjustments();
    const products = this.getProducts();

    const newAdj: StockAdjustment = {
      ...adjData,
      id: `adj-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    const prod = products.find((p) => p.id === newAdj.product_id);
    if (prod) {
      const delta = newAdj.adjustment_type === 'INCREASE' ? newAdj.quantity_base : -newAdj.quantity_base;
      prod.current_stock_base = Math.max(0, prod.current_stock_base + delta);

      this.addMovement({
        product_id: prod.id,
        product_name: prod.name,
        quantity_base: delta,
        movement_type: 'ADJUSTMENT',
        reference_id: newAdj.id,
        date: newAdj.date,
        note: `Koreksi Stok (${newAdj.adjustment_type}): ${newAdj.reason}`,
      });

      this.set(STORAGE_KEYS.PRODUCTS, products);
    }

    adjustments.unshift(newAdj);
    this.set(STORAGE_KEYS.ADJUSTMENTS, adjustments);

    return newAdj;
  }

  // --- DAILY STOCK OPNAMES (Rekap Malam) ---
  public getDailyOpnames(): DailyStockOpname[] {
    return this.get(STORAGE_KEYS.OPNAMES, initialDailyStockOpnames);
  }

  public getOpnameByDate(dateStr: string): DailyStockOpname | undefined {
    return this.getDailyOpnames().find((o) => o.date === dateStr);
  }

  public submitDailyStockOpname(
    dateStr: string,
    physicalInputs: { [productId: string]: number }
  ): DailyStockOpname {
    const opnames = this.getDailyOpnames();
    const products = this.getProducts();
    const personalUsages = this.getPersonalUsages().filter((u) => u.date === dateStr);

    const totalPersonalCash = personalUsages
      .filter((u) => u.type === 'UANG_CASH')
      .reduce((acc, c) => acc + (c.amount_cash || 0), 0);

    let totalOmzet = 0;
    let totalModal = 0;
    let totalLaba = 0;
    let totalTerjualBase = 0;

    const opnameItems: DailyStockOpnameItem[] = [];

    products.forEach((prod) => {
      const physicalStock = physicalInputs[prod.id] !== undefined ? physicalInputs[prod.id] : prod.current_stock_base;
      const personalUseForProd = personalUsages
        .filter((u) => u.type === 'BARANG' && u.product_id === prod.id)
        .reduce((acc, curr) => acc + (curr.quantity_base || 0), 0);

      const calc = calculateOpnameOutput(prod, prod.current_stock_base, physicalStock, personalUseForProd);

      opnameItems.push({
        id: `op-item-${Date.now()}-${prod.id}`,
        product_id: prod.id,
        product_name: prod.name,
        system_stock_base: calc.systemStockBase,
        physical_stock_base: calc.physicalStockBase,
        difference_base: calc.differenceBase,
        personal_use_base: calc.personalUseBase,
        calculated_sales_base: calc.calculatedSalesBase,
        selling_amount: calc.sellingAmount,
        cost_amount: calc.costAmount,
        profit_amount: calc.profitAmount,
      });

      totalOmzet += calc.sellingAmount;
      totalModal += calc.costAmount;
      totalLaba += calc.profitAmount;
      totalTerjualBase += calc.calculatedSalesBase;

      prod.current_stock_base = calc.physicalStockBase;

      if (calc.calculatedSalesBase > 0) {
        this.addMovement({
          product_id: prod.id,
          product_name: prod.name,
          quantity_base: -calc.calculatedSalesBase,
          movement_type: 'SALE',
          date: dateStr,
          note: `Hasil Rekap Malam (Terjual ${calc.calculatedSalesBase} ${prod.base_unit})`,
        });
      }
    });

    this.set(STORAGE_KEYS.PRODUCTS, products);

    const existingIndex = opnames.findIndex((o) => o.date === dateStr);
    const newOpname: DailyStockOpname = {
      id: existingIndex !== -1 ? opnames[existingIndex].id : `opname-${Date.now()}`,
      date: dateStr,
      status: 'COMPLETED',
      total_omzet: totalOmzet,
      total_modal: totalModal,
      total_laba: totalLaba,
      total_terjual_base: totalTerjualBase,
      total_personal_cash: totalPersonalCash,
      items: opnameItems,
      created_at: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      opnames[existingIndex] = newOpname;
    } else {
      opnames.unshift(newOpname);
    }

    this.set(STORAGE_KEYS.OPNAMES, opnames);
    return newOpname;
  }

  // --- MOVEMENTS ---
  public getStockMovements(): StockMovement[] {
    return this.get(STORAGE_KEYS.MOVEMENTS, initialStockMovements);
  }

  private addMovement(movement: Omit<StockMovement, 'id' | 'created_at'>) {
    const movements = this.getStockMovements();
    movements.unshift({
      ...movement,
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    });
    this.set(STORAGE_KEYS.MOVEMENTS, movements);
  }

  // --- DASHBOARD AGGREGATIONS ---
  public getDashboardStats(): DashboardStats {
    const today = getTodayDateString();
    const products = this.getProducts();
    const opnames = this.getDailyOpnames();
    const personalUsages = this.getPersonalUsages();

    const todayOpname = opnames.find((o) => o.date === today);
    const is_rekap_completed_today = Boolean(todayOpname && todayOpname.status === 'COMPLETED');

    const today_omzet = todayOpname?.total_omzet || 0;
    const today_laba = todayOpname?.total_laba || 0;
    const today_terjual_items = todayOpname?.total_terjual_base || 0;

    const total_stock_value = products.reduce((acc, p) => {
      const defaultUnit = p.units.find((u) => u.is_default) || p.units[0];
      const costPerBase = defaultUnit ? defaultUnit.cost_price / (defaultUnit.conversion_to_base || 1) : 0;
      return acc + p.current_stock_base * costPerBase;
    }, 0);

    const todayUsages = personalUsages.filter((u) => u.date === today);
    const today_personal_use_count = todayUsages
      .filter((u) => u.type === 'BARANG')
      .reduce((acc, curr) => acc + (curr.quantity_base || 0), 0);
    const today_personal_use_cash = todayUsages
      .filter((u) => u.type === 'UANG_CASH')
      .reduce((acc, curr) => acc + (curr.amount_cash || 0), 0);

    const low_stock_products = products.filter((p) => p.is_active && p.current_stock_base <= p.minimum_stock);

    const salesMap = new Map<string, { name: string; sales: number; omzet: number; profit: number; base_unit: string }>();
    opnames.forEach((op) => {
      op.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.product_id);
        const existing = salesMap.get(item.product_id) || {
          name: item.product_name || prod?.name || 'Produk',
          sales: 0,
          omzet: 0,
          profit: 0,
          base_unit: prod?.base_unit || 'Pcs',
        };
        existing.sales += item.calculated_sales_base;
        existing.omzet += item.selling_amount;
        existing.profit += item.profit_amount;
        salesMap.set(item.product_id, existing);
      });
    });

    const performanceList = Array.from(salesMap.entries()).map(([id, val]) => ({
      product_id: id,
      product_name: val.name,
      total_sales_base: val.sales,
      base_unit: val.base_unit,
      total_omzet: val.omzet,
      total_profit: val.profit,
    }));

    const top_selling_products = [...performanceList].sort((a, b) => b.total_sales_base - a.total_sales_base).slice(0, 5);
    const top_profit_products = [...performanceList].sort((a, b) => b.total_profit - a.total_profit).slice(0, 5);

    const chart_7_days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const op = opnames.find((o) => o.date === dateStr);

      chart_7_days.push({
        date: dateStr,
        date_formatted: formatShortDateIndo(dateStr),
        omzet: op?.total_omzet || 0,
        laba: op?.total_laba || 0,
        sales_count: op?.total_terjual_base || 0,
      });
    }

    return {
      today_omzet,
      today_laba,
      today_terjual_items,
      total_stock_value: Math.round(total_stock_value),
      today_personal_use_count,
      today_personal_use_cash,
      is_rekap_completed_today,
      low_stock_products,
      top_selling_products,
      top_profit_products,
      chart_7_days,
    };
  }
}

export const warungStore = new WarungStoreService();
