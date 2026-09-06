import { Product } from '@/types';

export interface OpnameCalculationResult {
  productId: string;
  systemStockBase: number;
  physicalStockBase: number;
  differenceBase: number;
  personalUseBase: number;
  calculatedSalesBase: number;
  sellingAmount: number;
  costAmount: number;
  profitAmount: number;
  personalUseCostAmount: number;
  netProfitAfterPersonalUse: number;
  isPhysicalHigherThanSystem: boolean;
  warningMessage?: string;
}

/** Harga modal dan jual per satuan dasar (base unit). */
export function getBasePrices(product: Product): {
  costPerBase: number;
  sellingPerBase: number;
} {
  if (!product.units || product.units.length === 0) {
    return { costPerBase: 0, sellingPerBase: 0 };
  }

  const baseUnit = product.units.find((u) => u.conversion_to_base === 1);
  if (baseUnit) {
    return {
      costPerBase: Number(baseUnit.cost_price || 0),
      sellingPerBase: Number(baseUnit.selling_price || 0),
    };
  }

  const defaultUnit =
    product.units.find((u) => u.is_default) || product.units[0];
  const conversion = Number(defaultUnit.conversion_to_base || 1);

  return {
    costPerBase: Number(defaultUnit.cost_price || 0) / conversion,
    sellingPerBase: Number(defaultUnit.selling_price || 0) / conversion,
  };
}

/**
 * Perhitungan rekap malam.
 *
 * Penting: pemakaian pribadi sudah dicatat sebagai PERSONAL_USE (-stok)
 * di stock_movements. Karena itu tidak boleh dikurangkan lagi dari
 * selisih system - physical, agar tidak double-counting.
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
  let warningMessage: string | undefined;

  if (isPhysicalHigherThanSystem) {
    warningMessage = `Jumlah fisik (${physicalStockBase} ${product.base_unit}) lebih besar dari stok sistem (${systemStockBase} ${product.base_unit}). Periksa kembali stok atau catat sebagai koreksi stok.`;
  } else {
    // PERSONAL_USE sudah mengurangi stok sistem lewat stock_movements.
    // Jadi selisih stok = penjualan yang belum dicatat.
    calculatedSalesBase = Math.max(0, differenceBase);
  }

  const { costPerBase, sellingPerBase } = getBasePrices(product);
  const sellingAmount = Math.round(calculatedSalesBase * sellingPerBase);
  const costAmount = Math.round(calculatedSalesBase * costPerBase);
  const profitAmount = sellingAmount - costAmount;
  const personalUseCostAmount = Math.round(personalUseBase * costPerBase);
  const netProfitAfterPersonalUse = profitAmount - personalUseCostAmount;

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
    personalUseCostAmount,
    netProfitAfterPersonalUse,
    isPhysicalHigherThanSystem,
    warningMessage,
  };
}
