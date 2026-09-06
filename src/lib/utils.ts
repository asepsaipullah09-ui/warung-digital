import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ProductUnit } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatShortDateIndo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a base quantity (e.g. 153 batang) into human-readable breakdown.
 * Example: 153 batang with 1 bungkus = 16 batang -> "9 bungkus + 9 batang"
 */
export function formatMultiUnitStock(
  quantityBase: number,
  baseUnit: string,
  units: ProductUnit[]
): string {
  if (quantityBase === 0) return `0 ${baseUnit}`;
  if (!units || units.length <= 1) return `${quantityBase} ${baseUnit}`;

  // Sort units descending by conversion rate (excluding base 1 if larger units exist)
  const sortedUnits = [...units]
    .filter((u) => u.conversion_to_base > 1)
    .sort((a, b) => b.conversion_to_base - a.conversion_to_base);

  if (sortedUnits.length === 0) return `${quantityBase} ${baseUnit}`;

  const primaryLargeUnit = sortedUnits[0]; // e.g. Bungkus (16)
  const largeCount = Math.floor(quantityBase / primaryLargeUnit.conversion_to_base);
  const remainder = quantityBase % primaryLargeUnit.conversion_to_base;

  if (largeCount > 0 && remainder > 0) {
    return `${largeCount} ${primaryLargeUnit.unit_name} + ${remainder} ${baseUnit}`;
  } else if (largeCount > 0 && remainder === 0) {
    return `${largeCount} ${primaryLargeUnit.unit_name}`;
  } else {
    return `${quantityBase} ${baseUnit}`;
  }
}
