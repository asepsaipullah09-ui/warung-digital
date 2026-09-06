'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Moon,
  Search,
  CheckCircle2,
  AlertTriangle,
  Save,
  Calendar,
  RotateCcw,
  Plus,
  X,
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { formatRupiah, formatDateIndo, getTodayDateString } from '@/lib/utils';
import { calculateOpnameOutput } from '@/lib/calculations';

type Category = {
  id: string;
  name: string;
};

type ProductUnit = {
  id: string;
  product_id: string;
  unit_name: string;
  conversion_to_base: number;
  cost_price: number;
  selling_price: number;
  is_default: boolean;
};

type Product = {
  id: string;
  category_id: string | null;
  name: string;
  image_url: string | null;
  base_unit: string;
  minimum_stock: number;
  is_active: boolean;
  units: ProductUnit[];
  current_stock_base: number;
};

type PersonalUsage = {
  id: string;
  type: 'BARANG' | 'UANG_CASH';
  product_id: string | null;
  product_unit_id: string | null;
  quantity: number | null;
  quantity_base: number | null;
  amount_cash: number | null;
  date: string;
  note: string | null;
};

type Calculation = {
  systemStockBase: number;
  physicalStockBase: number;
  differenceBase: number;
  personalUseBase: number;
  calculatedSalesBase: number;
  sellingAmount: number;
  costAmount: number;
  profitAmount: number;
  isPhysicalHigherThanSystem: boolean;
  warningMessage?: string;
};

