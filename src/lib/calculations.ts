import { Product, ProductUnit } from '@/types';

export interface OpnameCalculationResult {
  productId: string;
  systemStockBase: number;
  physicalStockBase: number;
  differenceBase: number; // systemStockBase - physicalStockBase (Total items out)
  personalUseBase: number;
  calculatedSalesBase: number; // differenceBase - personalUseBase
  sellingAmount: number;
  costAmount: number;
  profitAmount: number;
  isPhysicalHigherThanSystem: boolean;
  warningMessage?: string;
}

/**
 * Returns the effective cost price and selling price PER BASE UNIT for a product.
 * Prefers default unit or unit with conversion = 1, otherwise derives price per base unit.
 */
export function getBasePrices(product: Product): { costPerBase: number; sellingPerBase: number } {
  if (!product.units || product.units.length === 0) {
    return { costPerBase: 0, sellingPerBase: 0 };
  }

  // 1. Look for explicit base unit (conversion = 1)
  const baseUnit = product.units.find((u) => u.conversion_to_base === 1);
  if (baseUnit && baseUnit.selling_price > 0) {
    return {
      costPerBase: baseUnit.cost_price,
      sellingPerBase: baseUnit.selling_price,
    };
  }

  // 2. Look for default unit
  const defaultUnit = product.units.find((u) => u.is_default) || product.units[0];
  const conv = defaultUnit.conversion_to_base || 1;
  return {
    costPerBase: defaultUnit.cost_price / conv,
    sellingPerBase: defaultUnit.selling_price / conv,
  };
}

/**
 * Core calculation function for Nightly Stock Opname.
 */
export function calculateOpnameOutput(
  product: Product,
  systemStockBase: number,
  physicalStockBase: number,
  personalUseBase: number = 0
): OpnameCalculationResult {
  const isPhysicalHigherThanSystem = physicalStockBase > systemStockBase;
  const differenceBase = systemStockBase - physicalStockBase;

  let calculatedSalesBase = 0;
  let warningMessage: string | undefined = undefined;

  if (isPhysicalHigherThanSystem) {
    warningMessage = `Jumlah fisik (${physicalStockBase} ${product.base_unit}) lebih besar dari stok sistem (${systemStockBase} ${product.base_unit}). Periksa kembali stok atau catat sebagai koreksi stok.`;
    calculatedSalesBase = 0;
  } else {
    // Total keluar = systemStockBase - physicalStockBase
    // Penjualan = Total keluar - Pemakaian Pribadi
    calculatedSalesBase = Math.max(0, differenceBase - personalUseBase);
  }

  const { costPerBase, sellingPerBase } = getBasePrices(product);

  const sellingAmount = Math.round(calculatedSalesBase * sellingPerBase);
  const costAmount = Math.round(calculatedSalesBase * costPerBase);
  const profitAmount = sellingAmount - costAmount;

  return {
    productId: product.id,
    systemStockBase,
    physicalStockBase,
    differenceBase,
    personalUseBase,
    calculatedSalesBase,
    sellingAmount,
    costAmount,
    profitAmount,
    isPhysicalHigherThanSystem,
    warningMessage,
  };
}
