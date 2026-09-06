'use client';

import React, { useEffect, useState } from 'react';
import {
  Moon,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatRupiah, formatDateIndo, getTodayDateString, formatMultiUnitStock } from '@/lib/utils';
import { calculateOpnameOutput } from '@/lib/calculations';
import { warungStore } from '@/lib/store/warungStore';
import { Product, Category, PersonalUsage, DailyStockOpname } from '@/types';

export default function RekapMalamPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [personalUsages, setPersonalUsages] = useState<PersonalUsage[]>([]);
  const [existingOpname, setExistingOpname] = useState<DailyStockOpname | undefined>(undefined);

  // Filters & Controls
  const [date, setDate] = useState(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Input Values Map: { [productId]: physicalCountInBaseUnit }
  const [physicalInputs, setPhysicalInputs] = useState<{ [productId: string]: number | '' }>({});

  // Correction Modal State
  const [correctionProduct, setCorrectionProduct] = useState<Product | null>(null);
  const [correctionQty, setCorrectionQty] = useState<number>(1);
  const [correctionReason, setCorrectionReason] = useState('Ditemukan stok fisik lebih banyak di toko');

  const loadData = () => {
    warungStore.initializeDefaultDataIfEmpty();
    const prods = warungStore.getProducts();
    const cats = warungStore.getCategories();
    const usages = warungStore.getPersonalUsages().filter((u) => u.date === date);
    const op = warungStore.getOpnameByDate(date);

    setProducts(prods);
    setCategories(cats);
    setPersonalUsages(usages);
    setExistingOpname(op);

    // Initialize physical input values
    const initialInputs: { [productId: string]: number | '' } = {};
    prods.forEach((p) => {
      if (op) {
        const item = op.items.find((it) => it.product_id === p.id);
        initialInputs[p.id] = item ? item.physical_stock_base : p.current_stock_base;
      } else {
        initialInputs[p.id] = p.current_stock_base;
      }
    });
    setPhysicalInputs(initialInputs);
  };

  useEffect(() => {
    loadData();
  }, [date]);

  const handleInputChange = (productId: string, val: string) => {
    setPhysicalInputs((prev) => ({
      ...prev,
      [productId]: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0),
    }));
  };

  const handleFillZero = (productId: string) => {
    setPhysicalInputs((prev) => ({ ...prev, [productId]: 0 }));
  };

  const handleFillSystemStock = (productId: string, systemStock: number) => {
    setPhysicalInputs((prev) => ({ ...prev, [productId]: systemStock }));
  };

  const handleFillAllSystemStock = () => {
    const updated: { [productId: string]: number } = {};
    products.forEach((p) => {
      updated[p.id] = p.current_stock_base;
    });
    setPhysicalInputs(updated);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate live projections
  let totalProjectedOmzet = 0;
  let totalProjectedLaba = 0;
  let totalProjectedTerjual = 0;
  let hasWarnings = false;

  const calculationsMap = new Map();

  products.forEach((p) => {
    const rawInput = physicalInputs[p.id];
    const physicalVal = typeof rawInput === 'number' ? rawInput : p.current_stock_base;
    const pUsages = personalUsages.filter((u) => u.product_id === p.id).reduce((acc, c) => acc + (c.quantity_base || 0), 0);

    const calc = calculateOpnameOutput(p, p.current_stock_base, physicalVal, pUsages);
    calculationsMap.set(p.id, calc);

    totalProjectedOmzet += calc.sellingAmount;
    totalProjectedLaba += calc.profitAmount;
    totalProjectedTerjual += calc.calculatedSalesBase;
    if (calc.isPhysicalHigherThanSystem) hasWarnings = true;
  });

  const handleSaveOpname = () => {
    if (hasWarnings) {
      if (!confirm('⚠️ Ada produk dengan stok fisik lebih besar dari stok sistem. Lanjutkan dan simpan rekap malam?')) {
        return;
      }
    }

    const finalInputs: { [productId: string]: number } = {};
    products.forEach((p) => {
      const val = physicalInputs[p.id];
      finalInputs[p.id] = typeof val === 'number' ? val : p.current_stock_base;
    });

    warungStore.submitDailyStockOpname(date, finalInputs);
    alert('✅ Rekap Malam berhasil disimpan! Omzet, Modal & Laba harian otomatis diperbarui.');
    loadData();
  };

  const handleOpenCorrection = (p: Product) => {
    setCorrectionProduct(p);
    setCorrectionQty(5);
    setCorrectionReason('Ditemukan stok fisik lebih banyak di toko');
  };

  const handleSaveCorrection = () => {
    if (!correctionProduct) return;
    warungStore.addStockAdjustment({
      product_id: correctionProduct.id,
      product_name: correctionProduct.name,
      quantity_base: correctionQty,
      adjustment_type: 'INCREASE',
      reason: correctionReason,
      date,
    });
    setCorrectionProduct(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs mb-1 uppercase tracking-wider">
              <Moon className="w-4 h-4 fill-emerald-300" />
              Fitur Utama Warung — Tanpa POS / Kasir
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Rekap Stok Malam Hari</h1>
            <p className="text-emerald-100/80 text-sm mt-1 max-w-xl">
              Cukup masukkan **JUMLAH SISA FISIK BARANG** yang tersisa di warung malam ini. Sistem yang akan menghitung penjualan, omzet, dan laba secara otomatis.
            </p>
          </div>

          {/* Quick Date Selector */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl flex flex-col gap-1.5 shrink-0">
            <span className="text-xs text-emerald-200 font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Tanggal Rekap:
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white text-gray-900 font-bold px-3 py-1.5 rounded-lg text-sm focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Live Projection Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <span className="text-xs text-gray-400 font-semibold uppercase block">Hasil Omzet</span>
          <span className="text-lg md:text-xl font-bold text-emerald-700">{formatRupiah(totalProjectedOmzet)}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 font-semibold uppercase block">Hasil Laba</span>
          <span className="text-lg md:text-xl font-bold text-blue-700">{formatRupiah(totalProjectedLaba)}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 font-semibold uppercase block">Total Terjual</span>
          <span className="text-lg md:text-xl font-bold text-indigo-700">{totalProjectedTerjual} item</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 font-semibold uppercase block">Status Opname</span>
          {existingOpname ? (
            <Badge variant="emerald" className="mt-1">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Sudam Rekap
            </Badge>
          ) : (
            <Badge variant="amber" className="mt-1">
              Belum Final
            </Badge>
          )}
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama produk untuk diisi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleFillAllSystemStock}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            Isi Semua = Stok Sistem
          </button>
          <button
            onClick={handleSaveOpname}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            Simpan Rekap Malam
          </button>
        </div>
      </div>

      {/* Opname Table / Cards List */}
      <div className="space-y-3">
        {filteredProducts.map((p) => {
          const calc = calculationsMap.get(p.id);
          const rawInput = physicalInputs[p.id];
          const defaultUnit = p.units.find((u) => u.is_default) || p.units[0];

          return (
            <Card
              key={p.id}
              className={`p-4 transition-all ${
                calc.isPhysicalHigherThanSystem
                  ? 'border-amber-300 bg-amber-50/20'
                  : calc.calculatedSalesBase > 0
                  ? 'border-emerald-200 bg-emerald-50/10'
                  : 'bg-white'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Product Meta */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700 text-sm shrink-0">
                    {p.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-base leading-snug truncate">{p.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>Stok Sistem: <strong className="text-gray-800">{p.current_stock_base} {p.base_unit}</strong></span>
                      {calc.personalUseBase > 0 && (
                        <span className="text-purple-700 font-semibold">
                          (Pakai Sendiri: {calc.personalUseBase} {p.base_unit})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Input Sisa Fisik Malam Hari */}
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200/80 shrink-0">
                  <span className="text-xs font-bold text-gray-700">Sisa Fisik:</span>
                  <div className="relative">
                    <input
                      type="number"
                      pattern="[0-9]*"
                      min={0}
                      value={rawInput}
                      onChange={(e) => handleInputChange(p.id, e.target.value)}
                      className="w-24 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-lg font-extrabold text-center text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{p.base_unit}</span>

                  <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                    <button
                      onClick={() => handleFillZero(p.id)}
                      className="px-2 py-1 bg-white hover:bg-rose-50 border border-gray-200 text-rose-600 text-[11px] font-bold rounded"
                    >
                      Habis (0)
                    </button>
                  </div>
                </div>

                {/* Calculation Output Projections */}
                <div className="flex items-center justify-between md:justify-end gap-4 min-w-[200px] border-t md:border-t-0 border-gray-100 pt-2 md:pt-0">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">
                      Terjual: <span className="font-bold text-gray-900">{calc.calculatedSalesBase} {p.base_unit}</span>
                    </div>
                    <div className="text-xs text-emerald-700 font-bold">
                      Omzet: {formatRupiah(calc.sellingAmount)}
                    </div>
                    <div className="text-[11px] text-blue-600 font-semibold">
                      Laba: {formatRupiah(calc.profitAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning mechanism if Physical > System */}
              {calc.isPhysicalHigherThanSystem && (
                <div className="mt-3 p-2.5 bg-amber-100/70 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{calc.warningMessage}</span>
                  </div>
                  <button
                    onClick={() => handleOpenCorrection(p)}
                    className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 whitespace-nowrap"
                  >
                    + Koreksi Stok
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Stock Correction Modal */}
      <Modal
        isOpen={Boolean(correctionProduct)}
        onClose={() => setCorrectionProduct(null)}
        title={`Koreksi Stok: ${correctionProduct?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Gunakan fitur ini jika stok fisik di warung lebih banyak dari stok tercatat di sistem (misalnya terdapat belanjaan lama yang belum diinput).
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Tambah Stok Berapa ({correctionProduct?.base_unit})?</label>
            <input
              type="number"
              min={1}
              value={correctionQty}
              onChange={(e) => setCorrectionQty(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Alasan Koreksi</label>
            <input
              type="text"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => setCorrectionProduct(null)}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs"
            >
              Batal
            </button>
            <button
              onClick={handleSaveCorrection}
              className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700"
            >
              Simpan Koreksi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