export default function RekapMalamPage() {
  const [date, setDate] = useState(getTodayDateString());

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [personalUsages, setPersonalUsages] = useState<PersonalUsage[]>([]);

  const [physicalInputs, setPhysicalInputs] = useState<
    Record<string, number | ''>
  >({});

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [existingOpname, setExistingOpname] = useState<any>(null);

  const [correctionProduct, setCorrectionProduct] = useState<Product | null>(
    null
  );
  const [correctionQty, setCorrectionQty] = useState(1);
  const [correctionReason, setCorrectionReason] = useState(
    'Ditemukan stok fisik lebih banyak di toko'
  );
  const [savingCorrection, setSavingCorrection] = useState(false);

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    if (!supabase || !isSupabaseConfigured) {
      alert(
        'Supabase belum terkonfigurasi. Periksa NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // --------------------------------------------------------
      // 1. Ambil kategori
      // --------------------------------------------------------

      const { data: categoryData, error: categoryError } =
        await supabase.from('categories').select('id, name').order('name');

      if (categoryError) {
        throw new Error(`Gagal mengambil kategori: ${categoryError.message}`);
      }

      // --------------------------------------------------------
      // 2. Ambil products
      // --------------------------------------------------------

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(
          `
          id,
          category_id,
          name,
          image_url,
          base_unit,
          minimum_stock,
          is_active
        `
        )
        .eq('is_active', true)
        .order('name');

      if (productError) {
        throw new Error(`Gagal mengambil produk: ${productError.message}`);
      }

      // --------------------------------------------------------
      // 3. Ambil product_units
      // --------------------------------------------------------

      const productIds = (productData || []).map((p) => p.id);

      let unitData: ProductUnit[] = [];

      if (productIds.length > 0) {
        const { data, error: unitError } = await supabase
          .from('product_units')
          .select(
            `
            id,
            product_id,
            unit_name,
            conversion_to_base,
            cost_price,
            selling_price,
            is_default
          `
          )
          .in('product_id', productIds)
          .order('conversion_to_base');

        if (unitError) {
          throw new Error(
            `Gagal mengambil satuan produk: ${unitError.message}`
          );
        }

        unitData = (data || []) as ProductUnit[];
      }

      // --------------------------------------------------------
      // 4. Ambil stock movements
      //
      // Stock sistem dihitung dari seluruh movement:
      //
      // PURCHASE     = +
      // SALE         = -
      // PERSONAL_USE = -
      // ADJUSTMENT   = + / -
      //
      // Untuk tanggal rekap, SALE hari tersebut tidak dihitung
      // sebagai stok awal supaya saat menyimpan tidak dobel.
      // --------------------------------------------------------

      let movementData: any[] = [];

      if (productIds.length > 0) {
        const { data, error: movementError } = await supabase
          .from('stock_movements')
          .select(
            `
            id,
            product_id,
            quantity_base,
            movement_type,
            date,
            created_at
          `
          )
          .in('product_id', productIds)
          .lte('date', date);

        if (movementError) {
          throw new Error(
            `Gagal mengambil stok: ${movementError.message}`
          );
        }

        movementData = data || [];
      }

      // --------------------------------------------------------
      // Hitung stok sistem
      // --------------------------------------------------------

      const stockMap: Record<string, number> = {};

      productIds.forEach((id) => {
        stockMap[id] = 0;
      });

      movementData.forEach((movement) => {
        if (!movement.product_id) return;

        /*
         * SALE pada tanggal rekap tidak dimasukkan.
         *
         * Tujuannya agar kalau user membuka kembali tanggal
         * tersebut sebelum disimpan, stok sistem tidak
         * berkurang dua kali.
         */
        if (
          movement.movement_type === 'SALE' &&
          movement.date === date
        ) {
          return;
        }

        stockMap[movement.product_id] =
          (stockMap[movement.product_id] || 0) +
          Number(movement.quantity_base || 0);
      });

      // --------------------------------------------------------
      // 5. Ambil pemakaian pribadi tanggal tersebut
      // --------------------------------------------------------

      const { data: usageData, error: usageError } = await supabase
        .from('personal_usages')
        .select(
          `
          id,
          type,
          product_id,
          product_unit_id,
          quantity,
          quantity_base,
          amount_cash,
          date,
          note
        `
        )
        .eq('date', date);

      if (usageError) {
        throw new Error(
          `Gagal mengambil pemakaian pribadi: ${usageError.message}`
        );
      }

      // --------------------------------------------------------
      // 6. Ambil opname tanggal tersebut jika sudah ada
      // --------------------------------------------------------

      const { data: opnameData, error: opnameError } = await supabase
        .from('daily_stock_opnames')
        .select('*')
        .eq('date', date)
        .maybeSingle();

      if (opnameError) {
        throw new Error(
          `Gagal mengambil rekap malam: ${opnameError.message}`
        );
      }

      // --------------------------------------------------------
      // 7. Susun data product + unit + stok
      // --------------------------------------------------------

      const finalProducts: Product[] = (productData || []).map((product) => {
        const units = unitData.filter(
          (unit) => unit.product_id === product.id
        );

        return {
          id: product.id,
          category_id: product.category_id,
          name: product.name,
          image_url: product.image_url,
          base_unit: product.base_unit,
          minimum_stock: Number(product.minimum_stock || 0),
          is_active: product.is_active,
          units,
          current_stock_base: Math.max(
            0,
            Math.round(stockMap[product.id] || 0)
          ),
        };
      });

      setCategories((categoryData || []) as Category[]);
      setProducts(finalProducts);
      setPersonalUsages((usageData || []) as PersonalUsage[]);
      setExistingOpname(opnameData || null);

      // --------------------------------------------------------
      // 8. Isi input fisik
      // --------------------------------------------------------

      const inputs: Record<string, number | ''> = {};

      if (opnameData) {
        const { data: opnameItems, error: itemError } = await supabase
          .from('daily_stock_opname_items')
          .select(
            `
            product_id,
            physical_stock_base
          `
          )
          .eq('stock_opname_id', opnameData.id);

        if (itemError) {
          throw new Error(
            `Gagal mengambil detail rekap: ${itemError.message}`
          );
        }

        const itemMap = new Map(
          (opnameItems || []).map((item) => [
            item.product_id,
            Number(item.physical_stock_base || 0),
          ])
        );

        finalProducts.forEach((product) => {
          inputs[product.id] = itemMap.has(product.id)
            ? itemMap.get(product.id)!
            : product.current_stock_base;
        });
      } else {
        finalProducts.forEach((product) => {
          inputs[product.id] = product.current_stock_base;
        });
      }

      setPhysicalInputs(inputs);
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          'Terjadi kesalahan saat mengambil data dari Supabase.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  // ============================================================
  // FILTER
  // ============================================================

  const filteredProducts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !keyword || product.name.toLowerCase().includes(keyword);

      const matchesCategory =
        selectedCategory === 'ALL' ||
        product.category_id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // ============================================================
  // PERSONAL USE
  // ============================================================

  const getPersonalUseForProduct = (productId: string) => {
    return personalUsages
      .filter(
        (usage) =>
          usage.type === 'BARANG' &&
          usage.product_id === productId
      )
      .reduce(
        (total, usage) =>
          total + Number(usage.quantity_base || 0),
        0
      );
  };

  // ============================================================
  // CALCULATIONS
  // ============================================================

  const calculations = useMemo(() => {
    const map: Record<string, Calculation> = {};

    products.forEach((product) => {
      const input = physicalInputs[product.id];

      const physicalStock =
        typeof input === 'number'
          ? input
          : product.current_stock_base;

      const personalUse = getPersonalUseForProduct(product.id);

      const result = calculateOpnameOutput(
        product as any,
        product.current_stock_base,
        physicalStock,
        personalUse
      );

      map[product.id] = result;
    });

    return map;
  }, [products, physicalInputs, personalUsages]);

  // ============================================================
  // SUMMARY
  // ============================================================

  const summary = useMemo(() => {
    let omzet = 0;
    let modal = 0;
    let laba = 0;
    let terjual = 0;
    let personalUse = 0;
    let warning = false;

    products.forEach((product) => {
      const calc = calculations[product.id];

      if (!calc) return;

      omzet += calc.sellingAmount;
      modal += calc.costAmount;
      laba += calc.profitAmount;
      terjual += calc.calculatedSalesBase;
      personalUse += calc.personalUseBase;

      if (calc.isPhysicalHigherThanSystem) {
        warning = true;
      }
    });

    return {
      omzet,
      modal,
      laba,
      terjual,
      personalUse,
      warning,
    };
  }, [products, calculations]);

  // ============================================================
  // INPUT HANDLERS
  // ============================================================

  const handleInputChange = (
    productId: string,
    value: string
  ) => {
    if (value === '') {
      setPhysicalInputs((prev) => ({
        ...prev,
        [productId]: '',
      }));

      return;
    }

    const parsed = Number(value);

    setPhysicalInputs((prev) => ({
      ...prev,
      [productId]: Number.isFinite(parsed)
        ? Math.max(0, Math.floor(parsed))
        : 0,
    }));
  };

  const fillAllSystemStock = () => {
    const inputs: Record<string, number> = {};

    products.forEach((product) => {
      inputs[product.id] = product.current_stock_base;
    });

    setPhysicalInputs(inputs);
  };

  const fillZero = (productId: string) => {
    setPhysicalInputs((prev) => ({
      ...prev,
      [productId]: 0,
    }));
  };

  // ============================================================
  // SAVE REKAP
  // ============================================================

  const handleSaveOpname = async () => {
    if (!supabase || !isSupabaseConfigured) {
      alert('Supabase belum terkonfigurasi.');
      return;
    }

    if (products.length === 0) {
      alert('Belum ada produk yang aktif.');
      return;
    }

    if (existingOpname) {
      alert(
        `Rekap tanggal ${formatDateIndo(
          date
        )} sudah pernah disimpan.\n\nGunakan tanggal lain untuk membuat rekap baru.`
      );

      return;
    }

    if (summary.warning) {
      const proceed = confirm(
        'Ada stok fisik yang lebih besar daripada stok sistem.\n\nSebaiknya lakukan koreksi stok terlebih dahulu.\n\nTetap lanjutkan menyimpan rekap?'
      );

      if (!proceed) return;
    }

    try {
      setSaving(true);

      // --------------------------------------------------------
      // 1. Buat header daily_stock_opnames
      // --------------------------------------------------------

      const { data: opname, error: opnameError } = await supabase
        .from('daily_stock_opnames')
        .insert({
          date,
          status: 'COMPLETED',
          total_personal_cash: personalUsages
            .filter((u) => u.type === 'UANG_CASH')
            .reduce(
              (total, u) => total + Number(u.amount_cash || 0),
              0
            ),
        })
        .select()
        .single();

      if (opnameError) {
        throw new Error(
          `Gagal menyimpan header rekap: ${opnameError.message}`
        );
      }

      // --------------------------------------------------------
      // 2. Buat detail daily_stock_opname_items
      // --------------------------------------------------------

      const opnameItems = products.map((product) => {
        const calc = calculations[product.id];

        return {
          stock_opname_id: opname.id,
          product_id: product.id,
          system_stock_base: calc.systemStockBase,
          physical_stock_base: calc.physicalStockBase,
          difference_base: calc.differenceBase,
          personal_use_base: calc.personalUseBase,
          calculated_sales_base: calc.calculatedSalesBase,
          selling_amount: calc.sellingAmount,
          cost_amount: calc.costAmount,
          profit_amount: calc.profitAmount,
        };
      });

      const { error: itemsError } = await supabase
        .from('daily_stock_opname_items')
        .insert(opnameItems);

      if (itemsError) {
        // rollback header jika detail gagal
        await supabase
          .from('daily_stock_opnames')
          .delete()
          .eq('id', opname.id);

        throw new Error(
          `Gagal menyimpan detail rekap: ${itemsError.message}`
        );
      }

      // --------------------------------------------------------
      // 3. Catat penjualan ke stock_movements
      //
      // Penjualan dibuat negatif karena stok berkurang.
      // --------------------------------------------------------

      const salesMovements = products
        .filter((product) => {
          const calc = calculations[product.id];
          return calc && calc.calculatedSalesBase > 0;
        })
        .map((product) => {
          const calc = calculations[product.id];

          return {
            product_id: product.id,
            quantity_base: -Math.abs(
              calc.calculatedSalesBase
            ),
            movement_type: 'SALE',
            reference_id: opname.id,
            date,
            note: `Hasil Rekap Malam - Terjual ${calc.calculatedSalesBase} ${product.base_unit}`,
          };
        });

      if (salesMovements.length > 0) {
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert(salesMovements);

        if (movementError) {
          throw new Error(
            `Rekap tersimpan, tetapi stok penjualan gagal dicatat: ${movementError.message}`
          );
        }
      }

      // --------------------------------------------------------
      // 4. Refresh
      // --------------------------------------------------------

      alert(
        `✅ Rekap malam berhasil disimpan!\n\n` +
          `Omzet: ${formatRupiah(summary.omzet)}\n` +
          `Modal: ${formatRupiah(summary.modal)}\n` +
          `Laba: ${formatRupiah(summary.laba)}`
      );

      await loadData();
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          'Terjadi kesalahan saat menyimpan rekap malam.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // STOCK CORRECTION
  // ============================================================

  const openCorrection = (product: Product) => {
    const calc = calculations[product.id];

    const difference = Math.max(
      1,
      calc.physicalStockBase - calc.systemStockBase
    );

    setCorrectionProduct(product);
    setCorrectionQty(difference);
    setCorrectionReason(
      'Ditemukan stok fisik lebih banyak di toko'
    );
  };

  const handleSaveCorrection = async () => {
    if (!supabase || !correctionProduct) return;

    if (correctionQty <= 0) {
      alert('Jumlah koreksi harus lebih dari 0.');
      return;
    }

    if (!correctionReason.trim()) {
      alert('Alasan koreksi wajib diisi.');
      return;
    }

    try {
      setSavingCorrection(true);

      // --------------------------------------------------------
      // 1. Simpan stock_adjustments
      // --------------------------------------------------------

      const { data: adjustment, error: adjustmentError } =
        await supabase
          .from('stock_adjustments')
          .insert({
            product_id: correctionProduct.id,
            quantity_base: correctionQty,
            adjustment_type: 'INCREASE',
            reason: correctionReason.trim(),
            date,
          })
          .select()
          .single();

      if (adjustmentError) {
        throw new Error(
          `Gagal menyimpan koreksi: ${adjustmentError.message}`
        );
      }

      // --------------------------------------------------------
      // 2. Simpan movement koreksi
      // --------------------------------------------------------

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: correctionProduct.id,
          quantity_base: correctionQty,
          movement_type: 'ADJUSTMENT',
          reference_id: adjustment.id,
          date,
          note: `Koreksi stok: ${correctionReason.trim()}`,
        });

      if (movementError) {
        throw new Error(
          `Koreksi tersimpan, tetapi movement gagal: ${movementError.message}`
        );
      }

      alert(
        `✅ Koreksi stok ${correctionProduct.name} berhasil ditambahkan sebanyak ${correctionQty} ${correctionProduct.base_unit}.`
      );

      setCorrectionProduct(null);

      await loadData();
    } catch (error: any) {
      console.error(error);

      alert(
        error?.message ||
          'Gagal menyimpan koreksi stok.'
      );
    } finally {
      setSavingCorrection(false);
    }
  };

  // ============================================================
  // FORMAT STOCK
  // ============================================================

  const formatStock = (product: Product, stock: number) => {
    if (!product.units || product.units.length === 0) {
      return `${stock} ${product.base_unit}`;
    }

    const units = [...product.units]
      .filter((u) => u.conversion_to_base > 1)
      .sort(
        (a, b) =>
          b.conversion_to_base - a.conversion_to_base
      );

    let remaining = Math.max(0, Math.floor(stock));

    const parts: string[] = [];

    for (const unit of units) {
      const count = Math.floor(
        remaining / unit.conversion_to_base
      );

      if (count > 0) {
        parts.push(`${count} ${unit.unit_name}`);
        remaining =
          remaining % unit.conversion_to_base;
      }
    }

    if (remaining > 0 || parts.length === 0) {
      parts.push(`${remaining} ${product.base_unit}`);
    }

    return parts.join(' + ');
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">
            Mengambil data dari Supabase...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">

          <div>
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs mb-2 uppercase tracking-wider">
              <Moon className="w-4 h-4" />
              Rekap Stok Harian
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold">
              Rekap Stok Malam Hari
            </h1>

            <p className="text-emerald-100/80 text-sm mt-2 max-w-2xl">
              Masukkan jumlah fisik barang yang tersisa.
              Sistem otomatis menghitung barang terjual,
              omzet, modal, dan laba.
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-xl p-3 shrink-0">
            <label className="text-xs text-emerald-200 font-semibold flex items-center gap-1 mb-2">
              <Calendar className="w-3.5 h-3.5" />
              Tanggal Rekap
            </label>

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(e.target.value)
              }
              className="bg-white text-gray-900 font-bold px-3 py-2 rounded-lg text-sm"
            />
          </div>

        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

        <div className="bg-white border rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase">
            Omzet
          </p>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">
            {formatRupiah(summary.omzet)}
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase">
            Modal
          </p>
          <p className="text-xl font-extrabold text-orange-600 mt-1">
            {formatRupiah(summary.modal)}
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase">
            Laba
          </p>
          <p className="text-xl font-extrabold text-blue-700 mt-1">
            {formatRupiah(summary.laba)}
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase">
            Terjual
          </p>
          <p className="text-xl font-extrabold text-indigo-700 mt-1">
            {summary.terjual} item
          </p>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase">
            Status
          </p>

          {existingOpname ? (
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sudah Rekap
            </div>
          ) : (
            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              Belum Rekap
            </div>
          )}
        </div>

      </div>

      {/* CONTROLS */}
      <div className="bg-white border rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              type="text"
              placeholder="Cari nama produk..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value)
            }
            className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white font-medium"
          >
            <option value="ALL">
              Semua Kategori
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>

          <button
            onClick={fillAllSystemStock}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Isi Stok Sistem
          </button>

          <button
            onClick={handleSaveOpname}
            disabled={saving || Boolean(existingOpname)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan Rekap
              </>
            )}
          </button>

        </div>
      </div>

      {/* INFO */}
      {existingOpname && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />

            <div>
              <p className="font-bold">
                Rekap tanggal ini sudah tersimpan.
              </p>

              <p className="mt-1">
                Supaya stok penjualan tidak tercatat
                dua kali, rekap yang sudah selesai
                tidak dapat disimpan ulang.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT LIST */}
      <div className="space-y-3">

        {filteredProducts.length === 0 ? (
          <div className="bg-white border rounded-2xl p-10 text-center">
            <p className="text-gray-500">
              Produk tidak ditemukan.
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const calc = calculations[product.id];

            const physical =
              physicalInputs[product.id];

            const image =
              product.image_url;

            return (
              <div
                key={product.id}
                className={`bg-white border rounded-2xl p-4 transition ${
                  calc.isPhysicalHigherThanSystem
                    ? 'border-amber-300 bg-amber-50/30'
                    : calc.calculatedSalesBase > 0
                    ? 'border-emerald-200'
                    : ''
                }`}
              >

                <div className="flex flex-col xl:flex-row xl:items-center gap-4">

                  {/* PRODUCT */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">

                    {image ? (
                      <img
                        src={image}
                        alt={product.name}
                        className="w-12 h-12 rounded-xl object-cover border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                        {product.name.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">
                        {product.name}
                      </h3>

                      <p className="text-xs text-gray-500 mt-1">
                        Stok sistem:
                        <span className="font-bold text-gray-800 ml-1">
                          {formatStock(
                            product,
                            product.current_stock_base
                          )}
                        </span>
                      </p>

                      {calc.personalUseBase > 0 && (
                        <p className="text-xs text-purple-700 font-semibold mt-1">
                          Pemakaian pribadi:{' '}
                          {calc.personalUseBase}{' '}
                          {product.base_unit}
                        </p>
                      )}
                    </div>

                  </div>

                  {/* PHYSICAL INPUT */}
                  <div className="bg-gray-50 border rounded-xl p-3">

                    <p className="text-xs font-bold text-gray-600 mb-2">
                      Sisa Fisik Malam
                    </p>

                    <div className="flex items-center gap-2">

                      <input
                        type="number"
                        min={0}
                        value={physical}
                        disabled={Boolean(existingOpname)}
                        onChange={(e) =>
                          handleInputChange(
                            product.id,
                            e.target.value
                          )
                        }
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-extrabold text-emerald-800 disabled:bg-gray-100"
                      />

                      <span className="text-sm font-semibold text-gray-500">
                        {product.base_unit}
                      </span>

                      {!existingOpname && (
                        <button
                          onClick={() =>
                            fillZero(product.id)
                          }
                          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          Habis
                        </button>
                      )}

                    </div>

                    <p className="text-xs text-gray-400 mt-2">
                      ={' '}
                      {formatStock(
                        product,
                        typeof physical === 'number'
                          ? physical
                          : product.current_stock_base
                      )}
                    </p>

                  </div>

                  {/* RESULT */}
                  <div className="xl:w-[330px]">

                    <div className="grid grid-cols-3 gap-2">

                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">
                          Keluar
                        </p>

                        <p className="font-bold text-gray-800">
                          {Math.max(
                            0,
                            calc.differenceBase
                          )}{' '}
                          {product.base_unit}
                        </p>
                      </div>

                      <div className="bg-emerald-50 rounded-lg p-2">
                        <p className="text-[10px] text-emerald-600 uppercase font-bold">
                          Terjual
                        </p>

                        <p className="font-bold text-emerald-700">
                          {calc.calculatedSalesBase}{' '}
                          {product.base_unit}
                        </p>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-[10px] text-blue-600 uppercase font-bold">
                          Laba
                        </p>

                        <p className="font-bold text-blue-700 text-sm">
                          {formatRupiah(
                            calc.profitAmount
                          )}
                        </p>
                      </div>

                    </div>

                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-gray-500">
                        Omzet
                      </span>

                      <span className="font-bold text-emerald-700">
                        {formatRupiah(
                          calc.sellingAmount
                        )}
                      </span>
                    </div>

                  </div>

                </div>

                {/* WARNING */}
                {calc.isPhysicalHigherThanSystem && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-100 border border-amber-300">

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

                      <div className="flex items-start gap-2 text-sm text-amber-900">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />

                        <div>
                          <p className="font-bold">
                            Stok fisik lebih banyak
                            daripada stok sistem.
                          </p>

                          <p className="mt-1">
                            {calc.warningMessage}
                          </p>
                        </div>
                      </div>

                      {!existingOpname && (
                        <button
                          onClick={() =>
                            openCorrection(product)
                          }
                          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs whitespace-nowrap"
                        >
                          + Koreksi Stok
                        </button>
                      )}

                    </div>

                  </div>
                )}

              </div>
            );
          })
        )}

      </div>

      {/* CORRECTION MODAL */}
      {correctionProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">

          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-extrabold text-lg">
                  Koreksi Stok
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  {correctionProduct.name}
                </p>
              </div>

              <button
                onClick={() =>
                  setCorrectionProduct(null)
                }
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Jumlah Koreksi
                </label>

                <div className="flex items-center gap-2 mt-2">

                  <input
                    type="number"
                    min={1}
                    value={correctionQty}
                    onChange={(e) =>
                      setCorrectionQty(
                        Math.max(
                          1,
                          Number(e.target.value) || 1
                        )
                      )
                    }
                    className="w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">
                    {correctionProduct.base_unit}
                  </span>

                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Alasan
                </label>

                <textarea
                  value={correctionReason}
                  onChange={(e) =>
                    setCorrectionReason(
                      e.target.value
                    )
                  }
                  rows={3}
                  className="w-full mt-2 px-3 py-2.5 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

            </div>

            <div className="p-5 border-t flex justify-end gap-2">

              <button
                onClick={() =>
                  setCorrectionProduct(null)
                }
                disabled={savingCorrection}
                className="px-4 py-2.5 border rounded-xl font-semibold"
              >
                Batal
              </button>

              <button
                onClick={handleSaveCorrection}
                disabled={savingCorrection}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-2"
              >
                {savingCorrection ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Simpan Koreksi
                  </>
                )}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}